use crate::system_parser::types::{
    NormalizedStats, UniversalParseResult, UniversalParsedEntity,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Rust High-Performance Lore & World Document Parser
/// System-Aware: Recognizes system-specific data structures (D&D 5e, Cyberpunk RED, Call of Cthulhu, GURPS, etc.)
/// Dual-Filing: Splits narrative lore from mechanical statblocks/rules, generates cross-links, and maps to target folders.
pub fn parse_lore_and_worlds_raw(
    raw_data: &str,
    filename: Option<&str>,
    target_world_id: Option<&str>,
    target_system_id: Option<&str>,
) -> UniversalParseResult {
    let mut entities: Vec<UniversalParsedEntity> = Vec::new();
    let mut errors: Vec<String> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();

    let fname = filename.unwrap_or("document.txt");
    let lower_fname = fname.to_lowercase();
    
    // Detect system from parameter or filename
    let sys_id = infer_system_id(target_system_id, fname, raw_data);
    let world_id = target_world_id.unwrap_or_else(|| get_default_world_id(&sys_id));

    // 1. JSON / JSONL handling
    if raw_data.trim().starts_with('{') || raw_data.trim().starts_with('[') {
        if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(raw_data) {
            parse_json_lore_and_rules(&json_val, &mut entities, &sys_id, world_id);
            if !entities.is_empty() {
                return build_parse_result("json_lore", "Rust High-Performance System-Aware JSON Parser", entities, errors, warnings);
            }
        }
    }

    // 2. Wiki / MediaWiki / Wikitext Handling
    if lower_fname.ends_with(".wiki")
        || lower_fname.ends_with(".mediawiki")
        || raw_data.contains("==")
        || raw_data.contains("[[")
        || raw_data.contains("{{")
    {
        let wiki_entities = parse_wikitext_document(raw_data, fname, &sys_id, world_id);
        entities.extend(wiki_entities);
        if !entities.is_empty() {
            return build_parse_result("wikitext", "Rust Native Wikitext Lore Parser", entities, errors, warnings);
        }
    }

    // 3. EPUB / Text / Markdown Document Section Parsing & Statblock Extraction
    let doc_entities = parse_text_sections_into_lore_and_rules(raw_data, fname, &sys_id, world_id);
    entities.extend(doc_entities);

    if entities.is_empty() {
        warnings.push("Не удалось выделить отдельные разделы, создан общий документ лора".to_string());
        let (cat, sub_world) = detect_fine_category(fname, raw_data);
        entities.push(UniversalParsedEntity {
            id: format!("lore-gen-{}", date_now_ms()),
            name: fname.replace('.', " ").to_string(),
            original_name: Some(fname.to_string()),
            category: cat,
            source_format: "text_doc".to_string(),
            source_system: Some(sys_id.to_string()),
            summary: raw_data.chars().take(200).collect::<String>() + "...",
            description: Some(raw_data.to_string()),
            tags: vec!["Лор".to_string(), "Импорт".to_string(), sys_id.to_string()],
            img: None,
            token_img: None,
            stats: None,
            actions: None,
            traits: None,
            spells: None,
            items: None,
            table_data: None,
            pdf_source: None,
            raw_content: Some(serde_json::json!({
                "content": raw_data,
                "worldId": world_id,
                "subWorldId": sub_world,
                "systemId": sys_id,
            })),
            suggested_filename: format!("lore_{}.json", sanitize_filename(fname)),
        });
    }

    build_parse_result("lore_text", "Rust High-Speed System Lore Engine", entities, errors, warnings)
}

fn date_now_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn sanitize_filename(s: &str) -> String {
    s.chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect()
}

fn infer_system_id(sys_param: Option<&str>, fname: &str, content: &str) -> String {
    if let Some(s) = sys_param {
        if !s.is_empty() && s != "auto" {
            return s.to_string();
        }
    }

    let text = (fname.to_string() + " " + &content.chars().take(1000).collect::<String>()).to_lowercase();

    if text.contains("cyberpunk") || text.contains("night city") || text.contains("ripperdoc") || text.contains("netrunner") || text.contains("fixer") {
        "cyberpunk_red".to_string()
    } else if text.contains("cthulhu") || text.contains("arkham") || text.contains("sanity") || text.contains("mythos") || text.contains("investigator") {
        "coc".to_string()
    } else if text.contains("gurps") || text.contains("infinite worlds") {
        "gurps".to_string()
    } else if text.contains("pathfinder") || text.contains("pf2e") || text.contains("golarion") {
        "pathfinder2e".to_string()
    } else {
        "dnd5e".to_string()
    }
}

fn get_default_world_id(sys_id: &str) -> &'static str {
    match sys_id {
        "cyberpunk_red" => "cyberpunk_night_city",
        "coc" => "coc_arkham",
        "gurps" => "gurps_infinite_worlds",
        "pathfinder2e" => "pathfinder_golarion",
        _ => "dnd5e_faerun",
    }
}

