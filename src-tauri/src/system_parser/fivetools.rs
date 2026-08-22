use super::types::{NormalizedAction, NormalizedStats, NormalizedTrait, UniversalParsedEntity};
use serde_json::Value;
use std::collections::HashMap;

pub fn clean_5etools_string(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let mut in_tag = false;
    let mut tag_content = String::new();

    let mut chars = input.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '{' && chars.peek() == Some(&'@') {
            in_tag = true;
            tag_content.clear();
            chars.next(); // consume '@'
            continue;
        }

        if in_tag {
            if c == '}' {
                in_tag = false;
                // Parse tag content: e.g. "spell fireball" or "damage 2d6+3|fire"
                let parts: Vec<&str> = tag_content.split(' ').collect();
                if parts.len() > 1 {
                    let val = parts[1..].join(" ");
                    let clean_val = val.split('|').next().unwrap_or(&val);
                    result.push_str(clean_val);
                } else if !parts.is_empty() {
                    result.push_str(parts[0]);
                }
            } else {
                tag_content.push(c);
            }
            continue;
        }

        result.push(c);
    }

    result
}

pub fn is_race_name_or_context(name: &str, context_name: Option<&str>) -> bool {
    let n = name.to_lowercase();
    let c = context_name.unwrap_or("").to_lowercase();
    let keywords = [
        "race", "races", "раса", "расы", "dwarf", "elf", "human", "halfling",
        "dragonborn", "gnome", "half-elf", "half-orc", "tiefling", "aarakocra",
        "genasi", "goliath", "tabaxi", "aasimar", "firbolg", "kenku", "lizardfolk",
        "triton", "bugbear", "goblin", "hobgoblin", "kobold", "orc", "yuan-ti",
        "gith", "changeling", "kalashtar", "shifter", "warforged", "subrace", "ancestry", "ancestries"
    ];
    keywords.iter().any(|kw| n.contains(kw) || c.contains(kw))
}

pub fn format_ability_bonuses(ability_val: Option<&Value>) -> String {
    let mut parts = Vec::new();
    if let Some(val) = ability_val {
        if let Some(s) = val.as_str() {
            return s.to_string();
        }
        let arr = if let Some(a) = val.as_array() {
            a.clone()
        } else {
            vec![val.clone()]
        };

        for item in arr {
            if let Some(obj) = item.as_object() {
                for (k, v) in obj {
                    let attr_name = match k.as_str() {
                        "str" => "Сила",
                        "dex" => "Ловкость",
                        "con" => "Телосложение",
                        "int" => "Интеллект",
                        "wis" => "Мудрость",
                        "cha" => "Харизма",
                        _ => "",
                    };
                    if !attr_name.is_empty() {
                        if let Some(num) = v.as_i64() {
                            parts.push(format!("{} +{}", attr_name, num));
                        }
                    } else if k == "choose" {
                        parts.push("Характеристики на выбор".to_string());
                    }
                }
            }
        }
    }
    parts.join(", ")
}

