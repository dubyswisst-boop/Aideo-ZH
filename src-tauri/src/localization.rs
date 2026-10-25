//! Safe, declarative translation overrides stored next to the installed app.
//! Nothing in this module executes code or accepts user-controlled paths.

use std::collections::HashMap;
use std::io::Read;
use std::path::Path;
use tauri::Manager;

const MAX_LANGUAGE_PACK_BYTES: usize = 2 * 1024 * 1024;

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
