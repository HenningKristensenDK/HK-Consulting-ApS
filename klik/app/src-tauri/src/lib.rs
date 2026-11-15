//! Klik: capture core.
//!
//! Flow: hotkey -> capture the monitor under the cursor -> the overlay window
//! covers that monitor and shows the frozen image -> user selects and draws ->
//! Esc sends the finished PNG back here -> saved to Pictures\Klik and put on
//! the clipboard.

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::ipc::{InvokeBody, Request, Response};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

const OVERLAY: &str = "overlay";

/// The last captured monitor image: (width, height, RGBA bytes).
#[derive(Default)]
struct Shot(Mutex<Option<(u32, u32, Vec<u8>)>>);

/// The hotkey Klik got, shown in the tray menu and the overlay hint.
#[derive(Default)]
struct Hotkey(Mutex<Option<String>>);

/// Opening Klik takes a screenshot. The first launch has to wait until the
/// overlay page is loaded, so the request is parked here until `frontend_ready`.
static CAPTURE_ON_READY: AtomicBool = AtomicBool::new(false);

/// Hotkeys to try, in order. The first one no other program owns wins.
/// PrtScn is left alone on purpose: Snagit and Windows' Snipping Tool use it.
fn hotkey_candidates() -> Vec<(Shortcut, &'static str)> {
    vec![
        (Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyK), "Ctrl+Alt+K"),
        (Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyK), "Ctrl+Shift+K"),
        (Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyS), "Ctrl+Alt+S"),
        (Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyX), "Ctrl+Shift+X"),
    ]
}

fn overlay(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window(OVERLAY)
}

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

/// Capture the monitor under the cursor and hand it to the overlay.
fn capture(app: &AppHandle) -> Result<(), String> {
    let win = overlay(app).ok_or("overlay window missing")?;
    if win.is_visible().unwrap_or(false) {
        return Ok(()); // already capturing
    }
    let cursor = app.cursor_position().map_err(err)?;
    let mon = xcap::Monitor::from_point(cursor.x as i32, cursor.y as i32).map_err(err)?;
    let img = mon.capture_image().map_err(err)?;
    let (w, h) = (img.width(), img.height());
    let (x, y) = (mon.x().map_err(err)?, mon.y().map_err(err)?);

    *app.state::<Shot>().0.lock().unwrap() = Some((w, h, img.into_raw()));

    win.set_position(PhysicalPosition::new(x, y)).map_err(err)?;
    win.set_size(PhysicalSize::new(w, h)).map_err(err)?;
    // The overlay pulls the image with `get_shot`, draws it, then calls
    // `show_overlay`, so the old frame never flashes.
    win.emit("captured", ()).map_err(err)?;
    Ok(())
}

fn capture_async(app: &AppHandle) {
    let app = app.clone();
    std::thread::spawn(move || {
        if let Err(e) = capture(&app) {
            eprintln!("klik: capture failed: {e}");
        }
    });
}

/// Image bytes for the overlay: 8-byte header (width, height as u32 LE) + RGBA.
#[tauri::command]
fn get_shot(shot: tauri::State<'_, Shot>) -> Result<Response, String> {
    let guard = shot.0.lock().unwrap();
    let (w, h, rgba) = guard.as_ref().ok_or("no capture")?;
    let mut out = Vec::with_capacity(8 + rgba.len());
    out.extend_from_slice(&w.to_le_bytes());
    out.extend_from_slice(&h.to_le_bytes());
    out.extend_from_slice(rgba);
    Ok(Response::new(out))
}

/// Called by the overlay page once it listens for captures.
#[tauri::command]
fn frontend_ready(app: AppHandle) {
    if CAPTURE_ON_READY.swap(false, Ordering::SeqCst) {
        capture_async(&app);
    }
}

#[tauri::command]
fn hotkey_label(hotkey: tauri::State<'_, Hotkey>) -> Option<String> {
    hotkey.0.lock().unwrap().clone()
}

#[tauri::command]
fn show_overlay(window: WebviewWindow) -> Result<(), String> {
    window.show().map_err(err)?;
    window.set_always_on_top(true).map_err(err)?;
    window.set_focus().map_err(err)?;
    Ok(())
}

#[tauri::command]
fn cancel(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    window.hide().map_err(err)?;
    app.state::<Shot>().0.lock().unwrap().take();
    Ok(())
}

fn output_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().picture_dir().map_err(err)?.join("Klik");
    std::fs::create_dir_all(&dir).map_err(err)?;
    Ok(dir)
}

