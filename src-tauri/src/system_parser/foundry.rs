use super::types::{NormalizedAction, NormalizedStats, NormalizedTrait, TableData, TableResultEntry, UniversalParsedEntity, SpellReference, ItemReference};
use serde_json::Value;
use std::collections::HashMap;

pub fn parse_foundry_entity(json: &Value, filename: Option<&str>) -> Vec<UniversalParsedEntity> {
    let mut entities = Vec::new();
    let docs = extract_foundry_docs(json);

    for (idx, doc) in docs.iter().enumerate() {
        if !doc.is_object() {
            continue;
        }
        if let Some(entity) = normalize_foundry_document(doc, idx, filename) {
            entities.push(entity);
        }
    }

    entities
}

fn extract_foundry_docs(raw_val: &Value) -> Vec<Value> {
    if let Some(arr) = raw_val.as_array() {
        return arr.clone();
    }
    if let Some(obj) = raw_val.as_object() {
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
        
        // Dictionary map of documents
        let values: Vec<Value> = obj.values().cloned().collect();
        if !values.is_empty() && values.iter().all(|v| {
            v.is_object() && (
                v.get("system").is_some() ||
                v.get("data").is_some() ||
                v.get("type").is_some() ||
                v.get("_id").is_some()
            )
        }) {
            return values;
        }

        return vec![raw_val.clone()];
    }
    Vec::new()
}

