use super::types::{NormalizedAction, NormalizedStats, NormalizedTrait, UniversalParsedEntity};
use std::collections::HashMap;

pub fn parse_text_statblock(raw_text: &str, filename: Option<&str>) -> Vec<UniversalParsedEntity> {
    let mut entities = Vec::new();
    let lines: Vec<&str> = raw_text.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();

    if lines.is_empty() {
        return entities;
    }

    let default_name = filename
        .unwrap_or("Существо")
        .trim_end_matches(".md")
        .trim_end_matches(".txt")
        .replace('_', " ");

    let mut name = default_name.clone();
    let mut stats = NormalizedStats::default();
    let mut actions = Vec::new();
    let mut traits = Vec::new();

    let mut current_section = "general";

    for (idx, line) in lines.iter().enumerate() {
        if idx == 0 && (line.starts_with("# ") || !line.contains(':')) {
            name = line.trim_start_matches("# ").replace(['*', '#'], "").trim().to_string();
            continue;
        }

        let lower = line.to_lowercase();

        if lower.contains("armor class") || lower.contains("класс доспеха") || lower.starts_with("ac:") || lower.starts_with("кд:") {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() > 1 {
                stats.ac = Some(parts[1].trim().to_string());
            }
        } else if lower.contains("hit points") || lower.contains("хиты") || lower.starts_with("hp:") {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() > 1 {
                let hp_str = parts[1].trim();
                let num_str: String = hp_str.chars().take_while(|c| c.is_ascii_digit()).collect();
                if let Ok(num) = num_str.parse::<i32>() {
                    stats.hp = Some(num);
                    stats.max_hp = Some(num);
                }
                if hp_str.contains('(') && hp_str.contains(')') {
                    if let Some(start) = hp_str.find('(') {
                        if let Some(end) = hp_str.find(')') {
                            stats.hit_dice = Some(hp_str[start + 1..end].to_string());
                        }
                    }
                }
            }
        } else if lower.contains("speed") || lower.contains("скорость") {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() > 1 {
                stats.speed = Some(parts[1].trim().to_string());
            }
        } else if lower.contains("challenge") || lower.contains("опасность") || lower.starts_with("cr:") {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() > 1 {
                stats.cr = Some(parts[1].trim().to_string());
            }
        } else if lower.starts_with("### actions") || lower.starts_with("## actions") || lower == "действия" || lower == "actions" {
            current_section = "actions";
        } else if lower.starts_with("### traits") || lower.starts_with("## traits") || lower == "особенности" || lower == "traits" {
            current_section = "traits";
        } else if line.contains("**") || (line.contains(':') && current_section != "general") {
            let parts: Vec<&str> = line.splitn(2, ':').collect();
            if parts.len() == 2 {
                let item_name = parts[0].replace(['*', '#'], "").trim().to_string();
                let item_desc = parts[1].trim().to_string();

                if current_section == "actions" || lower.contains("hit:") || lower.contains("попадание:") {
                    actions.push(NormalizedAction {
                        name: item_name,
                        action_type: Some("action".to_string()),
                        to_hit: None,
                        reach: None,
                        range: None,
                        damage: None,
                        damage_type: None,
                        description: item_desc,
                        cost: None,
                    });
                } else {
                    traits.push(NormalizedTrait {
                        name: item_name,
                        description: item_desc,
                        trait_type: Some("trait".to_string()),
                    });
                }
            }
        }
    }

    // Try finding ability scores line: STR DEX CON INT WIS CHA
    let mut abilities = HashMap::new();
    for (i, line) in lines.iter().enumerate() {
        if line.contains("STR") && line.contains("DEX") && line.contains("CON") {
            if let Some(vals_line) = lines.get(i + 1) {
                let nums: Vec<&str> = vals_line.split_whitespace().collect();
                let keys = ["str", "dex", "con", "int", "wis", "cha"];
                for (k_idx, key) in keys.iter().enumerate() {
                    if let Some(val_str) = nums.get(k_idx) {
                        let score_str: String = val_str.chars().take_while(|c| c.is_ascii_digit()).collect();
                        if let Ok(score) = score_str.parse::<i32>() {
                            abilities.insert(key.to_string(), serde_json::json!(score));
                        }
                    }
                }
            }
        }
    }
    if !abilities.is_empty() {
        stats.attributes = Some(abilities);
    }

    let summary = format!(
        "CR {} • HP {} • AC {}",
        stats.cr.as_deref().unwrap_or("—"),
        stats.hp.map(|h| h.to_string()).unwrap_or_else(|| "—".to_string()),
        stats.ac.as_deref().unwrap_or("—")
    );

    entities.push(UniversalParsedEntity {
        id: format!("text-statblock-{}", sanitize_id(&name)),
        name: name.clone(),
        original_name: Some(name.clone()),
        category: "monsters".to_string(),
        source_format: "text_statblock".to_string(),
        source_system: Some("Текстовый статблок".to_string()),
        summary,
        description: Some(raw_text.to_string()),
        tags: vec!["Статблок".to_string(), "Монстры".to_string()],
        stats: Some(stats),
        actions: if actions.is_empty() { None } else { Some(actions) },
        traits: if traits.is_empty() { None } else { Some(traits) },
        spells: None,
        items: None,
        table_data: None,
        pdf_source: None,
        raw_content: None,
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
