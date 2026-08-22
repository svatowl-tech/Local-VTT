use crate::system_parser::types::{UniversalParseResult, UniversalParsedEntity};

pub fn clean_html_and_macros(input: &str) -> String {
    if input.is_empty() {
        return String::new();
    }
    let mut s = input.to_string();

    // 1. Clean HTML headings
    s = s.replace("<h1>", "\n# ").replace("</h1>", "\n\n")
         .replace("<h2>", "\n## ").replace("</h2>", "\n\n")
         .replace("<h3>", "\n### ").replace("</h3>", "\n\n")
         .replace("<h4>", "\n#### ").replace("</h4>", "\n\n");

    // 2. Clean HTML formatting
    s = s.replace("<p>", "").replace("</p>", "\n\n")
         .replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
         .replace("<strong>", "**").replace("</strong>", "**")
         .replace("<b>", "**").replace("</b>", "**")
         .replace("<em>", "*").replace("</em>", "*")
         .replace("<i>", "*").replace("</i>", "*")
         .replace("<li>", "- ").replace("</li>", "\n")
         .replace("<ul>", "\n").replace("</ul>", "\n")
         .replace("<ol>", "\n").replace("</ol>", "\n");

    // 3. Remove any remaining HTML tags <...>
    let mut clean_no_html = String::with_capacity(s.len());
    let mut in_tag = false;
    for ch in s.chars() {
        if ch == '<' {
            in_tag = true;
        } else if ch == '>' {
            in_tag = false;
        } else if !in_tag {
            clean_no_html.push(ch);
        }
    }
    s = clean_no_html;

    // 4. Clean VTT Macros (@Embed[...], @UUID[...], @Compendium[...])
    while let Some(start) = s.find("@Embed[") {
        if let Some(end) = s[start..].find(']') {
            s.replace_range(start..=start + end, "*[Встроенный раздел правил]*");
        } else {
            break;
        }
    }

    while let Some(start) = s.find("@UUID[") {
        if let Some(end) = s[start..].find(']') {
            let inner = &s[start + 6..start + end];
            let label = inner.split('.').last().unwrap_or("Ссылка").to_string();
            s.replace_range(start..=start + end, &label);
        } else {
            break;
        }
    }

    while let Some(start) = s.find("@Compendium[") {
        if let Some(end) = s[start..].find(']') {
            let inner = &s[start + 12..start + end];
            let label = inner.split('.').last().unwrap_or("Компендиум").to_string();
            s.replace_range(start..=start + end, &label);
        } else {
            break;
        }
    }

    // 4b. Clean Foundry VTT Double Bracket Inline Rolls / Enrichers
    // Handle [[something]]{label} -> **label**
    while let Some(start) = s.find("[[") {
        if let Some(end) = s[start..].find("]]") {
            let closing_brackets = start + end;
            // Check if it's followed by `{`
            if s.len() > closing_brackets + 2 && s.as_bytes()[closing_brackets + 2] == b'{' {
                if let Some(label_end) = s[closing_brackets + 2..].find('}') {
                    let label = &s[closing_brackets + 3..closing_brackets + 2 + label_end];
                    s.replace_range(start..=closing_brackets + 2 + label_end, &format!("**{}**", label));
                    continue;
                }
            }
            
            // Otherwise, it's a plain [[something]]
            let content = &s[start + 2..closing_brackets];
            let clean_content = if content.starts_with("/attack") {
                "⚔️ Атака".to_string()
            } else if content.starts_with("/damage") {
                // If it has arguments like /damage 1d6, try to extract formula
                let parts: Vec<&str> = content.split_whitespace().collect();
                if parts.len() > 1 && (parts[1].contains('d') || parts[1].chars().all(|c| c.is_numeric())) {
                    parts[1..].join(" ")
                } else {
                    "💥 Урон".to_string()
                }
            } else if content.starts_with("/check") {
                let parts: Vec<&str> = content.split_whitespace().collect();
                if parts.len() > 1 {
                    format!("Проверка: {}", parts[1..].join(" "))
                } else {
                    "Проверка".to_string()
                }
            } else if content.starts_with("/save") {
                let parts: Vec<&str> = content.split_whitespace().collect();
                if parts.len() > 1 {
                    format!("Спасбросок: {}", parts[1..].join(" "))
                } else {
                    "Спасбросок".to_string()
                }
            } else if content.starts_with("/r ") || content.starts_with("/roll ") {
                let parts: Vec<&str> = content.split_whitespace().collect();
                parts[1..].join(" ")
            } else {
                content.to_string()
            };
            
            s.replace_range(start..=closing_brackets + 1, &clean_content);
        } else {
            break;
        }
    }

    // 5. Clean 5eTools tags {@spell fireball|phb}
    while let Some(start) = s.find("{@") {
        if let Some(end) = s[start..].find('}') {
            let inner = &s[start + 2..start + end];
            let parts: Vec<&str> = inner.split_whitespace().collect();
            let val = if parts.len() > 1 {
                parts[1].split('|').next().unwrap_or(parts[1])
            } else {
                inner
            };
            s.replace_range(start..=start + end, val);
        } else {
            break;
        }
    }

    s.trim().to_string()
}