/// Receives the finished PNG (raw body), saves it and copies it to the clipboard.
/// Returns the saved file path.
#[tauri::command]
fn finish(app: AppHandle, window: WebviewWindow, request: Request<'_>) -> Result<String, String> {
    window.hide().map_err(err)?;
    app.state::<Shot>().0.lock().unwrap().take();

    let InvokeBody::Raw(png) = request.body() else {
        return Err("expected PNG bytes".into());
    };

    let name = chrono::Local::now().format("Klik %Y-%m-%d %H%M%S.png").to_string();
    let path = output_dir(&app)?.join(name);
    std::fs::write(&path, png).map_err(err)?;

    let rgba = image::load_from_memory(png).map_err(err)?.to_rgba8();
    let mut cb = arboard::Clipboard::new().map_err(err)?;
    cb.set_image(arboard::ImageData {
        width: rgba.width() as usize,
        height: rgba.height() as usize,
        bytes: rgba.into_raw().into(),
    })
    .map_err(err)?;

    Ok(path.to_string_lossy().into_owned())
}

/// The handoff inbox shared with Claude through klik-mcp (same default path).
fn inbox_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = match std::env::var("KLIK_INBOX_DIR") {
        Ok(v) if !v.trim().is_empty() => PathBuf::from(v.trim()),
        _ => app.path().document_dir().map_err(err)?.join("Klik").join("Inbox"),
    };
    std::fs::create_dir_all(&dir).map_err(err)?;
    Ok(dir)
}

fn open_dir(dir: Result<PathBuf, String>) {
    if let Ok(dir) = dir {
        #[cfg(windows)]
        let _ = std::process::Command::new("explorer").arg(dir).spawn();
        #[cfg(not(windows))]
        let _ = std::process::Command::new("xdg-open").arg(dir).spawn();
    }
}

fn setup_tray(app: &AppHandle, hotkey: Option<&str>) -> tauri::Result<()> {
    let shot_label = match hotkey {
        Some(k) => format!("Tag screenshot   ({k})"),
        None => "Tag screenshot".to_string(),
    };
    let key_label = match hotkey {
        Some(k) => format!("Genvejstast: {k}"),
        None => "Ingen ledig genvejstast. Klik på ikonet i stedet".to_string(),
    };
    let shot = MenuItem::with_id(app, "shot", shot_label, true, None::<&str>)?;
    let key = MenuItem::with_id(app, "key", key_label, false, None::<&str>)?;
    let folder = MenuItem::with_id(app, "folder", "Åbn screenshots", true, None::<&str>)?;
    let inbox = MenuItem::with_id(app, "inbox", "Åbn indbakke (Claude)", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Afslut Klik", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&shot, &key, &folder, &inbox, &sep, &quit])?;
    let tooltip = match hotkey {
        Some(k) => format!("Klik  -  klik her eller tryk {k}"),
        None => "Klik  -  klik her for screenshot".to_string(),
    };

    TrayIconBuilder::with_id("klik")
        .icon(app.default_window_icon().cloned().expect("app icon"))
        .tooltip(tooltip)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, e| match e.id.as_ref() {
            "shot" => capture_async(app),
            "folder" => open_dir(output_dir(app)),
            "inbox" => open_dir(inbox_dir(app)),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, e| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = e
            {
                capture_async(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Started at login (later: autostart) should stay quiet. Started by the
    // user from the Start menu or a shortcut should take a screenshot.
    let background = std::env::args().any(|a| a == "--background");
    CAPTURE_ON_READY.store(!background, Ordering::SeqCst);

    tauri::Builder::default()
        // A second launch just triggers a capture in the running instance.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            capture_async(app);
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        capture_async(app);
                    }
                })
                .build(),
        )
        .manage(Shot::default())
        .manage(Hotkey::default())
        .invoke_handler(tauri::generate_handler![
            get_shot,
            show_overlay,
            cancel,
            finish,
            frontend_ready,
            hotkey_label
        ])
        .setup(move |app| {
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            // Take the first hotkey that no other program (e.g. Snagit) owns.
            let mut got = None;
            for (s, label) in hotkey_candidates() {
                match app.global_shortcut().register(s) {
                    Ok(()) => {
                        got = Some(label);
                        break;
                    }
                    Err(e) => eprintln!("klik: {label} is taken: {e}"),
                }
            }
            *app.state::<Hotkey>().0.lock().unwrap() = got.map(String::from);
            setup_tray(app.handle(), got)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Never close the overlay; hide it so the tray app keeps running.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Klik");
}