fn normalize_foundry_document(
    doc: &Value,
    _index: usize,
    filename: Option<&str>,
) -> Option<UniversalParsedEntity> {
    let sys_data = doc.get("system").or_else(|| doc.get("data")).cloned().unwrap_or_else(|| serde_json::json!({}));
    
    let name = doc.get("name")
        .or_else(|| doc.get("title"))
        .and_then(|n| n.as_str())
        .unwrap_or_else(|| filename.unwrap_or("Foundry Entity"))
        .to_string();

    let doc_type = doc.get("type").and_then(|t| t.as_str()).unwrap_or("");
    
    let id_base = doc.get("_id").and_then(|id| id.as_str()).unwrap_or(&name);
    let id = format!("foundry-{}-{}", if doc_type.is_empty() { "entity" } else { doc_type }, sanitize_id(id_base));

    let img = doc.get("img")
        .or_else(|| doc.pointer("/img"))
        .or_else(|| sys_data.get("img"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let token_img = doc.pointer("/prototypeToken/texture/src")
        .or_else(|| doc.pointer("/prototypeToken/img"))
        .or_else(|| doc.pointer("/token/img"))
        .or_else(|| doc.pointer("/token/texture/src"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    // 1. ACTOR (NPC / Character / Monster / Vehicle / Group)
    if matches!(doc_type, "npc" | "character" | "vehicle" | "creature" | "group")
        || (doc.get("attributes").is_some() && doc.get("items").is_some())
    {
        let is_character = doc_type == "character";
        let category = if is_character { "characters" } else { "monsters" }.to_string();

        let hp_obj = sys_data.get("attributes").and_then(|a| a.get("hp"))
            .or_else(|| sys_data.get("hp"))
            .cloned()
            .unwrap_or_else(|| serde_json::json!({}));
        let ac_obj = sys_data.get("attributes").and_then(|a| a.get("ac"))
            .or_else(|| sys_data.get("ac"))
            .cloned()
            .unwrap_or_else(|| serde_json::json!({}));

        let hp = hp_obj.get("value")
            .and_then(|v| v.as_i64().map(|n| n as i32))
            .or_else(|| if hp_obj.is_number() { hp_obj.as_i64().map(|n| n as i32) } else { None });
        let max_hp = hp_obj.get("max").and_then(|v| v.as_i64().map(|n| n as i32));
        
        let hit_dice = sys_data.pointer("/attributes/hd/value")
            .or_else(|| sys_data.pointer("/details/hitDice"))
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .or_else(|| hp_obj.get("formula").and_then(|f| f.as_str().map(|s| s.to_string())));

        let ac = ac_obj.get("value")
            .or_else(|| ac_obj.get("flat"))
            .map(|v| v.to_string().replace('"', ""))
            .or_else(|| if ac_obj.is_number() { Some(ac_obj.to_string()) } else { None })
            .unwrap_or_else(|| "10".to_string());

        let speed = format_speed(sys_data.pointer("/attributes/movement").or_else(|| sys_data.get("movement")).or_else(|| sys_data.get("speed")).unwrap_or(&serde_json::Value::Null));
        
        let cr = sys_data.pointer("/details/cr").or_else(|| sys_data.get("cr")).map(|v| v.to_string().replace('"', ""));
        let level = sys_data.pointer("/details/level").or_else(|| sys_data.get("level")).and_then(|v| v.as_i64().map(|n| n as i32));
        let xp = sys_data.pointer("/details/xp/value").or_else(|| sys_data.get("xp")).and_then(|v| v.as_i64());

        let senses = sys_data.pointer("/traits/senses/value")
            .or_else(|| sys_data.pointer("/attributes/senses"))
            .or_else(|| sys_data.get("senses"))
            .and_then(|v| v.as_str().map(|s| s.to_string()));

        let languages = format_languages(sys_data.pointer("/traits/languages").or_else(|| sys_data.get("languages")).unwrap_or(&serde_json::Value::Null));
        
        let proficiency_bonus = sys_data.pointer("/attributes/prof").or_else(|| sys_data.get("prof")).and_then(|v| v.as_i64().map(|n| n as i32));

        let mut stats = NormalizedStats {
            hp,
            max_hp,
            hit_dice,
            ac: Some(ac.clone()),
            speed: Some(speed.clone()),
            cr,
            level,
            xp,
            senses,
            languages: if languages.is_empty() { None } else { Some(languages) },
            proficiency_bonus,
            ..Default::default()
        };

        // Extract ability scores (STR, DEX, etc.)
        let abilities = sys_data.get("abilities").or_else(|| sys_data.get("stats"));
        if let Some(abilities_obj) = abilities.and_then(|a| a.as_object()) {
            let mut abilities_map = HashMap::new();
            for (k, v) in abilities_obj {
                let val = v.get("value").unwrap_or(v);
                if val.is_number() {
                    abilities_map.insert(k.to_lowercase(), val.clone());
                }
            }
            if !abilities_map.is_empty() {
                stats.attributes = Some(abilities_map);
            }
        }

        // Extract actions, traits, spells, items
        let mut actions = Vec::new();
        let mut traits = Vec::new();
        let mut spells = Vec::new();
        let mut items = Vec::new();

        if let Some(items_arr) = doc.get("items").and_then(|i| i.as_array()) {
            for item in items_arr {
                let i_sys = item.get("system").or_else(|| item.get("data")).cloned().unwrap_or_else(|| serde_json::json!({}));
                let i_name = item.get("name").and_then(|n| n.as_str()).unwrap_or("Безымянный элемент").to_string();
                let i_type = item.get("type").and_then(|t| t.as_str()).unwrap_or("");
                let i_desc = strip_html(i_sys.pointer("/description/value").or_else(|| i_sys.get("description")).and_then(|d| d.as_str()).unwrap_or(""));

                if i_type == "spell" {
                    spells.push(SpellReference {
                        name: i_name,
                        level: i_sys.get("level").and_then(|v| v.as_i64().map(|n| n as i32)),
                        school: i_sys.get("school").and_then(|v| v.as_str().map(|s| s.to_string())),
                        description: Some(i_desc),
                    });
                } else if matches!(i_type, "weapon" | "feat" | "action") {
                    let to_hit = i_sys.get("attackBonus").or_else(|| i_sys.get("bonus")).map(|v| v.to_string().replace('"', ""));
                    let range_str = i_sys.pointer("/range/value").and_then(|v| {
                        let units = i_sys.pointer("/range/units").and_then(|u| u.as_str()).unwrap_or("ft");
                        v.as_i64().map(|n| format!("{} {}", n, units))
                            .or_else(|| v.as_str().map(|s| format!("{} {}", s, units)))
                    });

                    actions.push(NormalizedAction {
                        name: i_name,
                        action_type: Some(if i_type == "weapon" { "attack".to_string() } else { i_sys.pointer("/activation/type").and_then(|t| t.as_str()).unwrap_or("action").to_string() }),
                        to_hit,
                        reach: None,
                        range: range_str,
                        damage: format_damage(i_sys.get("damage").unwrap_or(&serde_json::Value::Null)),
                        damage_type: None,
                        description: i_desc,
                        cost: None,
                    });
                } else if matches!(i_type, "equipment" | "consumable" | "loot" | "tool" | "backpack" | "container") {
                    items.push(ItemReference {
                        name: i_name,
                        quantity: i_sys.get("quantity").and_then(|v| v.as_i64().map(|n| n as i32)),
                        weight: i_sys.get("weight").and_then(|v| v.as_f64().or_else(|| v.as_i64().map(|n| n as f64))),
                        description: Some(i_desc),
                    });
                } else {
                    traits.push(NormalizedTrait {
                        name: i_name,
                        description: i_desc,
                        trait_type: if i_type.is_empty() { None } else { Some(i_type.to_string()) },
                    });
                }
            }
        }

        let summary = if let Some(hp_val) = stats.hp {
            format!("Хиты: {}/{}, КД: {}, Скорость: {}", hp_val, stats.max_hp.unwrap_or(hp_val), stats.ac.as_deref().unwrap_or("10"), stats.speed.as_deref().unwrap_or("30 фт"))
        } else {
            format!("Сущность Foundry VTT: {}", name)
        };

        let biography = sys_data.pointer("/details/biography/value")
            .or_else(|| sys_data.get("biography"))
            .or_else(|| sys_data.pointer("/description/value"))
            .and_then(|v| v.as_str())
            .map(|s| strip_html(s));

        let mut tags = vec!["Foundry VTT".to_string(), if doc_type.is_empty() { "actor".to_string() } else { doc_type.to_string() }];
        if let Some(ref cr_val) = stats.cr {
            tags.push(format!("CR {}", cr_val));
        }
        if let Some(lvl) = stats.level {
            tags.push(format!("Уровень {}", lvl));
        }
        if let Some(race) = sys_data.pointer("/details/type/value").or_else(|| sys_data.pointer("/details/race")).and_then(|v| v.as_str()) {
            tags.push(race.to_string());
        }

        return Some(UniversalParsedEntity {
            id,
            name: name.clone(),
            original_name: Some(name.clone()),
            category,
            source_format: if is_character { "foundry_actor".to_string() } else { "foundry_npc".to_string() },
            source_system: Some("Foundry VTT".to_string()),
            summary,
            description: biography,
            tags,
            img: img.clone(),
            token_img: token_img.clone(),
            stats: Some(stats),
            actions: if actions.is_empty() { None } else { Some(actions) },
            traits: if traits.is_empty() { None } else { Some(traits) },
            spells: if spells.is_empty() { None } else { Some(spells) },
            items: if items.is_empty() { None } else { Some(items) },
            table_data: None,
            pdf_source: None,
            raw_content: Some(doc.clone()),
            suggested_filename: format!("{}.json", sanitize_filename(&name)),
        });
    }

    // 2. ITEM (Spell, Weapon, Equipment, Feat, Consumable, Loot, Class, Subclass, Race, Background, Tool, Backpack, Container)
    if matches!(
        doc_type,
        "spell" | "weapon" | "equipment" | "feat" | "consumable" | "loot" | "class" | "subclass" | "race" | "background" | "tool" | "backpack" | "container"
    ) {
        let category = match doc_type {
            "spell" => "spells",
            "feat" => "feats",
            "race" => "races",
            "class" | "subclass" => "classes",
            "weapon" => "weapons",
            "equipment" => "equipment",
            "background" => "rules",
            _ => "items",
        }.to_string();

        let desc = sys_data.pointer("/description/value").or_else(|| sys_data.get("description")).and_then(|d| d.as_str()).unwrap_or("");
        let clean_desc = strip_html(desc);

        let mut tags = vec!["Foundry VTT".to_string(), doc_type.to_string()];
        if let Some(rarity) = sys_data.get("rarity").and_then(|r| r.as_str()) {
            if !rarity.is_empty() {
                tags.push(rarity.to_string());
            }
        }
        if let Some(school) = sys_data.get("school").and_then(|s| s.as_str()) {
            if !school.is_empty() {
                tags.push(school.to_string());
            }
        }
        if let Some(level) = sys_data.get("level").and_then(|l| l.as_i64()) {
            tags.push(format!("Круг {}", level));
        }

        return Some(UniversalParsedEntity {
            id,
            name: name.clone(),
            original_name: Some(name.clone()),
            category,
            source_format: "foundry_item".to_string(),
            source_system: Some("Foundry VTT".to_string()),
            summary: if clean_desc.is_empty() { format!("Предмет/способность {}", name) } else { clean_desc.chars().take(160).collect::<String>() },
            description: Some(clean_desc),
            tags,
            img: img.clone(),
            token_img: token_img.clone(),
            stats: None,
            actions: None,
            traits: None,
            spells: None,
            items: None,
            table_data: None,
            pdf_source: None,
            raw_content: Some(doc.clone()),
            suggested_filename: format!("{}.json", sanitize_filename(&name)),
        });
    }

    // 3. JOURNAL ENTRY (Rules & Lore)
    if doc.get("pages").is_some() || doc_type == "JournalEntry" || doc.get("content").is_some() {
        let mut page_texts = Vec::new();

        if let Some(pages) = doc.get("pages").and_then(|p| p.as_array()) {
            for page in pages {
                let p_name = page.get("name").and_then(|n| n.as_str()).unwrap_or("Страница");
                let mut p_content = String::new();

                if let Some(content) = page.pointer("/text/content").and_then(|c| c.as_str()) {
                    p_content = strip_html(content);
                } else if let Some(markdown) = page.pointer("/text/markdown").and_then(|m| m.as_str()) {
                    p_content = markdown.to_string();
                } else if let Some(src) = page.get("src").and_then(|s| s.as_str()) {
                    p_content = format!("![{}]({})", p_name, src);
                }

                page_texts.push(format!("### {}\n\n{}", p_name, p_content));
            }
        } else if let Some(content) = doc.get("content").and_then(|c| c.as_str()) {
            page_texts.push(strip_html(content));
        }

        let full_desc = if page_texts.is_empty() {
            format!("Справочный материал: {}", name)
        } else {
            page_texts.join("\n\n---\n\n")
        };

        return Some(UniversalParsedEntity {
            id,
            name: name.clone(),
            original_name: Some(name.clone()),
            category: "rules".to_string(),
            source_format: "foundry_journal".to_string(),
            source_system: Some("Foundry VTT".to_string()),
            summary: format!("Журнал/Справочник правил Foundry: {} (стр. {})", name, page_texts.len()),
            description: Some(full_desc),
            tags: vec!["Foundry VTT".to_string(), "Журнал".to_string(), "Правила".to_string()],
            img: img.clone(),
            token_img: token_img.clone(),
            stats: None,
            actions: None,
            traits: None,
            spells: None,
            items: None,
            table_data: None,
            pdf_source: None,
            raw_content: Some(doc.clone()),
            suggested_filename: format!("{}.md", sanitize_filename(&name)),
        });
    }

    // 4. ROLLTABLE
    if let Some(results) = doc.get("results").and_then(|r| r.as_array()) {
        let formula = doc.get("formula").and_then(|f| f.as_str()).unwrap_or("1d20").to_string();
        let mut table_entries = Vec::new();
        let mut rows = Vec::new();

        for (idx, res) in results.iter().enumerate() {
            let mut range_pair = (idx as i32 + 1, idx as i32 + 1);
            let mut range_str = format!("{}", idx + 1);

            if let Some(range_arr) = res.get("range").and_then(|r| r.as_array()) {
                let start = range_arr.get(0).and_then(|v| v.as_i64()).unwrap_or(idx as i64 + 1) as i32;
                let end = range_arr.get(1).and_then(|v| v.as_i64()).unwrap_or(start as i64) as i32;
                range_pair = (start, end);
                range_str = if start == end { format!("{}", start) } else { format!("{}-{}", start, end) };
            } else if let Some(range_num) = res.get("range").and_then(|r| r.as_i64()) {
                range_pair = (range_num as i32, range_num as i32);
                range_str = format!("{}", range_num);
            }

            let text = res.get("text")
                .or_else(|| res.get("name"))
                .or_else(|| res.get("label"))
                .or_else(|| res.get("description"))
                .or_else(|| res.get("documentId"))
                .and_then(|t| t.as_str())
                .unwrap_or("")
                .to_string();

            let clean_text = if text.is_empty() {
                format!("Результат #{}", idx + 1)
            } else {
                strip_html(&text)
            };

            rows.push(vec![range_str, clean_text.clone()]);
            table_entries.push(TableResultEntry {
                range: range_pair,
                text: clean_text,
            });
        }

        let mut md_table = format!("### Таблица: {}\n", name);
        md_table.push_str(&format!("**Формула броска:** `{}`\n\n", formula));
        if let Some(desc) = doc.get("description").and_then(|d| d.as_str()) {
            if !desc.is_empty() {
                md_table.push_str(&strip_html(desc));
                md_table.push_str("\n\n");
            }
        }
        md_table.push_str("| Диапазон | Результат |\n| :---: | :--- |\n");
        for entry in &table_entries {
            let range_str = if entry.range.0 == entry.range.1 {
                format!("{}", entry.range.0)
            } else {
                format!("{}-{}", entry.range.0, entry.range.1)
            };
            md_table.push_str(&format!("| {} | {} |\n", range_str, entry.text));
        }

        return Some(UniversalParsedEntity {
            id,
            name: name.clone(),
            original_name: Some(name.clone()),
            category: "tables".to_string(),
            source_format: "foundry_rolltable".to_string(),
            source_system: Some("Foundry VTT".to_string()),
            summary: format!("Случайная таблица ({}) - {} записей", formula, table_entries.len()),
            description: Some(md_table),
            tags: vec!["Foundry VTT".to_string(), "Таблицы".to_string(), formula.clone()],
            img: img.clone(),
            token_img: token_img.clone(),
            stats: None,
            actions: None,
            traits: None,
            spells: None,
            items: None,
            table_data: Some(TableData {
                headers: Some(vec!["Диапазон".to_string(), "Результат".to_string()]),
                rows: Some(rows),
                formula: Some(formula),
                results: Some(table_entries),
            }),
            pdf_source: None,
            raw_content: Some(doc.clone()),
            suggested_filename: format!("{}.json", sanitize_filename(&name)),
        });
    }

    // 5. CARDS (Decks / Hands / Piles)
    if let Some(cards) = doc.get("cards").and_then(|c| c.as_array()) {
        let mut card_rows = Vec::new();
        for card in cards {
            let c_name = card.get("name").and_then(|n| n.as_str()).unwrap_or_else(|| "Карта");
            let c_type = card.get("type").and_then(|t| t.as_str()).unwrap_or("card");
            let c_desc = card.get("description")
                .or_else(|| card.get("text"))
                .and_then(|d| d.as_str())
                .unwrap_or("");
            card_rows.push(vec![c_name.to_string(), c_type.to_string(), strip_html(c_desc)]);
        }

        let mut md_cards = format!("### Колода/Набор карт: {}\n\n", name);
        md_cards.push_str("| Карта | Тип | Описание |\n| :--- | :--- | :--- |\n");
        for row in &card_rows {
            md_cards.push_str(&format!("| {} | {} | {} |\n", row[0], row[1], row[2]));
        }

        return Some(UniversalParsedEntity {
            id,
            name: name.clone(),
            original_name: Some(name.clone()),
            category: "tables".to_string(),
            source_format: "foundry_cards".to_string(),
            source_system: Some("Foundry VTT".to_string()),
            summary: format!("Колода/Набор карт Foundry: {} (карт: {})", name, cards.len()),
            description: Some(md_cards),
            tags: vec!["Foundry VTT".to_string(), "Карты".to_string(), doc_type.to_string()],
            img: img.clone(),
            token_img: token_img.clone(),
            stats: None,
            actions: None,
            traits: None,
            spells: None,
            items: None,
            table_data: None,
            pdf_source: None,
            raw_content: Some(doc.clone()),
            suggested_filename: format!("{}.json", sanitize_filename(&name)),
        });
    }

    // 6. MACROS
    if doc.get("command").is_some() || doc_type == "script" || doc_type == "macro" {
        let command = doc.get("command").and_then(|c| c.as_str()).unwrap_or("// Пустой макрос");
        let description = format!("```js\n{}\n```", command);

        return Some(UniversalParsedEntity {
            id,
            name: name.clone(),
            original_name: Some(name.clone()),
            category: "rules".to_string(),
            source_format: "foundry_macro".to_string(),
            source_system: Some("Foundry VTT".to_string()),
            summary: format!("Макрос Foundry: {}", name),
            description: Some(description),
            tags: vec!["Foundry VTT".to_string(), "Макрос".to_string(), "Скрипт".to_string()],
            img: img.clone(),
            token_img: token_img.clone(),
            stats: None,
            actions: None,
            traits: None,
            spells: None,
            items: None,
            table_data: None,
            pdf_source: None,
            raw_content: Some(doc.clone()),
            suggested_filename: format!("{}.js", sanitize_filename(&name)),
        });
    }

    // Fallback generic entity
    Some(UniversalParsedEntity {
        id,
        name: name.clone(),
        original_name: Some(name.clone()),
        category: "general".to_string(),
        source_format: "generic_json".to_string(),
        source_system: Some("Foundry VTT".to_string()),
        summary: format!("Foundry сущность: {}", name),
        description: None,
        tags: vec!["Foundry VTT".to_string(), if doc_type.is_empty() { "generic".to_string() } else { doc_type.to_string() }],
        img: img.clone(),
        token_img: token_img.clone(),
        stats: None,
        actions: None,
        traits: None,
        spells: None,
        items: None,
        table_data: None,
        pdf_source: None,
        raw_content: Some(doc.clone()),
        suggested_filename: format!("{}.json", sanitize_filename(&name)),
    })
}

fn sanitize_id(input: &str) -> String {
    input.to_lowercase().chars().map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' }).collect()
}

fn sanitize_filename(input: &str) -> String {
    input.chars().map(|c| if c.is_alphanumeric() || c == '_' || c == '-' || c == ' ' { c } else { '_' }).collect::<String>().trim().replace(' ', "_")
}

fn format_speed(movement: &Value) -> String {
    if movement.is_null() {
        return "30 фт.".to_string();
    }
    if let Some(s) = movement.as_str() {
        return s.to_string();
    }
    if let Some(n) = movement.as_f64() {
        return format!("{} фт.", n);
    }
    if let Some(n) = movement.as_i64() {
        return format!("{} фт.", n);
    }
    
    let mut parts = Vec::new();
    if let Some(walk) = movement.get("walk").or_else(|| movement.get("value")).and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))) {
        parts.push(format!("{} фт.", walk));
    }
    if let Some(fly) = movement.get("fly").and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))) {
        let hover = movement.get("hover").and_then(|h| h.as_bool()).unwrap_or(false);
        if hover {
            parts.push(format!("полёт {} фт. (парение)", fly));
        } else {
            parts.push(format!("полёт {} фт.", fly));
        }
    }
    if let Some(swim) = movement.get("swim").and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))) {
        parts.push(format!("плавание {} фт.", swim));
    }
    if let Some(climb) = movement.get("climb").and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))) {
        parts.push(format!("лазание {} фт.", climb));
    }
    if let Some(burrow) = movement.get("burrow").and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))) {
        parts.push(format!("рытьё {} фт.", burrow));
    }

    if parts.is_empty() {
        "30 фт.".to_string()
    } else {
        parts.join(", ")
    }
}

