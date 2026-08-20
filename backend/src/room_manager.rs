use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::{mpsc, RwLock};
use tokio::time::{interval, Duration};
use uuid::Uuid;
use crate::models::ServerMessage;

pub struct GameState {
    pub ball_x: f64,
    pub ball_y: f64,
    pub ball_dx: f64,
    pub ball_dy: f64,
    pub p1_x: f64,
    pub p2_x: f64,
    pub p1_score: u32,
    pub p2_score: u32,
}

pub struct Room {
    pub id: Uuid,
    pub state: Mutex<GameState>,
    pub p1_tx: mpsc::UnboundedSender<ServerMessage>,
    pub p2_tx: mpsc::UnboundedSender<ServerMessage>,
}

#[derive(Clone, Default)]
pub struct RoomManager {
    pub rooms: Arc<RwLock<HashMap<Uuid, Arc<Room>>>>,
}

impl RoomManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn create_room(
        &self,
        p1_tx: mpsc::UnboundedSender<ServerMessage>,
        p2_tx: mpsc::UnboundedSender<ServerMessage>,
    ) -> Uuid {
        let room_id = Uuid::new_v4();
        let room = Arc::new(Room {
            id: room_id,
            state: Mutex::new(GameState {
                ball_x: 400.0,
                ball_y: 300.0,
                ball_dx: 6.0,
                ball_dy: -6.0,
                p1_x: 350.0,
                p2_x: 350.0,
                p1_score: 0,
                p2_score: 0,
            }),
            p1_tx,
            p2_tx,
        });

        self.rooms.write().await.insert(room_id, room.clone());
        
        let room_clone = room.clone();
        tokio::spawn(async move {
            Self::run_tick_loop(room_clone).await;
        });

        room_id
    }

    pub async fn update_input(&self, room_id: Uuid, player_id: u8, paddle_x: f64) {
        if let Some(room) = self.rooms.read().await.get(&room_id) {
            let mut game = room.state.lock().unwrap();
            if player_id == 1 {
                game.p1_x = paddle_x.clamp(0.0, 700.0);
            } else {
                game.p2_x = paddle_x.clamp(0.0, 700.0);
            }
        }
    }

    async fn run_tick_loop(room: Arc<Room>) {
        let mut ticker = interval(Duration::from_millis(33));
        loop {
            ticker.tick().await;

            let mut game = room.state.lock().unwrap();
            
            // Physics tick
            game.ball_x += game.ball_dx;
            game.ball_y += game.ball_dy;

            // Lateral bounds
            if game.ball_x <= 0.0 || game.ball_x >= 800.0 {
                game.ball_dx *= -1.0;
            }

            // Paddle 1 (Bottom, Y=570)
            if game.ball_y >= 570.0 && game.ball_y <= 580.0
                && game.ball_x >= game.p1_x && game.ball_x <= game.p1_x + 100.0 {
                game.ball_dy *= -1.0;
            }

            // Paddle 2 (Top, Y=20)
            if game.ball_y <= 30.0 && game.ball_y >= 20.0
                && game.ball_x >= game.p2_x && game.ball_x <= game.p2_x + 100.0 {
                game.ball_dy *= -1.0;
            }

            // Out of bounds scoring
            if game.ball_y > 600.0 {
                game.p2_score += 1;
                game.ball_x = 400.0;
                game.ball_y = 300.0;
                game.ball_dy = -6.0;
            } else if game.ball_y < 0.0 {
                game.p1_score += 1;
                game.ball_x = 400.0;
                game.ball_y = 300.0;
                game.ball_dy = 6.0;
            }

            let msg = ServerMessage::GameStateUpdate {
                ball_x: game.ball_x,
                ball_y: game.ball_y,
                p1_x: game.p1_x,
                p2_x: game.p2_x,
                p1_score: game.p1_score,
                p2_score: game.p2_score,
            };

            if room.p1_tx.send(msg.clone()).is_err() || room.p2_tx.send(msg).is_err() {
                break; // Exit loop on client disconnect
            }
        }
    }
}