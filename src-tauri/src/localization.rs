//! Safe, declarative translation overrides stored next to the installed app.
//! Nothing in this module executes code or accepts user-controlled paths.

use std::collections::HashMap;
use std::io::Read;
use std::path::Path;
use tauri::Manager;

const MAX_LANGUAGE_PACK_BYTES: usize = 2 * 1024 * 1024;

/// Native presentation shares the checked-in dictionary; no backend state changes.
pub fn native_text(source: &str) -> String {
    static DICTIONARY: std::sync::OnceLock<HashMap<String, String>> = std::sync::OnceLock::new();
    DICTIONARY.get_or_init(|| serde_json::from_str(include_str!("../../locales/zh-CN.json")).unwrap_or_default())
        .get(source).cloned().unwrap_or_else(|| source.to_owned())
}

/// Translate rendered remote markup only. PINs, commands and the wire sentinel
/// "Not Playing" retain their original values.
pub fn localize_remote_markup(mut html: String) -> String {
    html = html.replace("<html lang=\"en\">", "<html lang=\"zh-CN\">");
    for source in [
        "Aideo Connect — Pairing", "Aideo Connect Remote", "Connect Player",
        "Enter the 6-digit PIN displayed on your Aideo desktop player to connect.",
        "Check Aideo Settings &rarr; System &rarr; Aideo Connect Remote for your PIN.",
        "Connecting...", "🎵 Now Playing", "📜 Live Lyrics", "Not Playing",
        "Connecting to desktop player...", "Aideo Companion", "No synchronized lyrics available",
        "Instrumental or No Synced Lyrics", "Resume Sync &darr;",
    ] {
        html = html.replace(&format!(">{source}<"), &format!(">{}<", native_text(source)));
    }
    // The resume button has indentation around its label.
    html = html.replace("Resume Sync &darr;", &native_text("Resume Sync &darr;"));
    for source in ["Shuffle", "Previous", "Play/Pause", "Next", "Repeat", "Mute"] {
        html = html.replace(&format!("title=\"{source}\""), &format!("title=\"{}\"", native_text(source)));
    }
    for source in ["Connecting...", "Connected", "Offline", "Invalid or expired PIN. Please check Aideo player for the current PIN."] {
        let translated = serde_json::to_string(&native_text(source)).unwrap();
        html = html.replace(&format!(".textContent = '{source}'"), &format!(".textContent = {translated}"));
    }
    let idle = serde_json::to_string(&native_text("Not Playing")).unwrap();
    html = html.replace("data.title || 'Not Playing'", &format!("(data.title === 'Not Playing' ? {idle} : data.title || {idle})"));
    html
}


fn read_pack_from(install_dir: &Path) -> Result<Option<HashMap<String, String>>, String> {
    let file_path = install_dir.join("locales").join("zh-CN.json");
    let file = match std::fs::File::open(&file_path) {
        Ok(file) => file,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("Cannot open language file: {error}")),
    };
    let mut contents = Vec::new();
    file.take((MAX_LANGUAGE_PACK_BYTES + 1) as u64)
        .read_to_end(&mut contents)
        .map_err(|error| format!("Cannot read language file: {error}"))?;
    if contents.len() > MAX_LANGUAGE_PACK_BYTES {
        return Err("Language file exceeds the 2 MiB limit".to_owned());
    }

    let translations: HashMap<String, String> = serde_json::from_slice(&contents)
        .map_err(|error| format!("Language file is not a flat JSON string map: {error}"))?;
    if translations.iter().any(|(key, value)| key.is_empty() || key.len() > 500 || value.len() > 10_000) {
        return Err("Language file contains an invalid key or value length".to_owned());
    }
    Ok(Some(translations))
}

#[tauri::command]
pub fn read_language_pack(app: tauri::AppHandle) -> Result<Option<HashMap<String, String>>, String> {
    let install_dir = app.path().resource_dir()
        .map_err(|error| format!("Cannot locate application resources: {error}"))?;
    read_pack_from(&install_dir)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn remote_presentation_preserves_protocol_and_metadata() {
        let html = localize_remote_markup("<html lang=\"en\"><button title=\"Play/Pause\">Connect Player</button><script>send('play'); title.textContent = data.title || 'Not Playing'; if (data.title === 'Not Playing') stop();</script>".to_owned());
        assert!(html.contains("lang=\"zh-CN\""));
        assert!(html.contains("连接播放器"));
        assert!(html.contains("send('play')"));
        assert!(html.contains("if (data.title === 'Not Playing') stop()"));
        assert!(html.contains("未在播放"));
    }

    fn temporary_install_dir() -> std::path::PathBuf {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let dir = std::env::temp_dir().join(format!("aideo language pack {} {nonce}", std::process::id()));
        std::fs::create_dir_all(dir.join("locales")).unwrap();
        dir
    }

    #[test]
    fn missing_pack_is_normal() {
        let dir = temporary_install_dir();
        assert_eq!(read_pack_from(&dir).unwrap(), None);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn reads_utf8_json_dictionary_in_install_directory() {
        let dir = temporary_install_dir();
        std::fs::write(dir.join("locales/zh-CN.json"), r#"{"Settings":"设置","Library":"音乐库"}"#).unwrap();
        let pack = read_pack_from(&dir).unwrap().unwrap();
        assert_eq!(pack.get("Settings").unwrap(), "设置");
        assert_eq!(pack.get("Library").unwrap(), "音乐库");
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rejects_malformed_and_non_string_json() {
        let dir = temporary_install_dir();
        let file = dir.join("locales/zh-CN.json");
        std::fs::write(&file, "{bad json").unwrap();
        assert!(read_pack_from(&dir).is_err());
        std::fs::write(&file, r#"{"Settings":42}"#).unwrap();
        assert!(read_pack_from(&dir).is_err());
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rejects_oversize_file_before_parsing() {
        let dir = temporary_install_dir();
        std::fs::write(dir.join("locales/zh-CN.json"), vec![b' '; MAX_LANGUAGE_PACK_BYTES + 1]).unwrap();
        assert!(read_pack_from(&dir).is_err());
        std::fs::remove_dir_all(dir).unwrap();
    }
}
