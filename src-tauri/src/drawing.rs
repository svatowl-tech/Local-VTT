use crate::types::{Point2D, SpellTemplate};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpellAreaMetrics {
    pub area_sq_ft: f64,
    pub perimeter_ft: f64,
    pub affected_grid_cells: usize,
    pub boundary_points: Vec<Point2D>,
}

/// Ramer-Douglas-Peucker (RDP) algorithm for reducing stroke vertices with epsilon tolerance
pub fn simplify_stroke_rdp(points: &[Point2D], epsilon: f64) -> Vec<Point2D> {
    if points.len() <= 2 {
        return points.to_vec();
    }

    let mut max_dist = 0.0;
    let mut index = 0;
    let end_idx = points.len() - 1;

    for i in 1..end_idx {
        let dist = perpendicular_distance(&points[i], &points[0], &points[end_idx]);
        if dist > max_dist {
            max_dist = dist;
            index = i;
        }
    }

    if max_dist > epsilon {
        let mut left = simplify_stroke_rdp(&points[0..=index], epsilon);
        let mut right = simplify_stroke_rdp(&points[index..=end_idx], epsilon);
        left.pop(); // Remove duplicate midpoint
        left.append(&mut right);
        left
    } else {
        vec![points[0].clone(), points[end_idx].clone()]
    }
}

fn perpendicular_distance(pt: &Point2D, line_start: &Point2D, line_end: &Point2D) -> f64 {
    let dx = line_end.x - line_start.x;
    let dy = line_end.y - line_start.y;
    let line_len_sq = dx * dx + dy * dy;

    if line_len_sq == 0.0 {
        let px = pt.x - line_start.x;
        let py = pt.y - line_start.y;
        return (px * px + py * py).sqrt();
    }

    let numerator = ((line_end.y - line_start.y) * pt.x - (line_end.x - line_start.x) * pt.y
        + line_end.x * line_start.y
        - line_end.y * line_start.x)
        .abs();

    numerator / line_len_sq.sqrt()
}

/// Computes exact geometry, perimeter, and affected D&D 5ft grid tiles for spell templates
pub fn calculate_spell_template_metrics(
    template: &SpellTemplate,
    grid_size_px: f64,
) -> SpellAreaMetrics {
    let cell_size = if grid_size_px <= 0.0 { 70.0 } else { grid_size_px };
    let px_to_feet = 5.0 / cell_size;
    let radius_ft = template.radius * px_to_feet;

    match template.shape.as_str() {
        "cone" => {
            let length_ft = radius_ft;
            let half_angle_rad = (template.angle * 0.5).to_radians();
            let area_sq_ft = std::f64::consts::PI * length_ft * length_ft * (template.angle / 360.0);
            let perimeter_ft = 2.0 * length_ft + (length_ft * (template.angle).to_radians());
            let cells = (area_sq_ft / 25.0).ceil() as usize;

            let mut boundary = vec![template.origin.clone()];
            let base_angle = (template.target.y - template.origin.y).atan2(template.target.x - template.origin.x);
            let num_arc_pts = 16;
            for i in 0..=num_arc_pts {
                let a = base_angle - half_angle_rad + (2.0 * half_angle_rad * (i as f64) / (num_arc_pts as f64));
                boundary.push(Point2D {
                    x: template.origin.x + a.cos() * template.radius,
                    y: template.origin.y + a.sin() * template.radius,
                });
            }

            SpellAreaMetrics {
                area_sq_ft,
                perimeter_ft,
                affected_grid_cells: cells.max(1),
                boundary_points: boundary,
            }
        }
        "cube" => {
            let size_ft = radius_ft;
            let area_sq_ft = size_ft * size_ft;
            let perimeter_ft = 4.0 * size_ft;
            let cells = ((size_ft / 5.0) * (size_ft / 5.0)).ceil() as usize;

            let half_sz = template.radius * 0.5;
            let boundary = vec![
                Point2D { x: template.origin.x - half_sz, y: template.origin.y - half_sz },
                Point2D { x: template.origin.x + half_sz, y: template.origin.y - half_sz },
                Point2D { x: template.origin.x + half_sz, y: template.origin.y + half_sz },
                Point2D { x: template.origin.x - half_sz, y: template.origin.y + half_sz },
            ];

            SpellAreaMetrics {
                area_sq_ft,
                perimeter_ft,
                affected_grid_cells: cells.max(1),
                boundary_points: boundary,
            }
        }
        _ => {
            // Default: Circle / Sphere
            let area_sq_ft = std::f64::consts::PI * radius_ft * radius_ft;
            let perimeter_ft = 2.0 * std::f64::consts::PI * radius_ft;
            let cells = (area_sq_ft / 25.0).ceil() as usize;

            let num_pts = 32;
            let mut boundary = Vec::with_capacity(num_pts);
            for i in 0..num_pts {
                let a = (i as f64) * std::f64::consts::TAU / (num_pts as f64);
                boundary.push(Point2D {
                    x: template.origin.x + a.cos() * template.radius,
                    y: template.origin.y + a.sin() * template.radius,
                });
            }

            SpellAreaMetrics {
                area_sq_ft,
                perimeter_ft,
                affected_grid_cells: cells.max(1),
                boundary_points: boundary,
            }
        }
    }
}
