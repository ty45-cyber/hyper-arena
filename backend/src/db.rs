use redis::{AsyncCommands, Client as RedisClient};
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PlayerProfile {
    pub id: Uuid,
    pub username: String,
    pub mmr: i32,
    pub wins: i32,
    pub losses: i32,
}

#[derive(Clone)]
pub struct PlayerRepository {
    pg_pool: PgPool,
    redis: RedisClient,
}

impl PlayerRepository {
    pub fn new(pg_pool: PgPool, redis: RedisClient) -> Self {
        Self { pg_pool, redis }
    }

    /// Read-Through: Checks Redis for hot profile data; falls back to Postgres.
    pub async fn get_player_profile(&self, player_id: Uuid) -> Result<PlayerProfile, Box<dyn std::error::Error>> {
        let mut conn = self.redis.get_multiplexed_async_connection().await?;
        let cache_key = format!("player_profile:{}", player_id);

        // 1. Try Redis cache
        if let Ok(cached_json) = conn.get::<_, String>(&cache_key).await {
            if let Ok(profile) = serde_json::from_str(&cached_json) {
                return Ok(profile);
            }
        }

        // 2. Cache miss -> Fetch from PostgreSQL
        let profile = sqlx::query_as::<_, PlayerProfile>(
            "SELECT id, username, mmr, wins, losses FROM players WHERE id = $1"
        )
        .bind(player_id)
        .fetch_one(&self.pg_pool)
        .await?;

        // 3. Populate Redis cache with 5-minute TTL
        if let Ok(serialized) = serde_json::to_string(&profile) {
            let _: () = conn.set_ex(&cache_key, serialized, 300).await.unwrap_or_default();
        }

        Ok(profile)
    }

    /// Write-Through: Commits updated MMR and match record inside a Postgres transaction,
    /// then updates the Redis MMR cache and queues.
    pub async fn save_match_result(
        &self,
        winner_id: Uuid,
        loser_id: Uuid,
        winner_old_mmr: i32,
        winner_new_mmr: i32,
        loser_old_mmr: i32,
        loser_new_mmr: i32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut tx: Transaction<'_, Postgres> = self.pg_pool.begin().await?;

        // Update Winner Stats
        sqlx::query(
            "UPDATE players SET mmr = $1, wins = wins + 1, updated_at = NOW() WHERE id = $2"
        )
        .bind(winner_new_mmr)
        .bind(winner_id)
        .execute(&mut *tx)
        .await?;

        // Update Loser Stats
        sqlx::query(
            "UPDATE players SET mmr = $1, losses = losses + 1, updated_at = NOW() WHERE id = $2"
        )
        .bind(loser_new_mmr)
        .bind(loser_id)
        .execute(&mut *tx)
        .await?;

        // Record Match History Event
        sqlx::query(
            "INSERT INTO matches (winner_id, loser_id, winner_old_mmr, winner_new_mmr, loser_old_mmr, loser_new_mmr)
             VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(winner_id)
        .bind(loser_id)
        .bind(winner_old_mmr)
        .bind(winner_new_mmr)
        .bind(loser_old_mmr)
        .bind(loser_new_mmr)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        // Invalidate Redis profile caches
        let mut redis_conn = self.redis.get_multiplexed_async_connection().await?;
        let winner_key = format!("player_profile:{}", winner_id);
        let loser_key = format!("player_profile:{}", loser_id);
        
        let _: () = redis_conn.del(&[winner_key, loser_key]).await.unwrap_or_default();

        Ok(())
    }
}