pub fn parse_5etools_compendium(json: &Value) -> Vec<UniversalParsedEntity> {
    let mut entities = Vec::new();

    // 1. Monsters
    if let Some(monsters) = json.get("monster").and_then(|m| m.as_array()) {
        for (idx, m) in monsters.iter().enumerate() {
            let name = m.get("name").and_then(|n| n.as_str()).unwrap_or("Монстр").to_string();
            let source = m.get("source").and_then(|s| s.as_str()).unwrap_or("5eTools").to_string();
            
            let mut stats = NormalizedStats::default();

            if let Some(hp_val) = m.get("hp") {
                if let Some(avg) = hp_val.get("average").and_then(|v| v.as_i64()) {
                    stats.hp = Some(avg as i32);
                    stats.max_hp = Some(avg as i32);
                } else if let Some(hp_num) = hp_val.as_i64() {
                    stats.hp = Some(hp_num as i32);
                }
                if let Some(formula) = hp_val.get("formula").and_then(|v| v.as_str()) {
                    stats.hit_dice = Some(formula.to_string());
                }
            }

            if let Some(ac_val) = m.get("ac") {
                if let Some(arr) = ac_val.as_array() {
                    if let Some(first) = arr.first() {
                        if let Some(ac_num) = first.as_i64() {
                            stats.ac = Some(ac_num.to_string());
                        } else if let Some(ac_obj_num) = first.get("ac").and_then(|v| v.as_i64()) {
                            stats.ac = Some(ac_obj_num.to_string());
                        }
                    }
                } else if let Some(ac_num) = ac_val.as_i64() {
                    stats.ac = Some(ac_num.to_string());
                }
            }

            if let Some(cr_val) = m.get("cr") {
                if let Some(cr_str) = cr_val.as_str() {
                    stats.cr = Some(cr_str.to_string());
                } else if let Some(cr_obj) = cr_val.get("cr").and_then(|v| v.as_str()) {
                    stats.cr = Some(cr_obj.to_string());
                } else if let Some(cr_num) = cr_val.as_i64() {
                    stats.cr = Some(cr_num.to_string());
                }
            }

            let mut abilities = HashMap::new();
            for attr in ["str", "dex", "con", "int", "wis", "cha"] {
                if let Some(val) = m.get(attr).and_then(|v| v.as_i64()) {
                    abilities.insert(attr.to_string(), serde_json::json!(val));
                }
            }
            if !abilities.is_empty() {
                stats.attributes = Some(abilities);
            }

            let mut traits = Vec::new();
            if let Some(trait_list) = m.get("trait").and_then(|t| t.as_array()) {
                for tr in trait_list {
                    let tr_name = tr.get("name").and_then(|n| n.as_str()).unwrap_or("Особенность").to_string();
                    let tr_desc = extract_entries_text(tr.get("entries"));
                    traits.push(NormalizedTrait {
                        name: tr_name,
                        description: clean_5etools_string(&tr_desc),
                        trait_type: Some("trait".to_string()),
                    });
                }
            }

            let mut actions = Vec::new();
            if let Some(action_list) = m.get("action").and_then(|a| a.as_array()) {
                for act in action_list {
                    let act_name = act.get("name").and_then(|n| n.as_str()).unwrap_or("Действие").to_string();
                    let act_desc = extract_entries_text(act.get("entries"));
                    actions.push(NormalizedAction {
                        name: act_name,
                        action_type: Some("action".to_string()),
                        to_hit: None,
                        reach: None,
                        range: None,
                        damage: None,
                        damage_type: None,
                        description: clean_5etools_string(&act_desc),
                        cost: None,
                    });
                }
            }

            let summary = format!(
                "CR {} • HP {} • AC {}",
                stats.cr.as_deref().unwrap_or("—"),
                stats.hp.map(|h| h.to_string()).unwrap_or_else(|| "—".to_string()),
                stats.ac.as_deref().unwrap_or("—")
            );

            entities.push(UniversalParsedEntity {
                id: format!("5etools-monster-{}-{}", idx, sanitize_id(&name)),
                name: name.clone(),
                original_name: Some(name.clone()),
                category: "monsters".to_string(),
                source_format: "5etools_monster".to_string(),
                source_system: Some(format!("D&D 5e ({})", source)),
                summary,
                description: Some(extract_entries_text(m.get("entries"))),
                tags: vec!["5eTools".to_string(), "Бестиарий".to_string(), source],
                stats: Some(stats),
                actions: if actions.is_empty() { None } else { Some(actions) },
                traits: if traits.is_empty() { None } else { Some(traits) },
                spells: None,
                items: None,
                table_data: None,
                pdf_source: None,
                raw_content: Some(m.clone()),
                suggested_filename: format!("{}.json", sanitize_filename(&name)),
            });
        }
    }

    // 2. Spells
    if let Some(spells) = json.get("spell").and_then(|s| s.as_array()) {
        for (idx, sp) in spells.iter().enumerate() {
            let name = sp.get("name").and_then(|n| n.as_str()).unwrap_or("Заклинание").to_string();
            let level = sp.get("level").and_then(|l| l.as_i64()).unwrap_or(0) as i32;
            let school = sp.get("school").and_then(|s| s.as_str()).unwrap_or("universal").to_string();
            let desc = clean_5etools_string(&extract_entries_text(sp.get("entries")));

            entities.push(UniversalParsedEntity {
                id: format!("5etools-spell-{}-{}", idx, sanitize_id(&name)),
                name: name.clone(),
                original_name: Some(name.clone()),
                category: "spells".to_string(),
                source_format: "5etools_spell".to_string(),
                source_system: Some("D&D 5e".to_string()),
                summary: format!("Круг {} • Школа {}", level, school),
                description: Some(desc),
                tags: vec!["5eTools".to_string(), "Заклинания".to_string(), format!("Круг {}", level)],
                stats: None,
                actions: None,
                traits: None,
                spells: None,
                items: None,
                table_data: None,
                pdf_source: None,
                raw_content: Some(sp.clone()),
                suggested_filename: format!("{}.json", sanitize_filename(&name)),
            });
        }
    }

    // 3. Items
    if let Some(items) = json.get("item").and_then(|i| i.as_array()) {
        for (idx, it) in items.iter().enumerate() {
            let name = it.get("name").and_then(|n| n.as_str()).unwrap_or("Предмет").to_string();
            let desc = clean_5etools_string(&extract_entries_text(it.get("entries")));
            let rarity = it.get("rarity").and_then(|r| r.as_str()).unwrap_or("обычный");

            entities.push(UniversalParsedEntity {
                id: format!("5etools-item-{}-{}", idx, sanitize_id(&name)),
                name: name.clone(),
                original_name: Some(name.clone()),
                category: "items".to_string(),
                source_format: "5etools_item".to_string(),
                source_system: Some("D&D 5e".to_string()),
                summary: format!("Предмет ({})", rarity),
                description: Some(desc),
                tags: vec!["5eTools".to_string(), "Предметы".to_string(), rarity.to_string()],
                stats: None,
                actions: None,
                traits: None,
                spells: None,
                items: None,
                table_data: None,
                pdf_source: None,
                raw_content: Some(it.clone()),
                suggested_filename: format!("{}.json", sanitize_filename(&name)),
            });
        }
    }

    // 4. Races
    let races_key = if json.get("race").is_some() { "race" } else { "races" };
    if let Some(races) = json.get(races_key).and_then(|r| r.as_array()) {
        for (idx, r) in races.iter().enumerate() {
            let name = r.get("name").and_then(|n| n.as_str()).unwrap_or("Раса").to_string();
            let desc = clean_5etools_string(&extract_entries_text(r.get("entries")));
            let abilities = format_ability_bonuses(r.get("ability"));
            let size = r.get("size").and_then(|s| s.as_str()).unwrap_or("M");

            entities.push(UniversalParsedEntity {
                id: format!("5etools-race-{}-{}", idx, sanitize_id(&name)),
                name: name.clone(),
                original_name: Some(name.clone()),
                category: "races".to_string(),
                source_format: "5etools_compendium".to_string(),
                source_system: Some("D&D 5e".to_string()),
                summary: format!("Размер: {}{}", size, if abilities.is_empty() { "".to_string() } else { format!(", Бонусы: {}", abilities) }),
                description: Some(desc),
                tags: vec!["5eTools".to_string(), "Раса".to_string(), name.clone()],
                stats: None,
                actions: None,
                traits: None,
                spells: None,
                items: None,
                table_data: None,
                pdf_source: None,
                raw_content: Some(r.clone()),
                suggested_filename: format!("{}.json", sanitize_filename(&name)),
            });
        }
    }

    // 5. Subraces
    let subraces_key = if json.get("subrace").is_some() { "subrace" } else { "subraces" };
    if let Some(subraces) = json.get(subraces_key).and_then(|sr| sr.as_array()) {
        for (idx, sr) in subraces.iter().enumerate() {
            let race_name = sr.get("raceName").or_else(|| sr.get("race")).and_then(|n| n.as_str()).unwrap_or("Раса");
            let sub_name = sr.get("name").and_then(|n| n.as_str()).unwrap_or("Подраса");
            let name = if sub_name.to_lowercase().contains(&race_name.to_lowercase()) {
                sub_name.to_string()
            } else {
                format!("{} ({})", race_name, sub_name)
            };
            let desc = clean_5etools_string(&extract_entries_text(sr.get("entries")));
            let abilities = format_ability_bonuses(sr.get("ability"));

            entities.push(UniversalParsedEntity {
                id: format!("5etools-subrace-{}-{}", idx, sanitize_id(&name)),
                name: name.clone(),
                original_name: Some(name.clone()),
                category: "races".to_string(),
                source_format: "5etools_compendium".to_string(),
                source_system: Some("D&D 5e".to_string()),
                summary: format!("Подраса для {}{}", race_name, if abilities.is_empty() { "".to_string() } else { format!(". Бонусы: {}", abilities) }),
                description: Some(desc),
                tags: vec!["5eTools".to_string(), "Подраса".to_string(), race_name.to_string()],
                stats: None,
                actions: None,
                traits: None,
                spells: None,
                items: None,
                table_data: None,
                pdf_source: None,
                raw_content: Some(sr.clone()),
                suggested_filename: format!("{}.json", sanitize_filename(&name)),
            });
        }
    }

    // 6. Pages / Chapters / Book Entries
    let pages_list = json.get("pages").or_else(|| json.get("chapters")).and_then(|p| p.as_array());
    if let Some(pages) = pages_list {
        for (idx, p) in pages.iter().enumerate() {
            let raw_title = p.get("name").or_else(|| p.get("title")).and_then(|n| n.as_str()).unwrap_or("Страница");
            let desc = clean_5etools_string(&extract_entries_text(p.get("entries").or_else(|| p.get("text"))));
            let doc_name = json.get("name").and_then(|n| n.as_str());
            let is_race = is_race_name_or_context(raw_title, doc_name);
            let category = if is_race { "races" } else { "rules" };

            let summary = if desc.len() > 160 {
                format!("{}...", &desc[..160])
            } else {
                desc.clone()
            };

            entities.push(UniversalParsedEntity {
                id: format!("5etools-page-{}-{}", idx, sanitize_id(raw_title)),
                name: raw_title.to_string(),
                original_name: Some(raw_title.to_string()),
                category: category.to_string(),
                source_format: "5etools_compendium".to_string(),
                source_system: Some("D&D 5e".to_string()),
                summary,
                description: Some(desc),
                tags: vec!["5eTools".to_string(), if is_race { "Раса" } else { "Глава" }.to_string(), raw_title.to_string()],
                stats: None,
                actions: None,
                traits: None,
                spells: None,
                items: None,
                table_data: None,
                pdf_source: None,
                raw_content: Some(p.clone()),
                suggested_filename: format!("{}.json", sanitize_filename(raw_title)),
            });
        }
    }

    entities
}

