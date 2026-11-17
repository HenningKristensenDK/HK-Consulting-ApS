//! Klik's files on disk: screenshots and the handoff inbox.
//!
//! Everything is plain files so people and other tools can read them too:
//! - captures: `Pictures\Klik\*.png` (written by the Klik app)
//! - inbox:    `Documents\Klik\Inbox\*.md` (+ an optional image per handoff)

use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use base64::Engine;
use chrono::{DateTime, Local};

pub type Res<T> = Result<T, String>;

const IMAGE_EXT: &[&str] = &["png", "jpg", "jpeg"];
/// Keep images comfortably under the model's per-image limits.
const MAX_BYTES: usize = 3_500_000;

pub struct Store {
    pub captures: PathBuf,
    pub inbox: PathBuf,
}

#[derive(Debug, Clone)]
pub struct Entry {
    pub id: String,
    pub path: PathBuf,
    pub modified: DateTime<Local>,
    pub bytes: u64,
}

#[derive(Debug, Clone)]
pub struct Handoff {
    pub id: String,
    pub title: String,
    pub created: String,
    pub source: Option<String>,
    pub image: Option<String>,
    pub body: String,
}

pub struct ClaudeImage {
    pub base64: String,
    pub mime: &'static str,
    pub width: u32,
    pub height: u32,
    pub orig_width: u32,
    pub orig_height: u32,
}

/// An env var counts only if it is set to a real value. Claude Desktop passes
/// the literal `${user_config.x}` text when an optional setting is empty.
fn env_dir(key: &str) -> Option<PathBuf> {
    let v = std::env::var(key).ok()?;
    let v = v.trim();
    (!v.is_empty() && !v.starts_with("${")).then(|| PathBuf::from(v))
}

impl Store {
    pub fn from_env() -> Self {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let captures = env_dir("KLIK_CAPTURES_DIR").unwrap_or_else(|| {
            dirs::picture_dir().unwrap_or_else(|| home.join("Pictures")).join("Klik")
        });
        let inbox = env_dir("KLIK_INBOX_DIR").unwrap_or_else(|| {
            dirs::document_dir().unwrap_or_else(|| home.join("Documents")).join("Klik").join("Inbox")
        });
        Store { captures, inbox }
    }

    // ---------- captures ----------

    pub fn captures(&self, limit: usize) -> Vec<Entry> {
        let mut v = list(&self.captures, IMAGE_EXT);
        v.truncate(limit);
        v
    }

    pub fn latest_capture(&self) -> Res<Entry> {
        self.captures(1).into_iter().next().ok_or_else(|| {
            format!("No captures yet in {}. Take one with PrtScn in Klik.", self.captures.display())
        })
    }

    pub fn capture(&self, id: &str) -> Res<Entry> {
        let path = safe_join(&self.captures, id)?;
        entry(&path).ok_or_else(|| format!("No capture named '{id}'. Use klik_list_captures to see the names."))
    }

    // ---------- inbox ----------

    pub fn handoff_write(&self, title: &str, text: &str, source: Option<&str>, attach: Option<&Path>) -> Res<String> {
        let title = title.trim();
        if title.is_empty() {
            return Err("title is empty".into());
        }
        fs::create_dir_all(&self.inbox).map_err(|e| format!("cannot create inbox: {e}"))?;
        let now = Local::now();
        let mut stem = format!("{} - {}", now.format("%Y-%m-%d %H%M%S"), slug(title));
        // Never overwrite: two handoffs in the same second get a suffix.
        let mut n = 2;
        while self.inbox.join(format!("{stem}.md")).exists() {
            stem = format!("{} - {} ({n})", now.format("%Y-%m-%d %H%M%S"), slug(title));
            n += 1;
        }

        let image = match attach {
            Some(src) => {
                let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("png").to_lowercase();
                let name = format!("{stem}.{ext}");
                fs::copy(src, self.inbox.join(&name)).map_err(|e| format!("cannot copy image: {e}"))?;
                Some(name)
            }
            None => None,
        };

        let mut md = String::from("---\n");
        md += &format!("title: {}\n", one_line(title));
        md += &format!("created: {}\n", now.format("%Y-%m-%dT%H:%M:%S%:z"));
        if let Some(s) = source.map(str::trim).filter(|s| !s.is_empty()) {
            md += &format!("source: {}\n", one_line(s));
        }
        if let Some(i) = &image {
            md += &format!("image: {i}\n");
        }
        md += "---\n\n";
        md += text.trim_end();
        md += "\n";
        if let Some(i) = &image {
            md += &format!("\n![{}]({})\n", one_line(title), i.replace(' ', "%20"));
        }

        let id = format!("{stem}.md");
        fs::write(self.inbox.join(&id), md).map_err(|e| format!("cannot write handoff: {e}"))?;
        Ok(id)
    }