fn format_languages(langs: &Value) -> String {
    if langs.is_null() {
        return String::new();
    }
    if let Some(s) = langs.as_str() {
        return s.to_string();
    }
    if let Some(arr) = langs.as_array() {
        let items: Vec<String> = arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect();
        return items.join(", ");
    }
    if let Some(obj) = langs.as_object() {
        let mut base_list = Vec::new();
        if let Some(value_arr) = obj.get("value").and_then(|v| v.as_array()) {
            for v in value_arr {
                if let Some(s) = v.as_str() {
                    base_list.push(s.to_string());
                }
            }
        }
        let custom = obj.get("custom").and_then(|c| c.as_str()).unwrap_or("");
        if !base_list.is_empty() {
            let base = base_list.join(", ");
            if !custom.is_empty() {
                return format!("{}, {}", base, custom);
            }
            return base;
        }
        if !custom.is_empty() {
            return custom.to_string();
        }
    }
    String::new()
}

fn format_damage(dmg_val: &Value) -> Option<String> {
    if dmg_val.is_null() {
        return None;
    }
    if let Some(s) = dmg_val.as_str() {
        return Some(s.to_string());
    }
    if let Some(parts) = dmg_val.get("parts").and_then(|p| p.as_array()) {
        if !parts.is_empty() {
            let mut formatted_parts = Vec::new();
            for part in parts {
                if let Some(part_arr) = part.as_array() {
                    let formula = part_arr.get(0).and_then(|v| v.as_str()).unwrap_or("");
                    let dmg_type = part_arr.get(1).and_then(|v| v.as_str()).unwrap_or("");
                    if !formula.is_empty() {
                        if !dmg_type.is_empty() {
                            formatted_parts.push(format!("{} {}", formula, dmg_type));
                        } else {
                            formatted_parts.push(formula.to_string());
                        }
                    }
                }
            }
            if !formatted_parts.is_empty() {
                return Some(formatted_parts.join(" + "));
            }
        }
    }
    None
}

fn strip_html(text: &str) -> String {
    super::quality::clean_html_and_macros(text)
}
