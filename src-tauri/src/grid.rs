use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GridDetectionResult {
    pub detected_cell_size: f64,
    pub columns: u32,
    pub rows: u32,
    pub offset_x: f64,
    pub offset_y: f64,
    pub confidence: f64,
    pub recommended_ppi: u32,
}

/// Computes the optimal grid alignment and dimensions given map width, height, and optional target tile count
pub fn calculate_optimal_grid(
    image_width: f64,
    image_height: f64,
    preferred_cell_size: Option<f64>,
) -> GridDetectionResult {
    let standard_sizes = [50.0, 70.0, 100.0, 140.0, 200.0, 256.0];
    let mut best_size = preferred_cell_size.unwrap_or(70.0);
    let mut best_remainder = f64::MAX;

    if preferred_cell_size.is_none() {
        for &size in &standard_sizes {
            let rem_w = image_width % size;
            let rem_h = image_height % size;
            let total_rem = rem_w + rem_h;

            if total_rem < best_remainder {
                best_remainder = total_rem;
                best_size = size;
            }
        }
    }

    let cols = (image_width / best_size).round() as u32;
    let rows = (image_height / best_size).round() as u32;

    let offset_x = ((image_width - (cols as f64 * best_size)) * 0.5).max(0.0);
    let offset_y = ((image_height - (rows as f64 * best_size)) * 0.5).max(0.0);

    let confidence = if best_remainder < 10.0 {
        0.95
    } else if best_remainder < 30.0 {
        0.80
    } else {
        0.65
    };

    let ppi = match best_size as u32 {
        size if size <= 60 => 50,
        size if size <= 85 => 70,
        size if size <= 120 => 100,
        size if size <= 160 => 140,
        _ => 200,
    };

    GridDetectionResult {
        detected_cell_size: best_size,
        columns: cols.max(1),
        rows: rows.max(1),
        offset_x,
        offset_y,
        confidence,
        recommended_ppi: ppi,
    }
}

/// Snap coordinates to the nearest grid intersection or center
#[inline]
pub fn snap_to_grid_cell(
    x: f64,
    y: f64,
    cell_size: f64,
    offset_x: f64,
    offset_y: f64,
    snap_to_center: bool,
) -> (f64, f64) {
    if cell_size <= 0.0 {
        return (x, y);
    }

    let rel_x = x - offset_x;
    let rel_y = y - offset_y;

    if snap_to_center {
        let snapped_x = (rel_x / cell_size).floor() * cell_size + (cell_size * 0.5) + offset_x;
        let snapped_y = (rel_y / cell_size).floor() * cell_size + (cell_size * 0.5) + offset_y;
        (snapped_x, snapped_y)
    } else {
        let snapped_x = (rel_x / cell_size).round() * cell_size + offset_x;
        let snapped_y = (rel_y / cell_size).round() * cell_size + offset_y;
        (snapped_x, snapped_y)
    }
}
