use super::types::{NormalizedAction, NormalizedStats, UniversalParsedEntity};
use serde_json::Value;
use std::collections::HashMap;

pub fn parse_roll20_sheet(json: &Value, filename: Option<&str>) -> Vec<UniversalParsedEntity> {
    let mut entities = Vec::new();

    let name = json
        .get("name")
        .and_then(|n| n.as_str())
        .unwrap_or_else(|| filename.unwrap_or("Roll20 Character"))
        .to_string();

    let mut attr_map: HashMap<String, String> = HashMap::new();
    if let Some(attribs) = json.get("attribs").or_else(|| json.get("attributes")).and_then(|a| a.as_array()) {
        for attr in attribs {
            if let Some(attr_name) = attr.get("name").and_then(|n| n.as_str()) {
                let current_val = attr.get("current").map(|v| {
                    if let Some(s) = v.as_str() {
                        s.to_string()
                    } else {
                        v.to_string()
                    }
                }).unwrap_or_default();
                attr_map.insert(attr_name.to_lowercase(), current_val);
            }
        }
    }

    let mut stats = NormalizedStats::default();

    if let Some(hp_str) = attr_map.get("hp").or_else(|| attr_map.get("hitpoints")) {
        if let Ok(hp_num) = hp_str.parse::<i32>() {
            stats.hp = Some(hp_num);
        }
    }
    if let Some(ac_str) = attr_map.get("ac").or_else(|| attr_map.get("armor_class")) {
        stats.ac = Some(ac_str.clone());
    }

    let mut abilities = HashMap::new();
    for attr in ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] {
        if let Some(val_str) = attr_map.get(attr) {
            if let Ok(num) = val_str.parse::<i32>() {
                let short_k = &attr[0..3];
                abilities.insert(short_k.to_string(), serde_json::json!(num));
            }
        }
    }
    if !abilities.is_empty() {
        stats.attributes = Some(abilities);
    }

    let mut actions = Vec::new();
    for (key, val) in &attr_map {
        if key.starts_with("repeating_attack_") && key.ends_with("_atkname") {
            let prefix = key.replace("_atkname", "");
            let dmg = attr_map.get(&format!("{}_dmgbase", prefix)).cloned().unwrap_or_default();
            actions.push(NormalizedAction {
                name: val.clone(),
                action_type: Some("attack".to_string()),
                to_hit: None,
                reach: None,
                range: None,
                damage: if dmg.is_empty() { None } else { Some(dmg) },
                damage_type: None,
                description: format!("Roll20 Атака: {}", val),
                cost: None,
            });
        }
    }

    let summary = format!(
        "Персонаж Roll20 • HP {} • AC {}",
        stats.hp.map(|h| h.to_string()).unwrap_or_else(|| "—".to_string()),
        stats.ac.as_deref().unwrap_or("—")
    );

    entities.push(UniversalParsedEntity {
        id: format!("roll20-char-{}", sanitize_id(&name)),
        name: name.clone(),
        original_name: Some(name.clone()),
        category: "characters".to_string(),
        source_format: "roll20_character".to_string(),
        source_system: Some("Roll20 Sheet".to_string()),
        summary,
        description: json.get("bio").or_else(|| json.get("gmnotes")).and_then(|v| v.as_str()).map(|s| s.to_string()),
        tags: vec!["Roll20".to_string(), "Персонаж".to_string()],
        stats: Some(stats),
        actions: if actions.is_empty() { None } else { Some(actions) },
        traits: None,
        spells: None,
        items: None,
        table_data: None,
        pdf_source: None,
        raw_content: Some(json.clone()),
        suggested_filename: format!("{}.json", sanitize_filename(&name)),
    });

    entities
}

fn sanitize_id(input: &str) -> String {
    input.to_lowercase().chars().map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' }).collect()
}

fn sanitize_filename(input: &str) -> String {
    input.chars().map(|c| if c.is_alphanumeric() || c == '_' || c == '-' || c == ' ' { c } else { '_' }).collect::<String>().trim().replace(' ', "_")
}