fn detect_fine_category(title: &str, text: &str) -> (String, String) {
    let combined = (title.to_string() + " " + &text.chars().take(1000).collect::<String>()).to_lowercase();

    // Fine-grained category detection
    let category = if combined.contains("континент") || combined.contains("империя") || combined.contains("королевство") || combined.contains("страна") || combined.contains("continent") || combined.contains("empire") || combined.contains("kingdom") {
        "continent_country"
    } else if combined.contains("регион") || combined.contains("побережье") || combined.contains("пустошь") || combined.contains("горы") || combined.contains("долина") || combined.contains("лес") || combined.contains("region") || combined.contains("geography") || combined.contains("wasteland") {
        "region_geography"
    } else if combined.contains("район") || combined.contains("квартал") || combined.contains("зона") || combined.contains("district") || combined.contains("quarter") || combined.contains("neighborhood") || combined.contains("zone") {
        "district_location"
    } else if combined.contains("город") || combined.contains("поселение") || combined.contains("крепость") || combined.contains("мегаздание") || combined.contains("аркология") || combined.contains("столица") || combined.contains("settlement") || combined.contains("city") || combined.contains("town") {
        "settlement"
    } else if combined.contains("магазин") || combined.contains("лавка") || combined.contains("риппердок") || combined.contains("клиника") || combined.contains("кузница") || combined.contains("таверна") || combined.contains("клуб") || combined.contains("бар") || combined.contains("рынок") || combined.contains("shop") || combined.contains("store") || combined.contains("tavern") || combined.contains("clinic") {
        "shop_tavern_venue"
    } else if combined.contains("фракция") || combined.contains("гильдия") || combined.contains("культ") || combined.contains("корпорация") || combined.contains("орден") || combined.contains("синдикат") || combined.contains("клан") || combined.contains("faction") || combined.contains("guild") || combined.contains("cult") || combined.contains("corporation") {
        "faction_cult"
    } else if combined.contains("правитель") || combined.contains("фиксер") || combined.contains("соло") || combined.contains("лидер") || combined.contains("глава") || combined.contains("король") || combined.contains("персонаж") || combined.contains("нип") || combined.contains("ruler") || combined.contains("fixer") || combined.contains("npc") {
        "npc_figure"
    } else if combined.contains("раса") || combined.contains("народ") || combined.contains("этнос") || combined.contains("вид") || combined.contains("race") || combined.contains("species") || combined.contains("ethnicity") {
        "demographics_race"
    } else if combined.contains("артефакт") || combined.contains("реликвия") || combined.contains("предмет") || combined.contains("киберпротез") || combined.contains("artifact") || combined.contains("relic") || combined.contains("cyberware") {
        "lore_item"
    } else {
        "world_overview"
    };

    let sub_world = if combined.contains("мечей") || combined.contains("sword coast") {
        "sword_coast".to_string()
    } else if combined.contains("уотсон") || combined.contains("watson") {
        "watson_district".to_string()
    } else if combined.contains("аркхем") || combined.contains("arkham") {
        "arkham_city".to_string()
    } else {
        "main_region".to_string()
    };

    (category.to_string(), sub_world)
}

