use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point2D {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraFrame {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub rotation: f64,
    pub zoom: f64,
    pub is_locked: bool,
    pub aspect_ratio: f64,
}

impl Default for CameraFrame {
    fn default() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            width: 1920.0,
            height: 1080.0,
            rotation: 0.0,
            zoom: 1.0,
            is_locked: false,
            aspect_ratio: 16.0 / 9.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraTransform {
    pub scale_x: f64,
    pub scale_y: f64,
    pub translate_x: f64,
    pub translate_y: f64,
    pub rotation: f64,
    pub css_transform: String,
    pub inverse_matrix: [f64; 6],
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FogPoint {
    pub x: f64,
    pub y: f64,
    pub radius: f64,
    #[serde(rename = "type")]
    pub point_type: String, // "reveal" | "conceal"
    pub opacity: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FogPolygon {
    pub id: String,
    pub points: Vec<Point2D>,
    #[serde(rename = "type")]
    pub poly_type: String, // "reveal" | "conceal"
    pub feather: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrawStroke {
    pub id: String,
    pub points: Vec<Point2D>,
    pub color: String,
    pub width: f64,
    pub opacity: f64,
    pub mode: String, // "brush" | "eraser" | "laser"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpellTemplate {
    pub id: String,
    pub name: String,
    pub shape: String, // "circle" | "cone" | "ray" | "cube"
    pub origin: Point2D,
    pub target: Point2D,
    pub radius: f64,
    pub angle: f64,
    pub color: String,
    pub texture_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Combatant {
    pub id: String,
    pub name: String,
    pub initiative: i32,
    pub hp: i32,
    pub max_hp: i32,
    pub ac: i32,
    pub is_player: bool,
    pub is_visible_to_players: bool,
    pub avatar_url: Option<String>,
    pub conditions: Vec<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpatialItem {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub layer: Option<String>,
    pub z_index: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpatialQueryResult {
    pub visible_ids: Vec<String>,
    pub items: Vec<SpatialItem>,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiceRollResult {
    pub total: i32,
    pub rolls: Vec<i32>,
    pub modifier: i32,
    pub is_crit: bool,
    pub is_fumble: bool,
    pub breakdown: String,
    pub formatted: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiceDistributionResult {
    pub expression: String,
    pub iterations: u32,
    pub min: i32,
    pub max: i32,
    pub average: f64,
    pub standard_deviation: f64,
    pub crit_percentage: f64,
    pub histogram: std::collections::BTreeMap<i32, u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisionWall {
    pub p1: Point2D,
    pub p2: Point2D,
    pub blocks_vision: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectNode {
    pub x: f64,
    pub y: f64,
    pub r: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimatedEffectItem {
    pub id: String,
    #[serde(rename = "type")]
    pub effect_type: String, // "fire" | "water" | "mist" | "acid" | "lightning"
    pub x: f64,
    pub y: f64,
    pub radius: f64,
    pub intensity: f64,
    pub nodes: Option<Vec<EffectNode>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SteamVaporEvent {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub radius: f64,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementalClashResult {
    pub updated_effects: Vec<AnimatedEffectItem>,
    pub steam_events: Vec<SteamVaporEvent>,
    pub message: Option<String>,
}

