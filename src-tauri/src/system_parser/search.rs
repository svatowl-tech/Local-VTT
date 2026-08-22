use crate::system_parser::disk_scanner;
use crate::system_parser::types::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemReferenceSearchQuery {
    pub query: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub systems_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemReferenceSearchItem {
    pub id: String,
    pub system_id: String,
    pub system_name: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_name: Option<String>,
    pub category: String,
    pub format: String,
    pub summary: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
    pub score: i32,
    pub match_type: String,
    pub tags: Vec<String>,
    pub relative_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stats: Option<NormalizedStats>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actions: Option<Vec<NormalizedAction>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub traits: Option<Vec<NormalizedTrait>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spells: Option<Vec<SpellReference>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub items: Option<Vec<ItemReference>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub table_data: Option<TableData>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemReferenceSearchResult {
    pub success: bool,
    pub query: String,
    pub total_matches: usize,
    pub elapsed_ms: f64,
    pub engine: String,
    pub category_counts: HashMap<String, usize>,
    pub results: Vec<SystemReferenceSearchItem>,
}

/// Ultra-fast search across systems files and parsed entities
pub fn search_reference_data(
    query_params: SystemReferenceSearchQuery,
) -> SystemReferenceSearchResult {
    let start_time = Instant::now();
    let query_clean = query_params.query.trim().to_lowercase();
    let limit = query_params.limit.unwrap_or(60);

    let systems_dir_str = query_params
        .systems_dir
        .unwrap_or_else(|| "assets/systems".to_string());
    let base_path = Path::new(&systems_dir_str);

    let scanned_items = disk_scanner::scan_systems_directory(
        base_path,
        query_params.system_id.as_deref(),
    )
    .unwrap_or_default();

    let mut matched_items: Vec<SystemReferenceSearchItem> = Vec::new();
    let mut category_counts: HashMap<String, usize> = HashMap::new();

    let is_empty_query = query_clean.is_empty();
    let query_tokens: Vec<&str> = query_clean.split_whitespace().collect();

    for item in scanned_items {
        // Filter by category if requested
        if let Some(ref req_cat) = query_params.category {
            if req_cat != "all" && req_cat != "" && !item.category.eq_ignore_ascii_case(req_cat) {
                continue;
            }
        }

        let mut score = 0;
        let mut match_type = "none".to_string();
        let mut snippet: Option<String> = None;

        let name_lower = item.name.to_lowercase();
        let summary_text = item.summary.clone().unwrap_or_default();
        let summary_lower = summary_text.to_lowercase();

        // Extract internal components if JSON data
        let mut stats: Option<NormalizedStats> = None;
        let mut actions: Option<Vec<NormalizedAction>> = None;
        let mut traits: Option<Vec<NormalizedTrait>> = None;
        let mut spells: Option<Vec<SpellReference>> = None;
        let mut items_ref: Option<Vec<ItemReference>> = None;
        let mut table_data: Option<TableData> = None;
        let mut original_name: Option<String> = None;

        if let Some(ref data) = item.data {
            if let Ok(st) = serde_json::from_value::<NormalizedStats>(
                data.get("stats").cloned().unwrap_or(serde_json::Value::Null),
            ) {
                if st.hp.is_some() || st.ac.is_some() || st.cr.is_some() {
                    stats = Some(st);
                }
            }

            if let Some(act_val) = data.get("actions") {
                if let Ok(acts) = serde_json::from_value::<Vec<NormalizedAction>>(act_val.clone()) {
                    actions = Some(acts);
                }
            }

            if let Some(tr_val) = data.get("traits").or_else(|| data.get("abilities")) {
                if let Ok(trs) = serde_json::from_value::<Vec<NormalizedTrait>>(tr_val.clone()) {
                    traits = Some(trs);
                }
            }

            if let Some(sp_val) = data.get("spells") {
                if let Ok(sps) = serde_json::from_value::<Vec<SpellReference>>(sp_val.clone()) {
                    spells = Some(sps);
                }
            }

            if let Some(it_val) = data.get("items") {
                if let Ok(its) = serde_json::from_value::<Vec<ItemReference>>(it_val.clone()) {
                    items_ref = Some(its);
                }
            }

            if let Some(tbl_val) = data.get("tableData") {
                if let Ok(tbl) = serde_json::from_value::<TableData>(tbl_val.clone()) {
                    table_data = Some(tbl);
                }
            }

            if let Some(orig) = data.get("originalName").and_then(|v| v.as_str()) {
                original_name = Some(orig.to_string());
            }
        }

        if is_empty_query {
            score = 100;
            match_type = "browse".to_string();
        } else {
            // 1. Exact match
            if name_lower == query_clean {
                score += 1000;
                match_type = "exact_title".to_string();
            } else if name_lower.starts_with(&query_clean) {
                // 2. Starts with query
                score += 600;
                match_type = "prefix_title".to_string();
            } else if name_lower.contains(&query_clean) {
                // 3. Substring in title
                score += 350;
                match_type = "substring_title".to_string();
            } else {
                // 4. Token matching in title
                let mut all_tokens_in_name = true;
                let mut token_matches = 0;
                for t in &query_tokens {
                    if name_lower.contains(t) {
                        token_matches += 1;
                    } else {
                        all_tokens_in_name = false;
                    }
                }

                if all_tokens_in_name && !query_tokens.is_empty() {
                    score += 250 + (token_matches * 30);
                    match_type = "tokens_title".to_string();
                } else if token_matches > 0 {
                    score += token_matches * 40;
                    match_type = "partial_title".to_string();
                }
            }

            // 5. Tags matching
            for tag in &item.tags {
                let tag_lower = tag.to_lowercase();
                if tag_lower == query_clean {
                    score += 200;
                    if match_type == "none" {
                        match_type = "exact_tag".to_string();
                    }
                } else if tag_lower.contains(&query_clean) {
                    score += 80;
                    if match_type == "none" {
                        match_type = "tag".to_string();
                    }
                }
            }

            // 6. Summary / Description matching
            if summary_lower.contains(&query_clean) {
                score += 70;
                if match_type == "none" {
                    match_type = "summary".to_string();
                }
                // Generate snippet
                if let Some(pos) = summary_lower.find(&query_clean) {
                    let start = pos.saturating_sub(40);
                    let end = (pos + query_clean.len() + 80).min(summary_text.len());
                    let mut snip = summary_text[start..end].to_string();
                    if start > 0 {
                        snip = format!("...{}", snip);
                    }
                    if end < summary_text.len() {
                        snip = format!("{}...", snip);
                    }
                    snippet = Some(snip);
                }
            }

            // 7. Stats matching (e.g. "cr 1/4", "ac 15", "fireball")
            if let Some(ref st) = stats {
                if let Some(ref cr) = st.cr {
                    if cr.to_lowercase().contains(&query_clean) || format!("cr {}", cr).to_lowercase().contains(&query_clean) {
                        score += 90;
                        if match_type == "none" {
                            match_type = "stat_cr".to_string();
                        }
                    }
                }
                if let Some(ref senses) = st.senses {
                    if senses.to_lowercase().contains(&query_clean) {
                        score += 50;
                    }
                }
            }

            // 8. Actions matching
            if let Some(ref acts) = actions {
                for act in acts {
                    let act_name_lower = act.name.to_lowercase();
                    if act_name_lower.contains(&query_clean) {
                        score += 80;
                        if match_type == "none" {
                            match_type = "action_name".to_string();
                        }
                        if snippet.is_none() {
                            snippet = Some(format!("Действие «{}»: {}", act.name, act.description));
                        }
                    } else if act.description.to_lowercase().contains(&query_clean) {
                        score += 40;
                    }
                }
            }

            // 9. Traits matching
            if let Some(ref trs) = traits {
                for tr in trs {
                    if tr.name.to_lowercase().contains(&query_clean) {
                        score += 60;
                        if match_type == "none" {
                            match_type = "trait_name".to_string();
                        }
                        if snippet.is_none() {
                            snippet = Some(format!("Особенность «{}»: {}", tr.name, tr.description));
                        }
                    }
                }
            }

            // 10. Deep JSON search if score is still zero
            if score == 0 {
                if let Some(ref data) = item.data {
                    let data_str = data.to_string().to_lowercase();
                    if data_str.contains(&query_clean) {
                        score += 30;
                        match_type = "deep_content".to_string();
                    }
                }
            }
        }

        // If matched
        if score > 0 {
            *category_counts.entry(item.category.clone()).or_insert(0) += 1;

            let system_name = match item.system_id.as_str() {
                "dnd5e" => "D&D 5e".to_string(),
                "pathfinder2e" => "Pathfinder 2e".to_string(),
                "cyberpunk_red" => "Cyberpunk RED".to_string(),
                "gurps" => "GURPS".to_string(),
                "call_of_cthulhu" => "Call of Cthulhu".to_string(),
                _ => item.system_id.clone(),
            };

            matched_items.push(SystemReferenceSearchItem {
                id: item.id,
                system_id: item.system_id,
                system_name,
                name: item.name,
                original_name,
                category: item.category,
                format: item.format,
                summary: summary_text,
                snippet,
                score,
                match_type,
                tags: item.tags,
                relative_path: item.relativePath,
                stats,
                actions,
                traits,
                spells,
                items: items_ref,
                table_data,
                data: item.data,
            });
        }
    }

    let total_matches = matched_items.len();

    // Sort by highest score first, then alphabetically by name
    matched_items.sort_by(|a, b| {
        b.score
            .cmp(&a.score)
            .then_with(|| a.name.cmp(&b.name))
    });

    if matched_items.len() > limit {
        matched_items.truncate(limit);
    }

    let elapsed = start_time.elapsed().as_secs_f64() * 1000.0;
    let elapsed_ms = (elapsed * 100.0).round() / 100.0;

    SystemReferenceSearchResult {
        success: true,
        query: query_params.query,
        total_matches,
        elapsed_ms,
        engine: "Rust Native Engine (Tauri)".to_string(),
        category_counts,
        results: matched_items,
    }
}
