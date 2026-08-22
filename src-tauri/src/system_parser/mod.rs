pub mod detector;
pub mod disk_scanner;
pub mod fivetools;
pub mod foundry;
pub mod lore_disk;
pub mod lore_parser;
pub mod quality;
pub mod roll20;
pub mod search;
pub mod text_statblock;
pub mod types;
pub mod xml_csv;

pub use search::*;
pub use types::*;

use std::fs;
use std::path::Path;

pub fn parse_raw_system_data(
    raw_data: &str,
    filename: Option<&str>,
    format_hint: Option<&str>,
    default_system: Option<&str>,
) -> UniversalParseResult {
    let (format_id, format_desc) = detector::detect_source_format(raw_data, filename, format_hint);

    let mut entities: Vec<UniversalParsedEntity> = Vec::new();
    let mut errors: Vec<String> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();

    match format_id {
        "foundry_actor" | "foundry_item" | "foundry_rolltable" | "foundry_journal" | "foundry_compendium" => {
            let parsed_json = serde_json::from_str::<serde_json::Value>(raw_data).ok().or_else(|| {
                // Try NDJSON / NeDB line by line
                let lines: Vec<serde_json::Value> = raw_data
                    .lines()
                    .map(|l| l.trim())
                    .filter(|l| !l.is_empty() && (l.starts_with('{') || l.starts_with('[')))
                    .filter_map(|l| serde_json::from_str::<serde_json::Value>(l).ok())
                    .collect();
                if !lines.is_empty() {
                    Some(serde_json::Value::Array(lines))
                } else {
                    None
                }
            });

            match parsed_json {
                Some(json) => {
                    entities = foundry::parse_foundry_entity(&json, filename);
                }
                None => {
                    errors.push("Ошибка парсинга JSON/NeDB Foundry: неверный формат".to_string());
                }
            }
        }
        "5etools_monster" | "5etools_spell" | "5etools_item" | "5etools_compendium" => {
            match serde_json::from_str::<serde_json::Value>(raw_data) {
                Ok(json) => {
                    entities = fivetools::parse_5etools_compendium(&json);
                    if entities.is_empty() {
                        entities = fivetools::parse_generic_json_data(&json, filename, default_system);
                    }
                }
                Err(e) => {
                    errors.push(format!("Ошибка парсинга 5eTools JSON: {}", e));
                }
            }
        }
        "roll20_character" => {
            match serde_json::from_str::<serde_json::Value>(raw_data) {
                Ok(json) => {
                    entities = roll20::parse_roll20_sheet(&json, filename);
                }
                Err(e) => {
                    errors.push(format!("Ошибка парсинга Roll20 JSON: {}", e));
                }
            }
        }
        "csv_table" => {
            entities = xml_csv::parse_csv_table(raw_data, filename);
        }
        "gurps_gcs" => {
            entities = xml_csv::parse_xml_gurps(raw_data, filename);
        }
        "text_statblock" | "markdown_doc" => {
            entities = text_statblock::parse_text_statblock(raw_data, filename);
        }
        _ => {
            // Fallback generic JSON or text
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(raw_data) {
                entities = fivetools::parse_generic_json_data(&json, filename, default_system);
                if entities.is_empty() {
                    let name = json.get("name").and_then(|n| n.as_str()).unwrap_or("Объект").to_string();
                    entities.push(UniversalParsedEntity {
                        id: "generic-0".to_string(),
                        name: name.clone(),
                        original_name: Some(name.clone()),
                        category: "general".to_string(),
                        source_format: "generic_json".to_string(),
                        source_system: default_system.map(|s| s.to_string()),
                        summary: "Универсальный JSON объект".to_string(),
                        description: None,
                        tags: vec!["JSON".to_string()],
                        img: None,
                        token_img: None,
                        stats: None,
                        actions: None,
                        traits: None,
                        spells: None,
                        items: None,
                        table_data: None,
                        pdf_source: None,
                        raw_content: Some(json.clone()),
                        suggested_filename: format!("{}.json", name.to_lowercase().replace(' ', "_")),
                    });
                }
            } else {
                entities = text_statblock::parse_text_statblock(raw_data, filename);
            }
        }
    }

    let mut stats = UniversalParseStats::default();
    for entity in &entities {
        match entity.category.as_str() {
            "characters" => stats.characters_count += 1,
            "monsters" => stats.monsters_count += 1,
            "spells" => stats.spells_count += 1,
            "items" => stats.items_count += 1,
            "rules" => stats.rules_count += 1,
            "tables" => stats.tables_count += 1,
            _ => stats.other_count += 1,
        }
    }

    let raw_result = UniversalParseResult {
        success: errors.is_empty() && !entities.is_empty(),
        source_format: format_id.to_string(),
        format_description: format_desc.to_string(),
        total_entities_found: entities.len(),
        entities,
        errors,
        warnings,
        stats,
    };

    quality::evaluate_and_fix_quality(raw_result, filename, default_system)
}

pub fn parse_file_on_disk(file_path: &Path, default_sys: Option<&str>) -> Result<UniversalParseResult, String> {
    if !file_path.exists() {
        return Err(format!("Файл не найден: {:?}", file_path));
    }

    let raw_data = fs::read_to_string(file_path).map_err(|e| format!("Ошибка чтения файла: {}", e))?;
    let file_name = file_path.file_name().and_then(|f| f.to_str());
    Ok(parse_raw_system_data(&raw_data, file_name, None, default_sys))
}
