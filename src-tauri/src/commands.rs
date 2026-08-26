use crate::assets;
use crate::camera;
use crate::crypto;
use crate::dice;
use crate::drawing;
use crate::fog;
use crate::grid;
use crate::lighting;
use crate::noise;
use crate::physics;
use crate::spatial;
use crate::sync::SharedState;
use crate::system_parser;
use crate::types::{
    AnimatedEffectItem, CameraFrame, CameraTransform, DiceDistributionResult, DiceRollResult,
    EffectNode, ElementalClashResult, FogPoint, Point2D, SpatialItem, SpatialQueryResult,
    SpellTemplate, VisionWall,
};
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub fn process_elemental_clashes(effects: Vec<AnimatedEffectItem>) -> ElementalClashResult {
    physics::process_elemental_clashes(effects)
}

#[tauri::command]
pub fn attach_effect_node(
    effect: AnimatedEffectItem,
    new_node: EffectNode,
    min_dist: Option<f64>,
    max_connect_dist: Option<f64>,
) -> (AnimatedEffectItem, bool) {
    physics::attach_node(
        effect,
        new_node,
        min_dist.unwrap_or(18.0),
        max_connect_dist.unwrap_or(140.0),
    )
}

#[tauri::command]
pub fn generate_procedural_mist(
    size: usize,
    octaves: Option<usize>,
    r: u8,
    g: u8,
    b: u8,
    seed: Option<u64>,
) -> Vec<u8> {
    let gen = noise::FractalNoiseGenerator::new(seed.unwrap_or(42));
    gen.generate_mist_texture_rgba(size, octaves.unwrap_or(4), r, g, b)
}

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
pub fn query_spatial_proximity(
    items: Vec<SpatialItem>,
    origin_x: f64,
    origin_y: f64,
    radius: f64,
    cell_size: Option<f64>,
) -> Vec<SpatialItem> {
    let mut grid = spatial::SpatialHashGrid::new(cell_size.unwrap_or(128.0));
    for item in items {
        grid.insert(item);
    }
    grid.query_radius(origin_x, origin_y, radius)
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

#[tauri::command]
pub fn calculate_vision_polygon(
    origin: Point2D,
    radius: f64,
    num_rays: Option<usize>,
    walls: Vec<VisionWall>,
) -> Vec<Point2D> {
    let wall_segments: Vec<(Point2D, Point2D)> = walls
        .into_iter()
        .filter(|w| w.blocks_vision)
        .map(|w| (w.p1, w.p2))
        .collect();

    fog::calculate_fov_polygon(&origin, radius, num_rays.unwrap_or(180), &wall_segments)
}

#[tauri::command]
pub fn optimize_fog(history: Vec<FogPoint>) -> Vec<FogPoint> {
    fog::decimate_fog_points(&history)
}

#[tauri::command]
pub fn calculate_camera_transform(
    camera: CameraFrame,
    viewport_width: f64,
    viewport_height: f64,
) -> CameraTransform {
    camera::calculate_player_transform(&camera, viewport_width, viewport_height)
}

#[tauri::command]
pub fn simplify_stroke(points: Vec<Point2D>, epsilon: f64) -> Vec<Point2D> {
    drawing::simplify_stroke_rdp(&points, epsilon)
}

#[tauri::command]
pub fn calculate_spell_metrics(
    template: SpellTemplate,
    grid_size_px: f64,
) -> drawing::SpellAreaMetrics {
    drawing::calculate_spell_template_metrics(&template, grid_size_px)
}

#[tauri::command]
pub fn scan_disk_assets(root_path: String) -> Result<assets::DiskScanSummary, String> {
    let path = Path::new(&root_path);
    assets::scan_assets_folder(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hash_file_data(name: String, size: u64) -> String {
    crypto::fast_hash_string(&format!("{}:{}", name, size))
}

#[tauri::command]
pub fn hash_identifier(input: String) -> String {
    crypto::fast_hash_string(&input)
}

#[tauri::command]
pub fn update_camera_broadcast(
    camera: CameraFrame,
    app: AppHandle,
    state: State<'_, SharedState>,
) -> Result<CameraTransform, String> {
    let mut session = state.session.lock().map_err(|e| e.to_string())?;
    session.camera = camera.clone();
    session.revision += 1;

    let transform = camera::calculate_player_transform(&camera, 1920.0, 1080.0);

    if let Some(player_win) = app.get_webview_window("player") {
        let _ = player_win.emit("camera-updated", &transform);
    }

    Ok(transform)
}

#[tauri::command]
pub async fn open_player_window(app: AppHandle, click_through: Option<bool>) -> Result<(), String> {
    if let Some(player_win) = app.get_webview_window("player") {
        if let Some(ct) = click_through {
            let _ = player_win.set_ignore_cursor_events(ct);
        }
        let _ = player_win.show();
        let _ = player_win.set_focus();
        return Ok(());
    }

    let win = WebviewWindowBuilder::new(&app, "player", WebviewUrl::App("/?view=player".into()))
        .title("AetherMap - Player Projection Display")
        .inner_size(1920.0, 1080.0)
        .fullscreen(false)
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(ct) = click_through {
        if ct {
            let _ = win.set_ignore_cursor_events(true);
        }
    }

    Ok(())
}

#[tauri::command]
pub fn set_player_click_through(app: AppHandle, ignore_cursor: bool) -> Result<bool, String> {
    let win_opt = app
        .get_webview_window("player")
        .or_else(|| app.get_webview_window("player-window"));

    if let Some(player_win) = win_opt {
        player_win
            .set_ignore_cursor_events(ignore_cursor)
            .map_err(|e| e.to_string())?;
        let _ = player_win.emit("player-click-through-changed", ignore_cursor);
        return Ok(ignore_cursor);
    }

    Err("Player window is not open".into())
}

#[tauri::command]
pub fn toggle_player_click_through(app: AppHandle) -> Result<bool, String> {
    let win_opt = app
        .get_webview_window("player")
        .or_else(|| app.get_webview_window("player-window"));

    if let Some(player_win) = win_opt {
        let _ = player_win.emit("player-click-through-toggle", ());
        return Ok(true);
    }

    Err("Player window is not open".into())
}

#[tauri::command]
pub fn calculate_dynamic_lighting(
    lights: Vec<lighting::LightSource>,
    walls: Vec<VisionWall>,
    num_rays: Option<usize>,
) -> Vec<lighting::ShadowVolume> {
    lighting::compute_dynamic_lighting(&lights, &walls, num_rays)
}

#[tauri::command]
pub fn detect_grid_alignment(
    image_width: f64,
    image_height: f64,
    preferred_cell_size: Option<f64>,
) -> grid::GridDetectionResult {
    grid::calculate_optimal_grid(image_width, image_height, preferred_cell_size)
}

#[tauri::command]
pub fn snap_coordinates_to_grid(
    x: f64,
    y: f64,
    cell_size: f64,
    offset_x: f64,
    offset_y: f64,
    snap_to_center: bool,
) -> (f64, f64) {
    grid::snap_to_grid_cell(x, y, cell_size, offset_x, offset_y, snap_to_center)
}

#[tauri::command]
pub fn parse_system_raw_data(
    data: String,
    format: Option<String>,
    filename: Option<String>,
    default_system: Option<String>,
) -> system_parser::UniversalParseResult {
    system_parser::parse_raw_system_data(
        &data,
        filename.as_deref(),
        format.as_deref(),
        default_system.as_deref(),
    )
}

#[tauri::command]
pub fn parse_system_file(
    file_path: String,
    default_system: Option<String>,
) -> Result<system_parser::UniversalParseResult, String> {
    let path = Path::new(&file_path);
    system_parser::parse_file_on_disk(path, default_system.as_deref())
}

#[tauri::command]
pub fn scan_and_parse_system_directory(
    systems_dir: String,
    system_id: Option<String>,
) -> Result<Vec<system_parser::SystemDataItemRust>, String> {
    let path = Path::new(&systems_dir);
    system_parser::disk_scanner::scan_systems_directory(path, system_id.as_deref())
}

#[tauri::command]
pub fn import_parsed_entities_rust(
    target_dir: String,
    system_id: String,
    entities: Vec<system_parser::UniversalParsedEntity>,
) -> Result<system_parser::ImportResult, String> {
    let path = Path::new(&target_dir);
    system_parser::disk_scanner::import_entities_to_disk(path, &system_id, &entities)
}

#[tauri::command]
pub fn search_system_reference(
    query: String,
    system_id: Option<String>,
    category: Option<String>,
    limit: Option<usize>,
    systems_dir: Option<String>,
) -> system_parser::SystemReferenceSearchResult {
    system_parser::search_reference_data(system_parser::SystemReferenceSearchQuery {
        query,
        system_id,
        category,
        limit,
        systems_dir,
    })
}

#[tauri::command]
pub fn parse_lore_raw_data(
    data: String,
    filename: Option<String>,
    target_world_id: Option<String>,
    target_system_id: Option<String>,
) -> system_parser::UniversalParseResult {
    system_parser::lore_parser::parse_lore_and_worlds_raw(
        &data,
        filename.as_deref(),
        target_world_id.as_deref(),
        target_system_id.as_deref(),
    )
}

#[tauri::command]
pub fn save_lore_item_rust(
    lore_dir: String,
    world_folder: String,
    item_json_str: String,
    filename: String,
) -> Result<system_parser::lore_disk::SaveLoreItemResult, String> {
    let path = Path::new(&lore_dir);
    system_parser::lore_disk::save_lore_item_to_disk_rust(path, &world_folder, &item_json_str, &filename)
}

#[tauri::command]
pub fn delete_lore_item_rust(
    lore_dir: String,
    world_folder: String,
    filename: String,
) -> Result<bool, String> {
    let path = Path::new(&lore_dir);
    system_parser::lore_disk::delete_lore_item_from_disk_rust(path, &world_folder, &filename)
}

#[tauri::command]
pub fn scan_lore_folder_incremental_rust(
    lore_dir: String,
    world_folder: String,
    target_world_id: String,
    target_system_id: String,
    force_reparse: Option<bool>,
) -> Result<system_parser::lore_disk::ScanLoreIncrementalResult, String> {
    let path = Path::new(&lore_dir);
    system_parser::lore_disk::scan_lore_folder_incremental_rust(
        path,
        &world_folder,
        &target_world_id,
        &target_system_id,
        force_reparse.unwrap_or(false),
    )
}




#[tauri::command]
pub fn read_binary_file_rust(file_path: String) -> Result<Vec<u8>, String> {
    use std::fs;
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }
    fs::read(path).map_err(|e| format!("Failed to read file {}: {}", file_path, e))
}

#[tauri::command]
pub fn write_json_file_rust(
    root_path: String,
    sub_path: Vec<String>,
    file_name: String,
    content: String,
) -> Result<String, String> {
    use std::fs;
    use std::path::PathBuf;
    
    let mut path = PathBuf::from(&root_path);
    for sub in sub_path {
        path.push(sub);
    }
    if !path.exists() {
        if let Err(e) = fs::create_dir_all(&path) {
            return Err(format!("Failed to create directories: {}", e));
        }
    }
    path.push(file_name);
    
    match fs::write(&path, content) {
        Ok(_) => Ok(path.to_string_lossy().into_owned()),
        Err(e) => Err(format!("Failed to write file: {}", e)),
    }
}