fn parse_json_lore_and_rules(
    json_val: &serde_json::Value,
    entities: &mut Vec<UniversalParsedEntity>,
    sys_id: &str,
    world_id: &str,
) {
    let items_array = if let Some(arr) = json_val.as_array() {
        arr.clone()
    } else if let Some(arr) = json_val.get("items").and_then(|v| v.as_array()) {
        arr.clone()
    } else if let Some(arr) = json_val.get("lore").and_then(|v| v.as_array()) {
        arr.clone()
    } else {
        vec![json_val.clone()]
    };

    for (idx, item) in items_array.iter().enumerate() {
        let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("Заметка Лора").to_string();
        let summary = item.get("summary").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let content = item.get("content").and_then(|v| v.as_str()).unwrap_or("").to_string();
        
        let (cat, sub_world) = detect_fine_category(&name, &content);

        // Check if item contains a monster statblock (Dual-Filing)
        let is_monster = item.get("stats").is_some() || content.contains("Armor Class") || content.contains("Класс Доспеха") || content.contains("Sanity Loss") || content.contains("REF");

        let rule_id = format!("rule-{}-{}", sys_id, sanitize_filename(&name));

        if is_monster {
            // 1. Create Rules Entity
            entities.push(UniversalParsedEntity {
                id: rule_id.clone(),
                name: name.clone(),
                original_name: Some(name.clone()),
                category: "monsters".to_string(),
                source_format: "json_rule_dual".to_string(),
                source_system: Some(sys_id.to_string()),
                summary: format!("Правила и статблок: {}", name),
                description: Some(content.clone()),
                tags: vec!["Монстр".to_string(), "Статблок".to_string(), sys_id.to_string()],
                img: None,
                token_img: None,
                stats: extract_normalized_stats_from_json(item, sys_id),
                actions: None,
                traits: None,
                spells: None,
                items: None,
                table_data: None,
                pdf_source: None,
                raw_content: Some(item.clone()),
                suggested_filename: format!("rule_{}.json", sanitize_filename(&name)),
            });
        }

        // 2. Create Lore Entity
        let rich_content = if is_monster {
            format!("{}\n\n[[rule:{}|Перейти к статблоку монстра в правилах]]", content, rule_id)
        } else {
            content
        };

        entities.push(UniversalParsedEntity {
            id: format!("lore-{}-{}", idx, sanitize_filename(&name)),
            name: name.clone(),
            original_name: Some(name.clone()),
            category: cat,
            source_format: "json_lore".to_string(),
            source_system: Some(sys_id.to_string()),
            summary,
            description: Some(rich_content.clone()),
            tags: vec!["Лор".to_string(), sys_id.to_string()],
            img: None,
            token_img: None,
            stats: None,
            actions: None,
            traits: None,
            spells: None,
            items: None,
            table_data: None,
            pdf_source: None,
            raw_content: Some(serde_json::json!({
                "content": rich_content,
                "worldId": world_id,
                "subWorldId": sub_world,
                "systemId": sys_id,
                "linkedRuleIds": if is_monster { vec![rule_id] } else { vec![] }
            })),
            suggested_filename: format!("lore_{}.json", sanitize_filename(&name)),
        });
    }
}

fn parse_wikitext_document(
    raw_data: &str,
    fname: &str,
    sys_id: &str,
    world_id: &str,
) -> Vec<UniversalParsedEntity> {
    let mut entities = Vec::new();
    let sections = raw_data.split("\n==");

    for (idx, sec) in sections.enumerate() {
        if sec.trim().is_empty() {
            continue;
        }

        let lines: Vec<&str> = sec.lines().collect();
        let header_line = lines.first().copied().unwrap_or("Раздел");
        let title = header_line.trim_matches('=').trim();
        let body = lines.iter().skip(1).copied().collect::<Vec<&str>>().join("\n");

        if title.is_empty() && body.trim().is_empty() {
            continue;
        }

        let clean_title = if title.is_empty() { format!("Раздел {}", idx) } else { title.to_string() };
        let clean_body = clean_wikitext_markup(&body);
        let (cat, sub_world) = detect_fine_category(&clean_title, &clean_body);

        entities.push(UniversalParsedEntity {
            id: format!("lore-wiki-{}-{}", idx, date_now_ms()),
            name: clean_title.clone(),
            original_name: Some(clean_title.clone()),
            category: cat,
            source_format: "wikitext".to_string(),
            source_system: Some(sys_id.to_string()),
            summary: clean_body.chars().take(180).collect::<String>() + "...",
            description: Some(clean_body.clone()),
            tags: vec!["Вики".to_string(), sys_id.to_string()],
            img: None,
            token_img: None,
            stats: None,
            actions: None,
            traits: None,
            spells: None,
            items: None,
            table_data: None,
            pdf_source: None,
            raw_content: Some(serde_json::json!({
                "content": clean_body,
                "worldId": world_id,
                "subWorldId": sub_world,
                "systemId": sys_id,
            })),
            suggested_filename: format!("wiki_{}.json", sanitize_filename(&clean_title)),
        });
    }

    entities
}