pub fn evaluate_and_fix_quality(
    mut result: UniversalParseResult,
    _filename: Option<&str>,
    _target_system_id: Option<&str>,
) -> UniversalParseResult {
    if result.entities.is_empty() {
        return result;
    }

    let mut quality_errors = Vec::new();
    let mut quality_warnings = Vec::new();
    let mut raw_code_count = 0;
    let mut new_entities = Vec::new();

    for mut entity in result.entities {
        let (mut is_raw, mut reason) = check_entity_quality(&entity);

        if is_raw {
            // Attempt auto-cleaning HTML and macros
            let cleaned_desc = clean_html_and_macros(entity.description.as_deref().unwrap_or(""));
            let cleaned_sum = clean_html_and_macros(&entity.summary);

            entity.description = Some(cleaned_desc);
            entity.summary = if cleaned_sum.len() > 160 {
                format!("{}...", &cleaned_sum[..160])
            } else {
                cleaned_sum
            };

            let (re_raw, re_reason) = check_entity_quality(&entity);
            if !re_raw {
                quality_warnings.push(format!(
                    "[Авто-исправление] Сущность «{}» с сырым HTML/макрокодом очищена и преобразована в Markdown.",
                    entity.name
                ));
                new_entities.push(entity);
                continue;
            }

            is_raw = re_raw;
            reason = re_reason;
        }

        if is_raw {
            raw_code_count += 1;
            quality_errors.push(format!(
                "[Детектор качества парсинга] Ошибка в сущности «{}»: {}",
                entity.name,
                reason.unwrap_or_else(|| "Неизвестная причина".to_string())
            ));
        }

        new_entities.push(entity);
    }

    result.entities = new_entities;
    result.errors.extend(quality_errors);
    result.warnings.extend(quality_warnings);

    // If all entities are raw code dumps, mark parsing as failed
    if raw_code_count > 0 && (result.entities.is_empty() || result.entities.iter().all(|e| check_entity_quality(e).0)) {
        result.success = false;
        result.errors.insert(
            0,
            format!(
                "ПАРСИНГ НЕУДАЧЕН: Найдено {} сырых текстовых/JSON дампов кода вместо человекочитаемых карточек данных.",
                raw_code_count
            ),
        );
    } else {
        result.success = result.entities.iter().any(|e| !check_entity_quality(e).0);
    }

    result
}

pub fn check_entity_quality(entity: &UniversalParsedEntity) -> (bool, Option<String>) {
    let name = entity.name.trim();
    let desc = entity.description.as_deref().unwrap_or("").trim();
    let summary = entity.summary.trim();

    // 1. Invalid or syntax name
    if name.is_empty() || name == "[object Object]" || name == "undefined" || name == "null" {
        return (
            true,
            Some("Имя сущности содержит синтаксический мусор или пустую строку".to_string()),
        );
    }
    if name.starts_with('{') || name.starts_with('[') || name.contains("\":") {
        return (
            true,
            Some("Имя сущности является необработанной JSON/YAML строкой".to_string()),
        );
    }

    // 2. Raw JSON string in description or summary
    let is_json_str = |s: &str| {
        let trimmed = s.trim();
        (trimmed.starts_with('{') && trimmed.ends_with('}'))
            || (trimmed.starts_with('[') && trimmed.ends_with(']'))
            || trimmed.starts_with("```json")
            || trimmed.starts_with("```yaml")
    };

    if is_json_str(desc) {
        return (
            true,
            Some("Описание (description) является сырым неоформленным дамп-кодом JSON/YAML".to_string()),
        );
    }

    if is_json_str(summary) && summary.len() > 50 {
        return (
            true,
            Some("Сводка (summary) содержит дамп сырого JSON/YAML кода".to_string()),
        );
    }

    // 3. Raw HTML tags in description
    if desc.contains("<p>") || desc.contains("</p>") || desc.contains("<h2>") || desc.contains("</h2>") || desc.contains("<h3>") || desc.contains("<div>") {
        return (
            true,
            Some("Описание содержит сырые HTML-теги (<p>, <h2> и т.д.) вместо Markdown текста".to_string()),
        );
    }

    // 4. Unparsed VTT macros
    if desc.contains("@Embed[") || desc.contains("@UUID[") || desc.contains("@Compendium[") {
        return (
            true,
            Some("Описание содержит нераспарсенные макросы VTT (@Embed[...], @UUID[...])".to_string()),
        );
    }

    // 5. Fallback unextracted document object
    if let Some(rc) = &entity.raw_content {
        let mut unextracted = Vec::new();
        if rc.get("pages").and_then(|v| v.as_array()).map_or(false, |a| !a.is_empty()) {
            unextracted.push("pages");
        }
        if rc.get("chapters").and_then(|v| v.as_array()).map_or(false, |a| !a.is_empty()) {
            unextracted.push("chapters");
        }
        if rc.get("race").is_some() || rc.get("races").is_some() {
            unextracted.push("races");
        }
        if rc.get("subrace").is_some() || rc.get("subraces").is_some() {
            unextracted.push("subraces");
        }
        if rc.get("class").is_some() || rc.get("classes").is_some() {
            unextracted.push("classes");
        }
        if rc.get("feat").is_some() || rc.get("feats").is_some() {
            unextracted.push("feats");
        }

        if !unextracted.is_empty() && desc.starts_with('{') {
            return (
                true,
                Some(format!(
                    "Сущность содержит нераспакованные коллекции данных [{}] и выведена в виде дампа кода.",
                    unextracted.join(", ")
                )),
            );
        }
    }

    (false, None)
}
