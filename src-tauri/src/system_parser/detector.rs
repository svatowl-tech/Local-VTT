use serde_json::Value;

pub fn detect_source_format(
    raw_data: &str,
    filename: Option<&str>,
    format_hint: Option<&str>,
) -> (&'static str, &'static str) {
    if let Some(hint) = format_hint {
        if !hint.is_empty() && hint != "auto" {
            return match hint {
                "foundry" | "foundry_actor" => ("foundry_actor", "Foundry VTT Entity"),
                "foundry_compendium" => ("foundry_compendium", "Foundry VTT Compendium Pack"),
                "foundry_item" => ("foundry_item", "Foundry VTT Item"),
                "foundry_rolltable" => ("foundry_rolltable", "Foundry VTT Rollable Table"),
                "foundry_journal" => ("foundry_journal", "Foundry VTT Journal Entry"),
                "roll20" | "roll20_character" => ("roll20_character", "Roll20 Character"),
                "5etools" | "5etools_compendium" => ("5etools_compendium", "5eTools Compendium"),
                "pdf" | "pdf_document" => ("pdf_document", "PDF Document"),
                "gurps_gcs" => ("gurps_gcs", "GURPS Character Sheet XML"),
                "csv" | "csv_table" => ("csv_table", "CSV / TSV Data Table"),
                "text" | "text_statblock" => ("text_statblock", "TTRPG Text Statblock"),
                "markdown" | "markdown_doc" => ("markdown_doc", "Markdown Rule Document"),
                _ => ("generic_json", "Generic Data"),
            };
        }
    }

    let ext = filename
        .and_then(|f| f.split('.').last())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    let trimmed = raw_data.trim();

    // 1. JSON / NeDB detection
    if ext == "json" || ext == "db" || ext == "nedb" || ext == "jsonl" || trimmed.starts_with('{') || trimmed.starts_with('[') {
        let parsed_json = serde_json::from_str::<Value>(trimmed).ok().or_else(|| {
            // Try NDJSON / NeDB line by line
            let lines: Vec<Value> = trimmed
                .lines()
                .map(|l| l.trim())
                .filter(|l| !l.is_empty() && (l.starts_with('{') || l.starts_with('[')))
                .filter_map(|l| serde_json::from_str::<Value>(l).ok())
                .collect();
            if !lines.is_empty() {
                Some(Value::Array(lines))
            } else {
                None
            }
        });

        if let Some(json) = parsed_json {
            let docs = extract_docs(&json);
            if !docs.is_empty() {
                let sample = &docs[0];
                if let Some(obj) = sample.as_object() {
                    let entity_type = obj.get("type").and_then(|t| t.as_str()).unwrap_or("");

                    if matches!(entity_type, "character" | "npc" | "monster" | "creature" | "vehicle" | "group") || obj.contains_key("prototypeToken") {
                        return if docs.len() > 1 {
                            ("foundry_compendium", "Foundry VTT Compendium Pack (Actors)")
                        } else {
                            ("foundry_actor", "Foundry VTT Actor")
                        };
                    }

                    if matches!(entity_type, "weapon" | "equipment" | "spell" | "feat" | "feature" | "loot" | "consumable" | "class" | "subclass" | "race" | "background" | "tool" | "backpack" | "container") {
                        return if docs.len() > 1 {
                            ("foundry_compendium", "Foundry VTT Compendium Pack (Items)")
                        } else {
                            ("foundry_item", "Foundry VTT Item")
                        };
                    }

                    if obj.contains_key("pages") || entity_type == "JournalEntry" || obj.contains_key("content") {
                        return if docs.len() > 1 {
                            ("foundry_compendium", "Foundry VTT Journal Compendium")
                        } else {
                            ("foundry_journal", "Foundry VTT Journal Entry")
                        };
                    }

                    if obj.contains_key("results") || entity_type == "rolltable" || entity_type == "RollTable" {
                        return if docs.len() > 1 {
                            ("foundry_compendium", "Foundry VTT RollTables Pack")
                        } else {
                            ("foundry_rolltable", "Foundry VTT RollTable")
                        };
                    }

                    if obj.contains_key("cards") {
                        return ("foundry_compendium", "Foundry VTT Cards / Deck Pack");
                    }

                    if obj.contains_key("system") || obj.contains_key("data") || obj.contains_key("_id") {
                        if docs.len() > 1 {
                            return ("foundry_compendium", "Foundry VTT Compendium Pack");
                        }
                    }
                }
            }

            // 5eTools format
            if let Some(obj) = json.as_object() {
                if obj.contains_key("monster") && obj.get("monster").map(|v| v.is_array()).unwrap_or(false) {
                    return ("5etools_monster", "5eTools Bestiary Compendium");
                }
                if obj.contains_key("spell") && obj.get("spell").map(|v| v.is_array()).unwrap_or(false) {
                    return ("5etools_spell", "5eTools Spells Compendium");
                }
                if obj.contains_key("item") && obj.get("item").map(|v| v.is_array()).unwrap_or(false) {
                    return ("5etools_item", "5eTools Items Compendium");
                }
                if obj.contains_key("compendium") || obj.contains_key("_meta") || obj.contains_key("class") || obj.contains_key("race") {
                    return ("5etools_compendium", "5eTools System Compendium");
                }
                if obj.contains_key("schema_version") && (obj.contains_key("attribs") || obj.contains_key("attributes")) {
                    return ("roll20_character", "Roll20 Character Sheet Export");
                }
            }

            if json.is_array() {
                return ("5etools_compendium", "Multi-Entity JSON Array");
            }
        }
    }

    // 2. XML / GURPS GCS
    if ext == "xml" || ext == "gcs" || trimmed.starts_with("<?xml") || raw_data.contains("<character") || raw_data.contains("<gcs") {
        return ("gurps_gcs", "GURPS Character Sheet / XML Data");
    }

    // 3. CSV / TSV
    if ext == "csv" || ext == "tsv" || (raw_data.lines().count() > 1 && (raw_data.lines().next().unwrap_or("").contains(',') || raw_data.lines().next().unwrap_or("").contains('\t'))) {
        return ("csv_table", "CSV / TSV Structured Table");
    }

    // 4. Markdown Document
    if ext == "md" || raw_data.starts_with("---") || raw_data.starts_with("# ") || raw_data.starts_with("## ") {
        if raw_data.contains("Armor Class") || raw_data.contains("Hit Points") || raw_data.contains("STR") && raw_data.contains("DEX") {
            return ("text_statblock", "TTRPG Monster/NPC Statblock");
        }
        return ("markdown_doc", "Markdown Rules Document");
    }

    // 5. Plain text statblock
    if raw_data.contains("Armor Class") || raw_data.contains("Hit Points") || raw_data.contains("Класс доспеха") || raw_data.contains("Хиты") || (raw_data.contains("STR") && raw_data.contains("DEX")) {
        return ("text_statblock", "TTRPG Monster/NPC Statblock");
    }

    ("generic_json", "Generic Raw Data")
}

fn extract_docs(v: &Value) -> Vec<Value> {
    if let Some(arr) = v.as_array() {
        return arr.clone();
    }
    if let Some(obj) = v.as_object() {
        if let Some(entries) = obj.get("entries").and_then(|e| e.as_array()) {
            return entries.clone();
        }
        if let Some(docs) = obj.get("docs").and_then(|d| d.as_array()) {
            return docs.clone();
        }
        if let Some(data_arr) = obj.get("data").and_then(|d| d.as_array()) {
            if data_arr.iter().any(|x| x.is_object()) {
                return data_arr.clone();
            }
        }
        let values: Vec<Value> = obj.values().cloned().collect();
        if !values.is_empty() && values.iter().all(|val| val.is_object() && (val.get("_id").is_some() || val.get("name").is_some() || val.get("type").is_some())) {
            return values;
        }
        return vec![v.clone()];
    }
    Vec::new()
}