    pub fn handoffs(&self, limit: usize) -> Vec<Handoff> {
        let mut v: Vec<Handoff> = list(&self.inbox, &["md"]).iter().filter_map(|e| read_handoff(&e.path)).collect();
        // File names start with the timestamp, so name order is creation order.
        v.sort_by(|a, b| b.id.cmp(&a.id));
        v.truncate(limit);
        v
    }

    /// `id` = file name, or None / "latest" for the newest handoff.
    pub fn handoff(&self, id: Option<&str>) -> Res<(Handoff, Option<PathBuf>)> {
        let h = match id.map(str::trim).filter(|s| !s.is_empty() && *s != "latest") {
            Some(id) => {
                let path = safe_join(&self.inbox, id)?;
                read_handoff(&path).ok_or_else(|| format!("No handoff named '{id}'. Use handoff_list to see the names."))?
            }
            None => self
                .handoffs(1)
                .into_iter()
                .next()
                .ok_or_else(|| format!("The inbox is empty ({}).", self.inbox.display()))?,
        };
        let img = h.image.as_deref().and_then(|i| safe_join(&self.inbox, i).ok()).filter(|p| p.is_file());
        Ok((h, img))
    }
}

/// Load an image and shrink it so its longest side is at most `max_side`.
pub fn image_for_claude(path: &Path, max_side: u32) -> Res<ClaudeImage> {
    let img = image::open(path).map_err(|e| format!("cannot read image: {e}"))?;
    let (ow, oh) = (img.width(), img.height());
    let img = if ow.max(oh) > max_side {
        img.resize(max_side, max_side, image::imageops::FilterType::Triangle)
    } else {
        img
    };
    let (w, h) = (img.width(), img.height());

    let mut buf = Vec::new();
    img.write_to(&mut Cursor::new(&mut buf), image::ImageFormat::Png).map_err(|e| e.to_string())?;
    let mut mime = "image/png";
    if buf.len() > MAX_BYTES {
        // Photos and busy screens compress far better as JPEG.
        buf.clear();
        img.to_rgb8()
            .write_to(&mut Cursor::new(&mut buf), image::ImageFormat::Jpeg)
            .map_err(|e| e.to_string())?;
        mime = "image/jpeg";
    }
    Ok(ClaudeImage {
        base64: base64::engine::general_purpose::STANDARD.encode(&buf),
        mime,
        width: w,
        height: h,
        orig_width: ow,
        orig_height: oh,
    })
}

// ---------- helpers ----------

fn entry(path: &Path) -> Option<Entry> {
    let meta = fs::metadata(path).ok().filter(|m| m.is_file())?;
    let modified: DateTime<Local> = meta.modified().unwrap_or(SystemTime::UNIX_EPOCH).into();
    Some(Entry {
        id: path.file_name()?.to_string_lossy().into_owned(),
        path: path.to_path_buf(),
        modified,
        bytes: meta.len(),
    })
}

/// Files in `dir` with one of `exts`, newest first.
fn list(dir: &Path, exts: &[&str]) -> Vec<Entry> {
    let Ok(rd) = fs::read_dir(dir) else { return vec![] };
    let mut v: Vec<Entry> = rd
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.extension()
                .and_then(|e| e.to_str())
                .is_some_and(|e| exts.contains(&e.to_lowercase().as_str()))
        })
        .filter_map(|p| entry(&p))
        .collect();
    v.sort_by(|a, b| b.modified.cmp(&a.modified).then_with(|| b.id.cmp(&a.id)));
    v
}

/// Join a file name onto `dir`, refusing anything that could leave `dir`.
fn safe_join(dir: &Path, name: &str) -> Res<PathBuf> {
    let name = name.trim();
    let bad = name.is_empty()
        || name.contains(['/', '\\', ':'])
        || name == "."
        || name == ".."
        || name.starts_with('.');
    if bad {
        return Err(format!("'{name}' is not a valid file name"));
    }
    Ok(dir.join(name))
}

