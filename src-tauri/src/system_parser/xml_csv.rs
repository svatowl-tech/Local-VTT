use super::types::{TableData, TableResultEntry, UniversalParsedEntity};

pub fn parse_csv_table(raw_data: &str, filename: Option<&str>) -> Vec<UniversalParsedEntity> {
    let mut entities = Vec::new();
    let name = filename
        .unwrap_or("Таблица данных")
        .trim_end_matches(".csv")
        .trim_end_matches(".tsv")
        .replace('_', " ");

    let delimiter = if raw_data.contains('\t') { '\t' } else { ',' };
    let lines: Vec<&str> = raw_data.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();

    if lines.is_empty() {
        return entities;
    }

    let headers: Vec<String> = lines[0]
        .split(delimiter)
        .map(|h| h.trim().trim_matches('"').to_string())
        .collect();

    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut table_results: Vec<TableResultEntry> = Vec::new();

    for (idx, line) in lines.iter().skip(1).enumerate() {
        let cols: Vec<String> = line
            .split(delimiter)
            .map(|c| c.trim().trim_matches('"').to_string())
            .collect();
        rows.push(cols.clone());

        if let Some(first_col) = cols.first() {
            let res_text = cols.get(1).cloned().unwrap_or_else(|| first_col.clone());
            table_results.push(TableResultEntry {
                range: (idx as i32 + 1, idx as i32 + 1),
                text: res_text,
            });
        }
    }

    let summary = format!("Таблица: {} столбцов, {} строк", headers.len(), rows.len());

    entities.push(UniversalParsedEntity {
        id: format!("table-csv-{}", sanitize_id(&name)),
        name: name.clone(),
        original_name: Some(name.clone()),
        category: "tables".to_string(),
        source_format: "csv_table".to_string(),
        source_system: Some("CSV/TSV Table".to_string()),
        summary,
        description: Some(format!("Колонки: {}", headers.join(" | "))),
        tags: vec!["Таблицы".to_string(), "CSV".to_string()],
        stats: None,
        actions: None,
        traits: None,
        spells: None,
        items: None,
        table_data: Some(TableData {
            headers: Some(headers),
            rows: Some(rows),
            formula: Some(format!("1d{}", table_results.len().max(1))),
            results: Some(table_results),
        }),
        pdf_source: None,
        raw_content: None,
        suggested_filename: format!("{}.json", sanitize_filename(&name)),
    });

    entities
}

pub fn parse_xml_gurps(raw_data: &str, filename: Option<&str>) -> Vec<UniversalParsedEntity> {
    let mut entities = Vec::new();
    let name = extract_xml_tag(raw_data, "name")
        .or_else(|| extract_xml_tag(raw_data, "character_name"))
        .unwrap_or_else(|| filename.unwrap_or("GURPS Character").trim_end_matches(".xml").trim_end_matches(".gcs").to_string());

    let st = extract_xml_tag(raw_data, "strength").or_else(|| extract_xml_tag(raw_data, "st"));
    let dx = extract_xml_tag(raw_data, "dexterity").or_else(|| extract_xml_tag(raw_data, "dx"));
    let iq = extract_xml_tag(raw_data, "intelligence").or_else(|| extract_xml_tag(raw_data, "iq"));
    let ht = extract_xml_tag(raw_data, "health").or_else(|| extract_xml_tag(raw_data, "ht"));
    let hp = extract_xml_tag(raw_data, "hit_points").or_else(|| extract_xml_tag(raw_data, "hp"));

    let summary = format!(
        "GURPS • ST: {}, DX: {}, IQ: {}, HT: {} (HP: {})",
        st.as_deref().unwrap_or("10"),
        dx.as_deref().unwrap_or("10"),
        iq.as_deref().unwrap_or("10"),
        ht.as_deref().unwrap_or("10"),
        hp.as_deref().unwrap_or("10")
    );

    entities.push(UniversalParsedEntity {
        id: format!("gurps-char-{}", sanitize_id(&name)),
        name: name.clone(),
        original_name: Some(name.clone()),
        category: "characters".to_string(),
        source_format: "gurps_gcs".to_string(),
        source_system: Some("GURPS 4e".to_string()),
        summary,
        description: Some(format!("XML лист персонажа GURPS Character Assistant / GCS")),
        tags: vec!["GURPS".to_string(), "GCS".to_string(), "Персонаж".to_string()],
        stats: None,
        actions: None,
        traits: None,
        spells: None,
        items: None,
        table_data: None,
        pdf_source: None,
        raw_content: None,
        suggested_filename: format!("{}.json", sanitize_filename(&name)),
    });

    entities
}

fn extract_xml_tag(xml: &str, tag: &str) -> Option<String> {
    let open_tag = format!("<{}>", tag);
    let close_tag = format!("</{}>", tag);
    if let Some(start) = xml.find(&open_tag) {
        if let Some(end) = xml.find(&close_tag) {
            let val = &xml[start + open_tag.len()..end];
            return Some(val.trim().to_string());
        }
    }
    None
}

fn sanitize_id(input: &str) -> String {
    input.to_lowercase().chars().map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' }).collect()
}

fn sanitize_filename(input: &str) -> String {
    input.chars().map(|c| if c.is_alphanumeric() || c == '_' || c == '-' || c == ' ' { c } else { '_' }).collect::<String>().trim().replace(' ', "_")
}
