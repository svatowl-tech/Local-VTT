use super::lore_parser::parse_lore_and_worlds_raw;
use super::types::UniversalParsedEntity;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveLoreItemResult {
    pub success: bool,
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanLoreIncrementalResult {
    pub success: bool,
    pub world_id: String,
    pub entities: Vec<UniversalParsedEntity>,
    pub total_json_entities: usize,
    pub source_files_parsed: usize,
    pub skipped_sources: usize,
}

pub fn save_lore_item_to_disk_rust(
    lore_root: &Path,
    world_folder: &str,
    item_json_str: &str,
    filename: &str,
) -> Result<SaveLoreItemResult, String> {
    let target_dir = lore_root.join(world_folder);
    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(|e| format!("Не удалось создать директорию: {}", e))?;
    }

    let clean_fname = if filename.ends_with(".json") {
        filename.to_string()
    } else {
        format!("{}.json", filename)
    };

    let file_path = target_dir.join(&clean_fname);
    fs::write(&file_path, item_json_str).map_err(|e| format!("Ошибка сохранения файла лора: {}", e))?;

    Ok(SaveLoreItemResult {
        success: true,
        file_path: file_path.to_string_lossy().to_string(),
    })
}

pub fn delete_lore_item_from_disk_rust(
    lore_root: &Path,
    world_folder: &str,
    filename: &str,
) -> Result<bool, String> {
    let target_dir = lore_root.join(world_folder);
    if !target_dir.exists() {
        return Ok(false);
    }

    let clean_fname = if filename.ends_with(".json") {
        filename.to_string()
    } else {
        format!("{}.json", filename)
    };

    let file_path = target_dir.join(&clean_fname);
    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| format!("Ошибка удаления файла: {}", e))?;
        Ok(true)
    } else {
        Ok(false)
    }
}

pub fn scan_lore_folder_incremental_rust(
    lore_root: &Path,
    world_folder: &str,
    target_world_id: &str,
    target_system_id: &str,
    force_reparse: bool,
) -> Result<ScanLoreIncrementalResult, String> {
    let dir_path = lore_root.join(world_folder);
    if !dir_path.exists() {
        fs::create_dir_all(&dir_path).map_err(|e| e.to_string())?;
    }

    let mut json_files = Vec::new();
    let mut source_files = Vec::new();

    if let Ok(entries) = fs::read_dir(&dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let file_name = entry.file_name().to_string_lossy().to_string();
                if file_name.starts_with('.') {
                    continue;
                }
                let ext = path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|s| s.to_lowercase())
                    .unwrap_or_default();

                if ext == "json" {
                    json_files.push(path);
                } else if matches!(ext.as_str(), "pdf" | "txt" | "md" | "wiki" | "epub" | "zip") {
                    source_files.push(path);
                }
            }
        }
    }

    let mut entities = Vec::new();

    // 1. Load existing JSON entities
    for json_path in &json_files {
        if let Ok(content) = fs::read_to_string(json_path) {
            if let Ok(entity) = serde_json::from_str::<UniversalParsedEntity>(&content) {
                entities.push(entity);
            }
        }
    }

    let total_json_entities = entities.len();
    let mut source_files_parsed = 0;
    let mut skipped_sources = 0;

    // 2. Skip re-parsing source files if JSON entities already exist and not forcing reparse
    if total_json_entities > 0 && !force_reparse {
        skipped_sources = source_files.len();
        return Ok(ScanLoreIncrementalResult {
            success: true,
            world_id: target_world_id.to_string(),
            entities,
            total_json_entities,
            source_files_parsed: 0,
            skipped_sources,
        });
    }

    // 3. Parse source files if force_reparse is true or no JSON entities exist
    for src_path in &source_files {
        if let Ok(content) = fs::read_to_string(src_path) {
            let fname = src_path.file_name().and_then(|f| f.to_str());
            let parse_res = parse_lore_and_worlds_raw(&content, fname, Some(target_world_id), Some(target_system_id));

            if parse_res.success && !parse_res.entities.is_empty() {
                source_files_parsed += 1;
                for ent in parse_res.entities {
                    let json_name = format!("lore_{}_{}.json", ent.category, ent.id);
                    if let Ok(json_str) = serde_json::to_string_pretty(&ent) {
                        let _ = save_lore_item_to_disk_rust(lore_root, world_folder, &json_str, &json_name);
                    }
                    entities.push(ent);
                }
            }
        }
    }

    Ok(ScanLoreIncrementalResult {
        success: true,
        world_id: target_world_id.to_string(),
        entities,
        total_json_entities,
        source_files_parsed,
        skipped_sources,
    })
}
