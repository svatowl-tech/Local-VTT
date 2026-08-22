use super::types::{ImportResult, SystemDataItemRust, UniversalParsedEntity};
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

const SUPPORTED_EXTS: &[&str] = &[
    "json", "yaml", "yml", "md", "txt", "xml", "gcs", "csv", "tsv", "db", "jsonl",
];

pub fn scan_systems_directory(
    systems_root: &Path,
    target_system_id: Option<&str>,
) -> Result<Vec<SystemDataItemRust>, String> {
    let mut items = Vec::new();

    if !systems_root.exists() {
        return Ok(items);
    }

    let entries = fs::read_dir(systems_root).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let folder_name = entry.file_name().to_string_lossy().to_string();
        if folder_name.starts_with('.') {
            continue;
        }

        let sys_id = folder_name.to_lowercase().replace(|c: char| !c.is_alphanumeric() && c != '_', "_");

        if let Some(target) = target_system_id {
            if sys_id != target && folder_name != target {
                continue;
            }
        }

        // Recursively walk this system folder
        scan_folder_recursive(&path, &sys_id, &folder_name, &mut items);
    }

    Ok(items)
}

fn scan_folder_recursive(
    dir_path: &Path,
    sys_id: &str,
    folder_name: &str,
    items: &mut Vec<SystemDataItemRust>,
) {
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();

            if file_name.starts_with('.') || file_name == "README.txt" || file_name == "manifest.json" {
                continue;
            }

            if path.is_dir() {
                scan_folder_recursive(&path, sys_id, folder_name, items);
            } else if path.is_file() {
                let ext = path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|s| s.to_lowercase())
                    .unwrap_or_default();

                if SUPPORTED_EXTS.contains(&ext.as_str()) {
                    if let Ok(metadata) = entry.metadata() {
                        let file_size = metadata.len();
                        let mtime = metadata
                            .modified()
                            .ok()
                            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                            .map(|d| d.as_millis() as u64)
                            .unwrap_or(0);

                        let clean_name = path
                            .file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or(&file_name)
                            .replace('_', " ");

                        let parent_dir_name = path
                            .parent()
                            .and_then(|p| p.file_name())
                            .and_then(|f| f.to_str())
                            .unwrap_or("general");

                        let category = match parent_dir_name {
                            "monsters" | "spells" | "items" | "races" | "classes" | "rules" | "characters" | "tables" => {
                                parent_dir_name.to_string()
                            }
                            _ => {
                                let lower = clean_name.to_lowercase();
                                if lower.contains("monster") || lower.contains("creature") {
                                    "monsters".to_string()
                                } else if lower.contains("spell") {
                                    "spells".to_string()
                                } else if lower.contains("item") || lower.contains("weapon") {
                                    "items".to_string()
                                } else if lower.contains("table") {
                                    "tables".to_string()
                                } else {
                                    "general".to_string()
                                }
                            }
                        };

                        let rel_path = path
                            .strip_prefix(dir_path.parent().unwrap_or(dir_path))
                            .map(|p| p.to_string_lossy().to_string())
                            .unwrap_or_else(|_| format!("{}/{}", category, file_name));

                        let id = format!("sys-{}-{}-{}", sys_id, category, sanitize_id(&clean_name));

                        items.push(SystemDataItemRust {
                            id,
                            system_id: sys_id.to_string(),
                            category,
                            name: clean_name,
                            source: Some(format!("Локальный диск ({})", folder_name)),
                            format: ext,
                            file_size,
                            mtime,
                            relative_path: rel_path,
                            summary: None,
                            tags: vec![sys_id.to_string(), parent_dir_name.to_string()],
                            data: None,
                        });
                    }
                }
            }
        }
    }
}

pub fn import_entities_to_disk(
    systems_root: &Path,
    system_id: &str,
    entities: &[UniversalParsedEntity],
) -> Result<ImportResult, String> {
    let target_system_dir = systems_root.join(system_id);
    if !target_system_dir.exists() {
        fs::create_dir_all(&target_system_dir).map_err(|e| e.to_string())?;
    }

    let mut imported = 0;
    let mut skipped = 0;
    let mut created_files = Vec::new();
    let mut errors = Vec::new();

    for entity in entities {
        let cat_folder = target_system_dir.join(&entity.category);
        if !cat_folder.exists() {
            if let Err(e) = fs::create_dir_all(&cat_folder) {
                errors.push(format!("Не удалось создать папку {}: {}", entity.category, e));
                skipped += 1;
                continue;
            }
        }

        let file_path = cat_folder.join(&entity.suggested_filename);
        match serde_json::to_string_pretty(entity) {
            Ok(json_str) => {
                if let Err(e) = fs::write(&file_path, json_str) {
                    errors.push(format!("Ошибка записи {}: {}", entity.name, e));
                    skipped += 1;
                } else {
                    imported += 1;
                    created_files.push(file_path.to_string_lossy().to_string());
                }
            }
            Err(e) => {
                errors.push(format!("Ошибка сериализации {}: {}", entity.name, e));
                skipped += 1;
            }
        }
    }

    Ok(ImportResult {
        success: errors.is_empty(),
        imported_count: imported,
        skipped_count: skipped,
        system_id: system_id.to_string(),
        created_files,
        errors,
    })
}

fn sanitize_id(input: &str) -> String {
    input.to_lowercase().chars().map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' }).collect()
}