fn read_handoff(path: &Path) -> Option<Handoff> {
    let raw = fs::read_to_string(path).ok()?;
    let id = path.file_name()?.to_string_lossy().into_owned();
    let (mut title, mut created, mut source, mut image) = (None, None, None, None);
    let body = match raw.strip_prefix("---\n").or_else(|| raw.strip_prefix("---\r\n")) {
        Some(rest) => match rest.find("\n---") {
            Some(end) => {
                for line in rest[..end].lines() {
                    if let Some((k, v)) = line.split_once(':') {
                        let v = v.trim().to_string();
                        match k.trim() {
                            "title" => title = Some(v),
                            "created" => created = Some(v),
                            "source" => source = Some(v),
                            "image" => image = Some(v),
                            _ => {}
                        }
                    }
                }
                rest[end + 4..].trim_start_matches(['\r', '\n']).to_string()
            }
            None => raw.clone(),
        },
        None => raw.clone(),
    };
    let fallback_title = path.file_stem()?.to_string_lossy().into_owned();
    let created = created.unwrap_or_else(|| entry(path).map(|e| e.modified.to_rfc3339()).unwrap_or_default());
    Some(Handoff { id, title: title.unwrap_or(fallback_title), created, source, image, body })
}

fn one_line(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// File-name friendly title: letters (incl. æøå), digits and dashes, max 50 chars.
fn slug(title: &str) -> String {
    let mut out = String::new();
    for c in title.chars() {
        if c.is_alphanumeric() {
            out.extend(c.to_lowercase());
        } else if !out.ends_with('-') && !out.is_empty() {
            out.push('-');
        }
    }
    let s: String = out.trim_end_matches('-').chars().take(50).collect();
    let s = s.trim_end_matches('-').to_string();
    if s.is_empty() { "handoff".into() } else { s }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn store() -> (tempfile::TempDir, Store) {
        let t = tempfile::tempdir().unwrap();
        let s = Store { captures: t.path().join("caps"), inbox: t.path().join("inbox") };
        fs::create_dir_all(&s.captures).unwrap();
        (t, s)
    }

    fn png(path: &Path, w: u32, h: u32) {
        image::RgbaImage::from_pixel(w, h, image::Rgba([200, 30, 30, 255])).save(path).unwrap();
    }

    #[test]
    fn latest_capture_is_newest() {
        let (_t, s) = store();
        png(&s.captures.join("Klik 2026-11-15 100000.png"), 10, 10);
        std::thread::sleep(std::time::Duration::from_millis(20));
        png(&s.captures.join("Klik 2026-11-15 110000.png"), 10, 10);
        fs::write(s.captures.join("notes.txt"), "x").unwrap();
        assert_eq!(s.latest_capture().unwrap().id, "Klik 2026-11-15 110000.png");
        assert_eq!(s.captures(10).len(), 2);
    }

    #[test]
    fn rejects_path_escape() {
        let (_t, s) = store();
        for bad in ["../secret.png", "..\\x.png", "C:\\x.png", "..", ".hidden", ""] {
            assert!(s.capture(bad).is_err(), "{bad}");
        }
    }

    #[test]
    fn image_is_downscaled() {
        let (_t, s) = store();
        let p = s.captures.join("big.png");
        png(&p, 4000, 2000);
        let img = image_for_claude(&p, 1600).unwrap();
        assert_eq!((img.width, img.height), (1600, 800));
        assert_eq!((img.orig_width, img.orig_height), (4000, 2000));
    }

    #[test]
    fn handoff_roundtrip_with_image() {
        let (_t, s) = store();
        let cap = s.captures.join("Klik 1.png");
        png(&cap, 20, 10);
        let id = s.handoff_write("Næste skridt: MCP / test", "## Done\n- spec\n", Some("Claude Desktop"), Some(&cap)).unwrap();
        assert!(id.ends_with(" - næste-skridt-mcp-test.md"), "{id}");

        let (h, img) = s.handoff(None).unwrap();
        assert_eq!(h.id, id);
        assert_eq!(h.title, "Næste skridt: MCP / test");
        assert_eq!(h.source.as_deref(), Some("Claude Desktop"));
        assert!(h.body.starts_with("## Done"));
        assert!(img.unwrap().is_file());
        assert_eq!(s.handoff(Some(&id)).unwrap().0.id, id);
    }

    #[test]
    fn handoffs_never_overwrite() {
        let (_t, s) = store();
        let a = s.handoff_write("Same", "a", None, None).unwrap();
        let b = s.handoff_write("Same", "b", None, None).unwrap();
        assert_ne!(a, b);
        assert_eq!(s.handoffs(10).len(), 2);
    }

    #[test]
    fn plain_markdown_without_frontmatter_is_readable() {
        let (_t, s) = store();
        fs::create_dir_all(&s.inbox).unwrap();
        fs::write(s.inbox.join("2026-01-01 noter.md"), "Bare tekst").unwrap();
        let (h, _) = s.handoff(None).unwrap();
        assert_eq!(h.title, "2026-01-01 noter");
        assert_eq!(h.body, "Bare tekst");
    }
}