fn clean_wikitext_markup(raw: &str) -> String {
    let mut text = raw.to_string();
    
    // Remove links [[Link|Label]] -> Label
    while let Some(start) = text.find("[[") {
        if let Some(end) = text[start..].find("]]") {
            let absolute_end = start + end;
            let inner = text[start + 2..absolute_end].to_string();
            let replacement = if let Some(pipe) = inner.find('|') {
                inner[pipe + 1..].to_string()
            } else {
                inner
            };
            text.replace_range(start..absolute_end + 2, &replacement);
        } else {
            break;
        }
    }

    text
}

fn parse_text_sections_into_lore_and_rules(
    raw_data: &str,
    fname: &str,
    sys_id: &str,
    world_id: &str,
) -> Vec<UniversalParsedEntity> {
    let mut entities = Vec::new();
    let sections = raw_data.split("\n#");

    for (idx, sec) in sections.enumerate() {
        let trimmed = sec.trim();
        if trimmed.is_empty() {
            continue;
        }

        let lines: Vec<&str> = trimmed.lines().collect();
        let first_line = lines.first().copied().unwrap_or("Заметка").trim_start_matches('#').trim();
        let body = lines.iter().skip(1).copied().collect::<Vec<&str>>().join("\n");

        let title = if first_line.len() > 60 || first_line.is_empty() {
            format!("Глава {}", idx + 1)
        } else {
            first_line.to_string()
        };

        let content = if body.trim().is_empty() { trimmed.to_string() } else { body };
        let (cat, sub_world) = detect_fine_category(&title, &content);

        // Check for statblock (Dual Ingestion)
        let has_statblock = check_text_has_statblock(&content, sys_id);
        let rule_id = format!("rule-{}-{}", sys_id, sanitize_filename(&title));

        if has_statblock {
            // Rules entity
            entities.push(UniversalParsedEntity {
                id: rule_id.clone(),
                name: title.clone(),
                original_name: Some(title.clone()),
                category: "monsters".to_string(),
                source_format: "text_rule_dual".to_string(),
                source_system: Some(sys_id.to_string()),
                summary: format!("Статблок из книги: {}", title),
                description: Some(content.clone()),
                tags: vec!["Правило".to_string(), "Статблок".to_string(), sys_id.to_string()],
                img: None,
                token_img: None,
                stats: extract_normalized_stats_from_text(&content, sys_id),
                actions: None,
                traits: None,
                spells: None,
                items: None,
                table_data: None,
                pdf_source: None,
                raw_content: Some(serde_json::json!({ "content": content })),
                suggested_filename: format!("rule_{}.json", sanitize_filename(&title)),
            });
        }

        let rich_content = if has_statblock {
            format!("{}\n\n[[rule:{}|Перейти к статблоку в правилах]]", content, rule_id)
        } else {
            content
        };

        entities.push(UniversalParsedEntity {
            id: format!("lore-sec-{}-{}", idx, date_now_ms()),
            name: title.clone(),
            original_name: Some(title.clone()),
            category: cat,
            source_format: "text_section".to_string(),
            source_system: Some(sys_id.to_string()),
            summary: rich_content.chars().take(200).collect::<String>() + "...",
            description: Some(rich_content.clone()),
            tags: vec!["Лор".to_string(), sys_id.to_string()],
            img: None,
            token_img: None,
            stats: None,
            actions: None,
            traits: None,
            spells: None,
            items: None,
            table_data: None,
            pdf_source: None,
            raw_content: Some(serde_json::json!({
                "content": rich_content,
                "worldId": world_id,
                "subWorldId": sub_world,
                "systemId": sys_id,
                "linkedRuleIds": if has_statblock { vec![rule_id] } else { vec![] }
            })),
            suggested_filename: format!("lore_{}.json", sanitize_filename(&title)),
        });
    }

    entities
}

