pub mod assets;
pub mod camera;
pub mod commands;
pub mod crypto;
pub mod dice;
pub mod drawing;
pub mod fog;
pub mod grid;
pub mod initiative;
pub mod lighting;
pub mod noise;
pub mod physics;
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
            commands::calculate_vision_polygon,
            commands::calculate_dynamic_lighting,
            commands::detect_grid_alignment,
            commands::snap_coordinates_to_grid,
            commands::process_elemental_clashes,
            commands::attach_effect_node,
            commands::generate_procedural_mist
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

