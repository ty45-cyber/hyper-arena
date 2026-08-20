use axum::{extract::State, http::StatusCode, Json};
use serde_json::{json, Value};
use crate::{auth::Claims, AppState};

pub async fn get_profile(
    claims: Claims,
    State(state): State<AppState>,
) -> Result<Json<Value>, StatusCode> {
    let profile = sqlx::query!(
        r#"SELECT username, created_at FROM players WHERE id = $1"#,
        claims.sub
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(json!({
        "id": claims.sub,
        "username": profile.username,
        "joined_at": profile.created_at
    })))
}