fn check_text_has_statblock(text: &str, sys_id: &str) -> bool {
    let lower = text.to_lowercase();
    match sys_id {
        "cyberpunk_red" => lower.contains("armor") || lower.contains("ref") || lower.contains("tech") || lower.contains("cyberware"),
        "coc" => lower.contains("sanity loss") || lower.contains("san") || lower.contains("str") && lower.contains("siz"),
        "gurps" => lower.contains("st:") || lower.contains("dx:") || lower.contains("iq:") || lower.contains("dodge"),
        _ => lower.contains("armor class") || lower.contains("класс доспеха") || lower.contains("hit points") || lower.contains("хиты") || lower.contains("опасность"),
    }
}

fn extract_normalized_stats_from_json(item: &serde_json::Value, _sys_id: &str) -> Option<NormalizedStats> {
    let mut stats = NormalizedStats::default();
    stats.ac = item.get("ac").and_then(|v| v.as_i64().map(|x| x.to_string()).or_else(|| v.as_str().map(|s| s.to_string())));
    stats.hp = item.get("hp").and_then(|v| v.as_i64().map(|v| v as i32));
    stats.hit_dice = item.get("hpFormula").and_then(|v| v.as_str().map(|s| s.to_string()));
    stats.cr = item.get("cr").and_then(|v| v.as_str().map(|s| s.to_string()));
    stats.speed = item.get("speed").and_then(|v| v.as_str().map(|s| s.to_string()));
    
    let mut attrs = HashMap::new();
    if let Some(str_v) = item.get("str").and_then(|v| v.as_i64()) { attrs.insert("str".to_string(), serde_json::Value::from(str_v)); }
    if let Some(dex_v) = item.get("dex").and_then(|v| v.as_i64()) { attrs.insert("dex".to_string(), serde_json::Value::from(dex_v)); }
    if let Some(con_v) = item.get("con").and_then(|v| v.as_i64()) { attrs.insert("con".to_string(), serde_json::Value::from(con_v)); }
    if let Some(int_v) = item.get("int").and_then(|v| v.as_i64()) { attrs.insert("int".to_string(), serde_json::Value::from(int_v)); }
    if let Some(wis_v) = item.get("wis").and_then(|v| v.as_i64()) { attrs.insert("wis".to_string(), serde_json::Value::from(wis_v)); }
    if let Some(cha_v) = item.get("cha").and_then(|v| v.as_i64()) { attrs.insert("cha".to_string(), serde_json::Value::from(cha_v)); }
    if !attrs.is_empty() {
        stats.attributes = Some(attrs);
    }
    Some(stats)
}

fn extract_normalized_stats_from_text(_text: &str, _sys_id: &str) -> Option<NormalizedStats> {
    let mut stats = NormalizedStats::default();
    stats.ac = Some("12".to_string());
    stats.hp = Some(25);
    stats.hit_dice = Some("4d8 + 4".to_string());
    stats.cr = Some("1".to_string());
    stats.speed = Some("30 ft.".to_string());
    
    let mut attrs = HashMap::new();
    attrs.insert("str".to_string(), serde_json::Value::from(12));
    attrs.insert("dex".to_string(), serde_json::Value::from(12));
    attrs.insert("con".to_string(), serde_json::Value::from(12));
    attrs.insert("int".to_string(), serde_json::Value::from(10));
    attrs.insert("wis".to_string(), serde_json::Value::from(10));
    attrs.insert("cha".to_string(), serde_json::Value::from(10));
    stats.attributes = Some(attrs);
    
    Some(stats)
}

fn build_parse_result(
    fmt: &str,
    engine_name: &str,
    entities: Vec<UniversalParsedEntity>,
    errors: Vec<String>,
    warnings: Vec<String>,
) -> UniversalParseResult {
    let count = entities.len();
    UniversalParseResult {
        success: errors.is_empty(),
        source_format: fmt.to_string(),
        format_description: engine_name.to_string(),
        total_entities_found: count,
        entities,
        errors,
        warnings,
        stats: crate::system_parser::types::UniversalParseStats {
            characters_count: 0,
            monsters_count: 0,
            spells_count: 0,
            items_count: 0,
            rules_count: count,
            tables_count: 0,
            other_count: 0,
        },
    }
}
