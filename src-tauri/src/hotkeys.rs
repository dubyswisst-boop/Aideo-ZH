use tauri::AppHandle;
use tauri::Emitter;

// P0.1D diagnostics: best-effort log. Never alters registration decisions.
fn hud_diag(message: &str) {
    use std::io::Write;
    let path = std::env::temp_dir().join("Aideo-HUD-P01D.log");
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
    if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{} {}", now, message);
    }
}
use tauri_plugin_global_shortcut::GlobalShortcutExt;

/// Player actions that can be bound to a global shortcut.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HotkeyAction {
    PlayPause,
    Next,
    Prev,
    ToggleDesktopLyrics,
    ToggleDesktopLyricsLock,
    ToggleTheaterLock,
}

impl HotkeyAction {
    pub fn from_id(id: &str) -> Option<Self> {
        match id {
            "playPause" => Some(HotkeyAction::PlayPause),
            "next" => Some(HotkeyAction::Next),
            "prev" => Some(HotkeyAction::Prev),
            "toggleDesktopLyrics" => Some(HotkeyAction::ToggleDesktopLyrics),
            "toggleDesktopLyricsLock" => Some(HotkeyAction::ToggleDesktopLyricsLock),
            "toggleTheaterLock" => Some(HotkeyAction::ToggleTheaterLock),
            _ => None,
        }
    }

    pub fn event_name(&self) -> &'static str {
        match self {
            // Event names must match what App.tsx setupListeners listens for,
            // so all shuffle/queue/scrobble logic stays in the frontend.
            HotkeyAction::PlayPause => "media-toggle",
            HotkeyAction::Next => "media-next",
            HotkeyAction::Prev => "media-prev",
            HotkeyAction::ToggleDesktopLyrics => "toggle-desktop-lyrics",
            HotkeyAction::ToggleDesktopLyricsLock => "toggle-desktop-lyrics-lock",
            HotkeyAction::ToggleTheaterLock => "toggle-theater-lock",
        }
    }
}

/// Registers (or re-registers) a set of global shortcuts.
/// `bindings` maps action id -> accelerator string (e.g. "Ctrl+Alt+Right").
/// Empty bindings unregister the action.
fn register_bindings(app: &AppHandle, bindings: &[(String, Option<String>)]) -> Result<(), String> {
    let gs = app.global_shortcut();
    for (action_id, accelerator) in bindings {
        let Some(accel) = accelerator.as_deref().map(str::trim).filter(|v| !v.is_empty()) else {
            continue;
        };
        let action = HotkeyAction::from_id(action_id)
            .ok_or_else(|| format!("Unknown hotkey action: {}", action_id))?;
        hud_diag(&format!("REGISTER_ATTEMPT action={} accel={}", action_id, accel));
        gs.on_shortcut(accel, move |handle, _shortcut, event| {
            if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                if action == HotkeyAction::ToggleTheaterLock { hud_diag("KEY_PRESSED toggleTheaterLock"); }
                let emitted = handle.emit(action.event_name(), ());
                if action == HotkeyAction::ToggleTheaterLock {
                    hud_diag(if emitted.is_ok() { "EVENT_EMITTED toggle-theater-lock" } else { "EVENT_EMIT_FAILED toggle-theater-lock" });
                }
            }
        }).map_err(|e| {
            hud_diag(&format!("REGISTER_FAILED action={} accel={} error={}", action_id, accel, e));
            format!("Failed to register '{}' for {}: {}", accel, action_id, e)
        })?;
        hud_diag(&format!("REGISTER_SUCCESS action={} accel={}", action_id, accel));
    }
    Ok(())
}

fn validate_bindings(bindings: &[(String, Option<String>)]) -> Result<(), String> {
    let mut registered = std::collections::HashMap::<String, String>::new();
    for (action, value) in bindings {
        let Some(accel) = value.as_deref().map(str::trim).filter(|v| !v.is_empty()) else { continue; };
        HotkeyAction::from_id(action).ok_or_else(|| format!("Unknown hotkey action: {}", action))?;
        let normalized = accel.to_ascii_lowercase().replace(' ', "");
        if let Some(existing) = registered.insert(normalized, action.clone()) {
            return Err(format!("Shortcut conflict: {} and {} both use {}", existing, action, accel));
        }
    }
    Ok(())
}

pub fn apply_shortcuts(app: &AppHandle, bindings: &[(String, Option<String>)]) -> Result<(), String> {
    static ACTIVE: std::sync::OnceLock<std::sync::Mutex<Vec<(String, Option<String>)>>> = std::sync::OnceLock::new();
    hud_diag("APPLY_BEGIN");
    if let Err(error) = validate_bindings(bindings) {
        hud_diag(&format!("VALIDATE_FAILED {}", error));
        return Err(error);
    }
    let active = ACTIVE.get_or_init(|| std::sync::Mutex::new(Vec::new()));
    let mut guard = active.lock().map_err(|_| "Global shortcut state poisoned".to_string())?;
    let previous = guard.clone();
    let gs = app.global_shortcut();
    gs.unregister_all().map_err(|e| {
        hud_diag(&format!("UNREGISTER_FAILED {}", e));
        format!("Cannot clear old global shortcuts: {}", e)
    })?;
    if let Err(error) = register_bindings(app, bindings) {
        hud_diag(&format!("APPLY_FAILED {}", error));
        let _ = gs.unregister_all();
        if let Err(rollback) = register_bindings(app, &previous) {
            return Err(format!("{}; restore of previous shortcuts also failed: {}", error, rollback));
        }
        return Err(error);
    }
    hud_diag("APPLY_SUCCESS");
    *guard = bindings.to_vec();
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn action_ids_roundtrip() {
        assert_eq!(HotkeyAction::from_id("playPause"), Some(HotkeyAction::PlayPause));
        assert_eq!(HotkeyAction::from_id("next"), Some(HotkeyAction::Next));
        assert_eq!(HotkeyAction::from_id("prev"), Some(HotkeyAction::Prev));
        assert_eq!(HotkeyAction::from_id("toggleDesktopLyrics"), Some(HotkeyAction::ToggleDesktopLyrics));
        assert_eq!(HotkeyAction::from_id("toggleDesktopLyricsLock"), Some(HotkeyAction::ToggleDesktopLyricsLock));
        assert_eq!(HotkeyAction::from_id("volumeUp"), None);
    }

    #[test]
    fn event_names_match_frontend_listeners() {
        assert_eq!(HotkeyAction::PlayPause.event_name(), "media-toggle");
        assert_eq!(HotkeyAction::Next.event_name(), "media-next");
        assert_eq!(HotkeyAction::Prev.event_name(), "media-prev");
        assert_eq!(HotkeyAction::ToggleDesktopLyrics.event_name(), "toggle-desktop-lyrics");
        assert_eq!(HotkeyAction::ToggleDesktopLyricsLock.event_name(), "toggle-desktop-lyrics-lock");
    }
}