pub fn parse_generic_json_data(json: &Value, filename: Option<&str>, system_id: Option<&str>) -> Vec<UniversalParsedEntity> {
    let mut entities = Vec::new();
    let file_title = filename.unwrap_or("document").replace(".json", "");

    if let Some(obj) = json.as_object() {
        // If object has pages array
        if let Some(pages) = obj.get("pages").and_then(|p| p.as_array()) {
            for (idx, p) in pages.iter().enumerate() {
                let name = p.get("name").or_else(|| p.get("title")).and_then(|n| n.as_str()).unwrap_or("Раздел");
                let desc = extract_entries_text(p.get("entries").or_else(|| p.get("text")));
                let is_race = is_race_name_or_context(name, Some(&file_title));
                let category = if is_race { "races" } else { "rules" };

                entities.push(UniversalParsedEntity {
                    id: format!("generic-page-{}-{}", idx, sanitize_id(name)),
                    name: name.to_string(),
                    original_name: Some(name.to_string()),
                    category: category.to_string(),
                    source_format: "generic_json".to_string(),
                    source_system: system_id.map(|s| s.to_string()),
                    summary: if desc.len() > 160 { format!("{}...", &desc[..160]) } else { desc.clone() },
                    description: Some(desc),
                    tags: vec!["JSON".to_string(), if is_race { "Раса" } else { "Правила" }.to_string()],
                    stats: None,
                    actions: None,
                    traits: None,
                    spells: None,
                    items: None,
                    table_data: None,
                    pdf_source: None,
                    raw_content: Some(p.clone()),
                    suggested_filename: format!("{}.json", sanitize_filename(name)),
                });
            }
            if !entities.is_empty() {
                return entities;
            }
        }

        // Iterate top-level key-value objects
        for (key, val) in obj {
            if val.is_object() || val.is_array() {
                let name = val.get("name").or_else(|| val.get("title")).and_then(|n| n.as_str()).unwrap_or(key);
                let desc = extract_entries_text(Some(val));
                let is_race = is_race_name_or_context(name, Some(&file_title));
                let category = if is_race { "races" } else { "rules" };

                entities.push(UniversalParsedEntity {
                    id: format!("generic-dict-{}", sanitize_id(name)),
                    name: name.to_string(),
                    original_name: Some(name.to_string()),
                    category: category.to_string(),
                    source_format: "generic_json".to_string(),
                    source_system: system_id.map(|s| s.to_string()),
                    summary: if desc.len() > 160 { format!("{}...", &desc[..160]) } else { desc.clone() },
                    description: Some(desc),
                    tags: vec!["JSON".to_string(), if is_race { "Раса" } else { "Справочник" }.to_string()],
                    stats: None,
                    actions: None,
                    traits: None,
                    spells: None,
                    items: None,
                    table_data: None,
                    pdf_source: None,
                    raw_content: Some(val.clone()),
                    suggested_filename: format!("{}.json", sanitize_filename(name)),
                });
            }
        }
    }

    entities
}

