use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedAction {
    pub name: String,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub action_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to_hit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reach: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub range: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub damage: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub damage_type: Option<String>,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedTrait {
    pub name: String,
    pub description: String,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub trait_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedStats {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hp: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_hp: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hit_dice: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ac: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speed: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cr: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub level: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub xp: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub initiative_bonus: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attributes: Option<HashMap<String, serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub saves: Option<HashMap<String, serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skills: Option<HashMap<String, serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub senses: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub languages: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub damage_resistances: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub damage_immunities: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub condition_immunities: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proficiency_bonus: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TableData {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rows: Option<Vec<Vec<String>>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub formula: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub results: Option<Vec<TableResultEntry>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableResultEntry {
    pub range: (i32, i32),
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SpellReference {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub level: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub school: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ItemReference {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantity: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weight: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PdfSourceInfo {
    pub page_number: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_pages: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub section: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UniversalParsedEntity {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_name: Option<String>,
    pub category: String,
    pub source_format: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_system: Option<String>,
    pub summary: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub img: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_img: Option<String>,
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
    pub pdf_source: Option<PdfSourceInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_content: Option<serde_json::Value>,
    pub suggested_filename: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UniversalParseStats {
    pub characters_count: usize,
    pub monsters_count: usize,
    pub spells_count: usize,
    pub items_count: usize,
    pub rules_count: usize,
    pub tables_count: usize,
    pub other_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UniversalParseResult {
    pub success: bool,
    pub source_format: String,
    pub format_description: String,
    pub total_entities_found: usize,
    pub entities: Vec<UniversalParsedEntity>,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub stats: UniversalParseStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemDataItemRust {
    pub id: String,
    pub system_id: String,
    pub category: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    pub format: String,
    pub file_size: u64,
    pub mtime: u64,
    pub relative_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub success: bool,
    pub imported_count: usize,
    pub skipped_count: usize,
    pub system_id: String,
    pub created_files: Vec<String>,
    pub errors: Vec<String>,
}
