use crate::types::{CameraFrame, FogPoint, Point2D};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionState {
    pub active_map_id: Option<String>,
    pub camera: CameraFrame,
    pub fog_points: Vec<FogPoint>,
    pub is_player_blackout: bool,
    pub blackout_message: Option<String>,
    pub laser_point: Option<Point2D>,
    pub revision: u64,
}

pub struct SharedState {
    pub session: Mutex<SessionState>,
}

impl Default for SharedState {
    fn default() -> Self {
        Self {
            session: Mutex::new(SessionState::default()),
        }
    }
}
