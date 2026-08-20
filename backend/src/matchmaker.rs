use redis::{AsyncCommands, Client};
use std::collections::HashMap;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use crate::room_manager::RoomManager;

pub struct QueueEntry {
    pub player_id: String,
    pub mmr: i32,
    pub joined_at: Instant,
}

pub struct RedisMatchmaker {
    redis_client: Client,
    room_manager: RoomManager,
}

impl RedisMatchmaker {
    pub fn new(redis_client: Client, room_manager: RoomManager) -> Self {
        Self { redis_client, room_manager }
    }

    /// Adds a player to the Redis Sorted Set with their MMR as the score
    pub async fn enqueue_player(&self, player_id: &str, mmr: i32) -> Result<(), redis::RedisError> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        conn.zadd("matchmaking_queue", player_id, mmr).await?;
        Ok(())
    }

    /// Background worker loop that expands MMR tolerance over time
    pub async fn start_worker_loop(&self) {
        let lua_script = redis::Script::new(include_str!("scripts/match_players.lua"));
        let mut local_wait_times: HashMap<String, Instant> = HashMap::new();

        loop {
            sleep(Duration::from_millis(500)).await;

            let mut conn = match self.redis_client.get_multiplexed_async_connection().await {
                Ok(c) => c,
                Err(_) => continue,
            };

            // 1. Fetch all queued players from Redis ZSET
            let players: Vec<(String, i32)> = match conn.zrange_withscores("matchmaking_queue", 0, -1).await {
                Ok(p) => p,
                Err(_) => continue,
            };

            for (player_id, _mmr) in players {
                let joined_at = local_wait_times
                    .entry(player_id.clone())
                    .or_insert_with(Instant::now);

                // 2. Expand MMR tolerance by +50 points every 2 seconds spent in queue
                let elapsed_secs = joined_at.elapsed().as_secs();
                let tolerance = 50 + ((elapsed_secs / 2) * 50) as i32;

                // 3. Run Lua script to claim match atomically
                let result: Option<Vec<String>> = lua_script
                    .key("matchmaking_queue")
                    .arg(&player_id)
                    .arg(tolerance)
                    .invoke_async(&mut conn)
                    .await
                    .unwrap_or(None);

                if let Some(matched_pair) = result {
                    let p1_id = &matched_pair[0];
                    let p2_id = &matched_pair[1];

                    local_wait_times.remove(p1_id);
                    local_wait_times.remove(p2_id);

                    println!("🎮 MMR Match Found ({p1_id} vs {p2_id}) | Max Tolerance: ±{tolerance}");
                    
                    // Trigger room allocation and assign active channels
                    // self.room_manager.create_room(...)
                    break;
                }
            }
        }
    }
}