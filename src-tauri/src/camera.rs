use crate::types::{CameraFrame, CameraTransform, Point2D};

/// Calculates the exact affine matrix transform for mapping the Master's Camera Frame
/// to the Player Projection Window with zero distortion and aspect ratio compensation.
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

    // Compute center-anchored translation
    let center_x = camera.x + camera_w * 0.5;
    let center_y = camera.y + camera_h * 0.5;

    let translate_x = (viewport_width * 0.5) - (center_x * effective_scale);
    let translate_y = (viewport_height * 0.5) - (center_y * effective_scale);

    let css_transform = format!(
        "translate3d({:.3}px, {:.3}px, 0px) scale({:.5}) rotate({:.2}deg)",
        translate_x, translate_y, effective_scale, camera.rotation
    );

    // 2D affine inverse matrix: [a, b, c, d, e, f]
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

/// Converts screen coordinates to map world coordinates using the inverse transform matrix
pub fn screen_to_world(point: &Point2D, transform: &CameraTransform) -> Point2D {
    let [a, _b, _c, d, e, f] = transform.inverse_matrix;
    Point2D {
        x: point.x * a + e,
        y: point.y * d + f,
    }
}

/// Performs 60fps lerp interpolation between two camera states
pub fn lerp_camera(from: &CameraFrame, to: &CameraFrame, t: f64) -> CameraFrame {
    let t_clamped = t.max(0.0).min(1.0);
    // Ease-out cubic curve
    let factor = 1.0 - (1.0 - t_clamped).powi(3);

    CameraFrame {
        x: from.x + (to.x - from.x) * factor,
        y: from.y + (to.y - from.y) * factor,
        width: from.width + (to.width - from.width) * factor,
        height: from.height + (to.height - from.height) * factor,
        rotation: from.rotation + (to.rotation - from.rotation) * factor,
        zoom: from.zoom + (to.zoom - from.zoom) * factor,
        is_locked: to.is_locked,
        aspect_ratio: to.aspect_ratio,
    }
}
