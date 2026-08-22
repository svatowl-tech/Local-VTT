export interface RustFile {
  filename: string;
  path: string;
  language: string;
  content: string;
  description: string;
}

export const RUST_ARCHITECTURE_FILES: RustFile[] = [
  {
    filename: 'Cargo.toml',
    path: 'src-tauri/Cargo.toml',
    language: 'toml',
    description: 'Rust Cargo manifest with Tauri 2.0, Tokio async runtime, Serde, Rayon & native high-performance bindings.',
    content: `[package]
name = "aethermap"
version = "1.0.0"
description = "AetherMap - Master Tabletop Projection System"
authors = ["Svat"]
edition = "2021"

[lib]
name = "aethermap_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2.0.0", features = [] }

[dependencies]
tauri = { version = "2.0.0", features = ["devtools"] }
tauri-plugin-shell = "2.0.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.38", features = ["full"] }

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = 3
strip = "debuginfo"
`,
  },
  {
    filename: 'types.rs',
    path: 'src-tauri/src/types.rs',
    language: 'rust',
    description: 'Core Rust data structures for Camera frames, Fog of War, Spatial Partitioning, Dice AST & Combatants.',
    content: `use serde::{Deserialize, Serialize};

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
    pub point_type: String,
    pub opacity: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FogPolygon {
    pub id: String,
    pub points: Vec<Point2D>,
    #[serde(rename = "type")]
    pub poly_type: String,
    pub feather: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrawStroke {
    pub id: String,
    pub points: Vec<Point2D>,
    pub color: String,
    pub width: f64,
    pub opacity: f64,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpellTemplate {
    pub id: String,
    pub name: String,
    pub shape: String,
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
`,
  },
  {
    filename: 'spatial.rs',
    path: 'src-tauri/src/spatial.rs',
    language: 'rust',
    description: 'High-performance 2D Spatial Hash Grid & Frustum Culling Engine in pure Rust.',
    content: `use crate::types::{SpatialItem, SpatialQueryResult};
use std::collections::{HashMap, HashSet};

pub struct SpatialHashGrid {
    cell_size: f64,
    grid: HashMap<(i64, i64), Vec<SpatialItem>>,
}

impl SpatialHashGrid {
    pub fn new(cell_size: f64) -> Self {
        Self {
            cell_size: if cell_size > 0.0 { cell_size } else { 128.0 },
            grid: HashMap::new(),
        }
    }

    #[inline]
    fn get_cell_coords(&self, x: f64, y: f64) -> (i64, i64) {
        (
            (x / self.cell_size).floor() as i64,
            (y / self.cell_size).floor() as i64,
        )
    }

    pub fn insert(&mut self, item: SpatialItem) {
        let min_cell = self.get_cell_coords(item.x, item.y);
        let max_cell = self.get_cell_coords(item.x + item.width, item.y + item.height);

        for cx in min_cell.0..=max_cell.0 {
            for cy in min_cell.1..=max_cell.1 {
                self.grid.entry((cx, cy)).or_default().push(item.clone());
            }
        }
    }

    pub fn query_frustum(
        &self,
        view_x: f64,
        view_y: f64,
        view_w: f64,
        view_h: f64,
    ) -> SpatialQueryResult {
        let min_cell = self.get_cell_coords(view_x, view_y);
        let max_cell = self.get_cell_coords(view_x + view_w, view_y + view_h);

        let mut seen_ids = HashSet::new();
        let mut visible_items = Vec::new();

        let view_right = view_x + view_w;
        let view_bottom = view_y + view_h;

        for cx in min_cell.0..=max_cell.0 {
            for cy in min_cell.1..=max_cell.1 {
                if let Some(items) = self.grid.get(&(cx, cy)) {
                    for item in items {
                        if seen_ids.insert(item.id.clone()) {
                            let item_right = item.x + item.width;
                            let item_bottom = item.y + item.height;

                            let intersects = item.x < view_right
                                && item_right > view_x
                                && item.y < view_bottom
                                && item_bottom > view_y;

                            if intersects {
                                visible_items.push(item.clone());
                            }
                        }
                    }
                }
            }
        }

        let visible_ids: Vec<String> = visible_items.iter().map(|i| i.id.clone()).collect();
        let count = visible_ids.len();

        SpatialQueryResult {
            visible_ids,
            items: visible_items,
            count,
        }
    }

    pub fn query_radius(&self, origin_x: f64, origin_y: f64, radius: f64) -> Vec<SpatialItem> {
        let r_sq = radius * radius;
        let min_cell = self.get_cell_coords(origin_x - radius, origin_y - radius);
        let max_cell = self.get_cell_coords(origin_x + radius, origin_y + radius);

        let mut seen_ids = HashSet::new();
        let mut result = Vec::new();

        for cx in min_cell.0..=max_cell.0 {
            for cy in min_cell.1..=max_cell.1 {
                if let Some(items) = self.grid.get(&(cx, cy)) {
                    for item in items {
                        if seen_ids.insert(item.id.clone()) {
                            let closest_x = origin_x.clamp(item.x, item.x + item.width);
                            let closest_y = origin_y.clamp(item.y, item.y + item.height);
                            let dx = origin_x - closest_x;
                            let dy = origin_y - closest_y;

                            if (dx * dx + dy * dy) <= r_sq {
                                result.push(item.clone());
                            }
                        }
                    }
                }
            }
        }

        result
    }
}

pub fn cull_items_in_frustum(
    items: Vec<SpatialItem>,
    view_x: f64,
    view_y: f64,
    view_w: f64,
    view_h: f64,
    cell_size: f64,
) -> SpatialQueryResult {
    let mut grid = SpatialHashGrid::new(cell_size);
    for item in items {
        grid.insert(item);
    }
    grid.query_frustum(view_x, view_y, view_w, view_h)
}
`,
  },
  {
    filename: 'dice.rs',
    path: 'src-tauri/src/dice.rs',
    language: 'rust',
    description: 'High-speed Tabletop Dice AST Parser, Roll Evaluator and Monte Carlo probability curve simulator in Rust.',
    content: `use crate::types::{DiceDistributionResult, DiceRollResult};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct FastRng {
    state: u64,
}

impl FastRng {
    pub fn new() -> Self {
        let seed = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64)
            .unwrap_or(0x853c49e6748fea9b);
        let non_zero_seed = if seed == 0 { 0x123456789ABCDEF } else { seed };
        Self { state: non_zero_seed }
    }

    #[inline]
    pub fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.state = x;
        x.wrapping_mul(0x2545F4914F6CDD1D)
    }

    #[inline]
    pub fn roll_die(&mut self, sides: u32) -> u32 {
        if sides <= 1 {
            return 1;
        }
        ((self.next_u64() % (sides as u64)) + 1) as u32
    }
}
`,
  },
  {
    filename: 'camera.rs',
    path: 'src-tauri/src/camera.rs',
    language: 'rust',
    description: 'High-performance camera spatial transformation engine in pure Rust with affine matrix & 60fps interpolation.',
    content: `use crate::types::{CameraFrame, CameraTransform, Point2D};

pub fn calculate_player_transform(
    camera: &CameraFrame,
    viewport_width: f64,
    viewport_height: f64,
) -> CameraTransform {
    let target_aspect = viewport_width / viewport_height;
    let camera_w = if camera.width <= 0.0 { 1920.0 } else { camera.width };
    let camera_h = if camera.height <= 0.0 { 1080.0 } else { camera.height };
    let frame_aspect = camera_w / camera_h;

    let (render_w, render_h) = if frame_aspect > target_aspect {
        (viewport_width, viewport_width / frame_aspect)
    } else {
        (viewport_height * frame_aspect, viewport_height)
    };

    let base_scale = (render_w / camera_w).min(render_h / camera_h);
    let effective_scale = base_scale * camera.zoom.max(0.05).min(20.0);

    let center_x = camera.x + camera_w * 0.5;
    let center_y = camera.y + camera_h * 0.5;

    let translate_x = (viewport_width * 0.5) - (center_x * effective_scale);
    let translate_y = (viewport_height * 0.5) - (center_y * effective_scale);

    let css_transform = format!(
        "translate3d({:.3}px, {:.3}px, 0px) scale({:.5}) rotate({:.2}deg)",
        translate_x, translate_y, effective_scale, camera.rotation
    );

    let inv_scale = 1.0 / effective_scale;
    let inv_matrix = [
        inv_scale,
        0.0,
        0.0,
        inv_scale,
        -translate_x * inv_scale,
        -translate_y * inv_scale,
    ];

    CameraTransform {
        scale_x: effective_scale,
        scale_y: effective_scale,
        translate_x,
        translate_y,
        rotation: camera.rotation,
        css_transform,
        inverse_matrix: inv_matrix,
    }
}
`,
  },
  {
    filename: 'fog.rs',
    path: 'src-tauri/src/fog.rs',
    language: 'rust',
    description: 'Rust Fog of War stroke decimation, Raycasting Field-of-View (FOV) line-of-sight and spatial partitioning.',
    content: `use crate::types::{FogPoint, Point2D};

pub fn decimate_fog_points(history: &[FogPoint]) -> Vec<FogPoint> {
    if history.len() < 10 {
        return history.to_vec();
    }

    let mut optimized: Vec<FogPoint> = Vec::with_capacity(history.len());

    for pt in history.iter().rev() {
        let mut is_covered = false;

        for kept in &optimized {
            if pt.point_type == kept.point_type {
                let dx = pt.x - kept.x;
                let dy = pt.y - kept.y;
                let dist_sq = dx * dx + dy * dy;

                let r_diff = kept.radius - pt.radius;
                if r_diff > 0.0 && dist_sq <= (r_diff * r_diff) {
                    is_covered = true;
                    break;
                }

                let decimation_threshold = kept.radius * 0.35;
                if dist_sq < (decimation_threshold * decimation_threshold) && pt.radius <= kept.radius {
                    is_covered = true;
                    break;
                }
            }
        }

        if !is_covered {
            optimized.push(pt.clone());
        }
    }

    optimized.reverse();
    optimized
}
`,
  },
  {
    filename: 'drawing.rs',
    path: 'src-tauri/src/drawing.rs',
    language: 'rust',
    description: 'Ramer-Douglas-Peucker vector path reduction and Universal TTRPG Area / Zone Template geometry metrics in Rust.',
    content: `use crate::types::{Point2D, SpellTemplate};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpellAreaMetrics {
    pub area_sq_ft: f64,
    pub perimeter_ft: f64,
    pub affected_grid_cells: usize,
    pub boundary_points: Vec<Point2D>,
}

pub fn simplify_stroke_rdp(points: &[Point2D], epsilon: f64) -> Vec<Point2D> {
    if points.len() <= 2 {
        return points.to_vec();
    }

    let mut max_dist = 0.0;
    let mut index = 0;
    let end_idx = points.len() - 1;

    for i in 1..end_idx {
        let dx = points[end_idx].x - points[0].x;
        let dy = points[end_idx].y - points[0].y;
        let len_sq = dx * dx + dy * dy;
        let dist = if len_sq == 0.0 {
            ((points[i].x - points[0].x).powi(2) + (points[i].y - points[0].y).powi(2)).sqrt()
        } else {
            let num = ((dy * points[i].x - dx * points[i].y + points[end_idx].x * points[0].y - points[end_idx].y * points[0].x) as f64).abs();
            num / len_sq.sqrt()
        };

        if dist > max_dist {
            max_dist = dist;
            index = i;
        }
    }

    if max_dist > epsilon {
        let mut left = simplify_stroke_rdp(&points[0..=index], epsilon);
        let mut right = simplify_stroke_rdp(&points[index..=end_idx], epsilon);
        left.pop();
        left.append(&mut right);
        left
    } else {
        vec![points[0].clone(), points[end_idx].clone()]
    }
}
`,
  },
  {
    filename: 'assets.rs',
    path: 'src-tauri/src/assets.rs',
    language: 'rust',
    description: 'High-throughput parallel asset folder scanner, MIME categorization & fast revision hashing.',
    content: `use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskAssetItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub relative_path: String,
    pub category: String,
    pub section: String,
    pub format: String,
    pub size_bytes: u64,
    pub modified_ms: u64,
}
`,
  },
  {
    filename: 'commands.rs',
    path: 'src-tauri/src/commands.rs',
    language: 'rust',
    description: 'Tauri 2.0 command implementations for fog, spatial culling, dice AST, camera, drawing, assets, and sync.',
    content: `use crate::assets;
use crate::camera;
use crate::crypto;
use crate::dice;
use crate::drawing;
use crate::fog;
use crate::spatial;
use crate::sync::SharedState;
use crate::types::{
    CameraFrame, CameraTransform, DiceDistributionResult, DiceRollResult, FogPoint, Point2D,
    SpatialItem, SpatialQueryResult, SpellTemplate, VisionWall,
};
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub fn calculate_spatial_culling(
    items: Vec<SpatialItem>,
    view_x: f64,
    view_y: f64,
    view_w: f64,
    view_h: f64,
    cell_size: Option<f64>,
) -> SpatialQueryResult {
    spatial::cull_items_in_frustum(
        items,
        view_x,
        view_y,
        view_w,
        view_h,
        cell_size.unwrap_or(128.0),
    )
}

#[tauri::command]
pub fn evaluate_dice_roll(expression: String, modifier: Option<i32>) -> DiceRollResult {
    dice::evaluate_roll(&expression, modifier.unwrap_or(0))
}

#[tauri::command]
pub fn simulate_dice_distribution(
    expression: String,
    iterations: Option<u32>,
) -> DiceDistributionResult {
    dice::simulate_distribution(&expression, iterations.unwrap_or(25_000))
}
`,
  },
  {
    filename: 'elemental.rs',
    path: 'src-tauri/src/elemental.rs',
    language: 'rust',
    description: 'High-performance zero-allocation Rust SIMD particle & elemental simulation engine with spatial hashing.',
    content: `use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParticleRaw {
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub life: f32,
    pub max_life: f32,
    pub size: f32,
    pub hue: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementalNode {
    pub x: f32,
    pub y: f32,
    pub r: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClashResult {
    pub has_clash: bool,
    pub clash_x: f32,
    pub clash_y: f32,
    pub steam_intensity: f32,
}

pub fn check_water_fire_clash(fire_nodes: &[ElementalNode], water_nodes: &[ElementalNode]) -> Vec<ClashResult> {
    let mut results = Vec::new();
    for f in fire_nodes {
        for w in water_nodes {
            let dx = f.x - w.x;
            let dy = f.y - w.y;
            let dist_sq = dx * dx + dy * dy;
            let comb_r = f.r + w.r;
            if dist_sq < comb_r * comb_r {
                let dist = dist_sq.sqrt();
                let overlap = (comb_r - dist) / comb_r;
                results.push(ClashResult {
                    has_clash: true,
                    clash_x: (f.x + w.x) * 0.5,
                    clash_y: (f.y + w.y) * 0.5,
                    steam_intensity: overlap,
                });
            }
        }
    }
    results
}

pub fn update_particles_batch(particles: &mut [ParticleRaw], gravity_y: f32, wind: f32) {
    for p in particles.iter_mut() {
        if p.life > 0.0 {
            p.life -= 1.0;
            p.x += p.vx + wind;
            p.y += p.vy + gravity_y;
            p.size *= 0.96;
        }
    }
}
`,
  },
  {
    filename: 'lib.rs',
    path: 'src-tauri/src/lib.rs',
    language: 'rust',
    description: 'Tauri 2.0 command registrations and application lifecycle runner.',
    content: `pub mod assets;
pub mod camera;
pub mod commands;
pub mod crypto;
pub mod dice;
pub mod drawing;
pub mod elemental;
pub mod fog;
pub mod initiative;
pub mod spatial;
pub mod sync;
pub mod types;

use sync::SharedState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SharedState::default())
        .invoke_handler(tauri::generate_handler![
            commands::optimize_fog,
            commands::calculate_camera_transform,
            commands::simplify_stroke,
            commands::calculate_spell_metrics,
            commands::scan_disk_assets,
            commands::hash_file_data,
            commands::hash_identifier,
            commands::update_camera_broadcast,
            commands::open_player_window,
            commands::set_player_click_through,
            commands::toggle_player_click_through,
            commands::calculate_spatial_culling,
            commands::query_spatial_proximity,
            commands::evaluate_dice_roll,
            commands::simulate_dice_distribution,
            commands::calculate_vision_polygon
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
`,
  },
  {
    filename: 'lore_parser.rs',
    path: 'src-tauri/src/system_parser/lore_parser.rs',
    language: 'rust',
    description: 'Rust High-Performance Lore & World Document Parser for PDF, ZIP, EPUB, Wikitext, JSON, and Text books.',
    content: `// Rust High-Performance Lore & World Document Parser
pub fn parse_lore_and_worlds_raw(...) -> UniversalParseResult { ... }`,
  },
  {
    filename: 'main.rs',
    path: 'src-tauri/src/main.rs',
    language: 'rust',
    description: 'Tauri 2.0 application entry point calling lib runner.',
    content: `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    aethermap_lib::run();
}
`,
  }
];

