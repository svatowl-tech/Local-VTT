use crate::types::{Point2D, VisionWall};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightSource {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub bright_radius: f64,
    pub dim_radius: f64,
    pub color: String,
    pub intensity: f64,
    pub cast_shadows: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShadowVolume {
    pub light_id: String,
    pub polygon: Vec<Point2D>,
    pub bright_radius: f64,
    pub dim_radius: f64,
    pub color: String,
}

/// Computes visibility & dynamic shadow casting polygons for multiple light sources
pub fn compute_dynamic_lighting(
    lights: &[LightSource],
    walls: &[VisionWall],
    num_rays_per_light: Option<usize>,
) -> Vec<ShadowVolume> {
    let rays_count = num_rays_per_light.unwrap_or(120).clamp(36, 360);
    let angle_step = std::f64::consts::TAU / (rays_count as f64);

    let active_walls: Vec<(Point2D, Point2D)> = walls
        .iter()
        .filter(|w| w.blocks_vision)
        .map(|w| (w.p1.clone(), w.p2.clone()))
        .collect();

    let mut volumes = Vec::with_capacity(lights.len());

    for light in lights {
        let max_r = light.dim_radius.max(light.bright_radius);
        if max_r <= 0.0 {
            continue;
        }

        let origin = Point2D { x: light.x, y: light.y };
        let mut boundary = Vec::with_capacity(rays_count);

        for i in 0..rays_count {
            let angle = (i as f64) * angle_step;
            let dir_x = angle.cos();
            let dir_y = angle.sin();

            let mut closest_hit = max_r;

            if light.cast_shadows && !active_walls.is_empty() {
                for (w_start, w_end) in &active_walls {
                    if let Some(dist) = ray_intersect(&origin, dir_x, dir_y, w_start, w_end) {
                        if dist < closest_hit && dist > 0.0 {
                            closest_hit = dist;
                        }
                    }
                }
            }

            boundary.push(Point2D {
                x: origin.x + dir_x * closest_hit,
                y: origin.y + dir_y * closest_hit,
            });
        }

        volumes.push(ShadowVolume {
            light_id: light.id.clone(),
            polygon: boundary,
            bright_radius: light.bright_radius,
            dim_radius: light.dim_radius,
            color: light.color.clone(),
        });
    }

    volumes
}

#[inline]
fn ray_intersect(
    ray_origin: &Point2D,
    ray_dir_x: f64,
    ray_dir_y: f64,
    p1: &Point2D,
    p2: &Point2D,
) -> Option<f64> {
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;

    let denom = ray_dir_x * dy - ray_dir_y * dx;
    if denom.abs() < 1e-7 {
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