fn extract_entries_text(entries: Option<&Value>) -> String {
    let mut out = String::new();
    if let Some(val) = entries {
        if let Some(arr) = val.as_array() {
            for item in arr {
                if let Some(s) = item.as_str() {
                    out.push_str(s);
                    out.push_str("\n\n");
                } else if let Some(obj) = item.as_object() {
                    if let Some(name) = obj.get("name").and_then(|n| n.as_str()) {
                        out.push_str(&format!("**{}**: ", name));
                    }
                    if let Some(sub_entries) = obj.get("entries") {
                        out.push_str(&extract_entries_text(Some(sub_entries)));
                    }
                }
            }
        } else if let Some(s) = val.as_str() {
            out.push_str(s);
        } else if let Some(obj) = val.as_object() {
            if let Some(name) = obj.get("name").and_then(|n| n.as_str()) {
                out.push_str(&format!("### {}\n\n", name));
            }
            if let Some(sub_entries) = obj.get("entries").or_else(|| obj.get("text")) {
                out.push_str(&extract_entries_text(Some(sub_entries)));
            }
        }
    }
    out.trim().to_string()
}

fn sanitize_id(input: &str) -> String {
    input.to_lowercase().chars().map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' }).collect()
}

fn sanitize_filename(input: &str) -> String {
    input.chars().map(|c| if c.is_alphanumeric() || c == '_' || c == '-' || c == ' ' { c } else { '_' }).collect::<String>().trim().replace(' ', "_")
}
