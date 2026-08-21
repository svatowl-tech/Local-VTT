use crate::types::{SpatialItem, SpatialQueryResult};
use std::collections::{HashMap, HashSet};

/// High-Performance 2D Spatial Hash Grid for Virtual Tabletop objects
/// Reduces O(N^2) proximity & collision checks to O(1) bucket lookups
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

    /// Inserts a spatial item across all cells it overlaps
    pub fn insert(&mut self, item: SpatialItem) {
        let min_cell = self.get_cell_coords(item.x, item.y);
        let max_cell = self.get_cell_coords(item.x + item.width, item.y + item.height);

        for cx in min_cell.0..=max_cell.0 {
            for cy in min_cell.1..=max_cell.1 {
                self.grid.entry((cx, cy)).or_default().push(item.clone());
            }
        }
    }

    /// Queries all unique items that intersect with a given AABB viewport box (Camera Frustum Culling)
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
                            // Exact AABB intersection check
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

    /// Queries items within a circle radius of an origin point (e.g. aura, spell trigger, token distance)
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
                            // Find closest point on item's AABB to circle origin
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

/// Static helper to perform rapid frustum culling on a list of items
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
