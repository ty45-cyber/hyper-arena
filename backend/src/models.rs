use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ClientMessage {
    PlayerInput { paddle_x: f64 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ServerMessage {
    MatchFound { room_id: String, player_id: u8 },
    GameStateUpdate {
        ball_x: f64,
        ball_y: f64,
        p1_x: f64,
        p2_x: f64,
        p1_score: u32,
        p2_score: u32,
    },
    GameOver { winner: u8 },
}