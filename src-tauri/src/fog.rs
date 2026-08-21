use crate::types::{FogPoint, Point2D};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FogGridConfig {
    pub width: usize,
    pub height: usize,
    pub cell_size: f64,
}

/// Optimizes fog history by decimating fully occluded or redundant points in reverse chronological order
pub fn decimate_fog_points(history: &[FogPoint]) -> Vec<FogPoint> {
    if history.len() < 10 {
        return history.to_vec();
    }

    let mut optimized: Vec<FogPoint> = Vec::with_capacity(history.len());

    // Traverse from newest to oldest stroke
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

/// Fast Raycasting Field-of-View (FOV) algorithm with ray-segment intersection
pub fn calculate_fov_polygon(
    origin: &Point2D,
    radius: f64,
    num_rays: usize,
    walls: &[(Point2D, Point2D)],
) -> Vec<Point2D> {
    let mut polygon_points: Vec<Point2D> = Vec::with_capacity(num_rays);
    let angle_step = std::f64::consts::TAU / (num_rays as f64);

    for i in 0..num_rays {
        let angle = (i as f64) * angle_step;
        let ray_dir_x = angle.cos();
        let ray_dir_y = angle.sin();

        let mut closest_dist = radius;

        // Check intersection with all wall segments
        for (w_start, w_end) in walls {
            if let Some(dist) = ray_segment_intersect(origin, ray_dir_x, ray_dir_y, w_start, w_end) {
                if dist < closest_dist && dist > 0.0 {
                    closest_dist = dist;
                }
            }
        }

        polygon_points.push(Point2D {
            x: origin.x + ray_dir_x * closest_dist,
            y: origin.y + ray_dir_y * closest_dist,
        });
    }

    polygon_points
}

/// Ray vs Line Segment intersection test
fn ray_segment_intersect(
    ray_origin: &Point2D,
    ray_dir_x: f64,
    ray_dir_y: f64,
    p1: &Point2D,
    p2: &Point2D,
) -> Option<f64> {
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;

    let denom = ray_dir_x * dy - ray_dir_y * dx;
    if denom.abs() < 1e-8 {
        return None;
    }

    let rx = p1.x - ray_origin.x;
    let ry = p1.y - ray_origin.y;

    let t = (rx * dy - ry * dx) / denom;
    let u = (rx * ray_dir_y - ry * ray_dir_x) / denom;

    if t >= 0.0 && (0.0..=1.0).contains(&u) {
        Some(t)
    } else {
        None
    }
}
