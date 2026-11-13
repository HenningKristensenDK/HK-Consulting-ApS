//! Klik: capture core.
//!
//! Flow: hotkey -> capture the monitor under the cursor -> the overlay window
//! covers that monitor and shows the frozen image -> user selects and draws ->
//! Esc sends the finished PNG back here -> saved to Pictures\Klik and put on
//! the clipboard.

use std::path::PathBuf;
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

fn open_folder(app: &AppHandle) {
    if let Ok(dir) = output_dir(app) {
        #[cfg(windows)]
        let _ = std::process::Command::new("explorer").arg(dir).spawn();
        #[cfg(not(windows))]
        let _ = std::process::Command::new("xdg-open").arg(dir).spawn();
    }
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let shot = MenuItem::with_id(app, "shot", "Tag screenshot   (PrtScn)", true, None::<&str>)?;
    let folder = MenuItem::with_id(app, "folder", "Åbn mappe", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Afslut Klik", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&shot, &folder, &sep, &quit])?;

    TrayIconBuilder::with_id("klik")
        .icon(app.default_window_icon().cloned().expect("app icon"))
        .tooltip("Klik  -  PrtScn eller Ctrl+Shift+X")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, e| match e.id.as_ref() {
            "shot" => capture_async(app),
            "folder" => open_folder(app),
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
    let print_screen = Shortcut::new(None, Code::PrintScreen);
    let fallback = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyX);

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
        .invoke_handler(tauri::generate_handler![get_shot, show_overlay, cancel, finish])
        .setup(move |app| {
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            // Register each key on its own: if Windows already owns PrtScn
            // (Settings > Accessibility > Keyboard), Ctrl+Shift+X still works.
            for s in [print_screen, fallback] {
                if let Err(e) = app.global_shortcut().register(s) {
                    eprintln!("klik: could not register {s:?}: {e}");
                }
            }
            setup_tray(app.handle())?;
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
