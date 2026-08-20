// backend/src/ws_handler.rs
use axum::{
    extract::{ws::WebSocketUpgrade, Query, State},
    http::StatusCode,
    response::Response,
};
use serde::Deserialize;

use crate::{auth::verify_jwt, AppState};

#[derive(Deserialize)]
pub struct WsAuthQuery {
    pub token: String,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsAuthQuery>,
    State(_state): State<AppState>,
) -> Result<Response, (StatusCode, String)> {
    // 1. Verify JWT passed in the query parameter
    let claims = verify_jwt(&query.token)
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid JWT".to_string()))?;

    // 2. Upgrade the HTTP connection to a WebSocket connection
    Ok(ws.on_upgrade(move |mut socket| async move {
        println!("Socket connected for player ID: {}", claims.sub);

        // Keep connection open and process incoming messages
        while let Some(Ok(msg)) = socket.recv().await {
            if let axum::extract::ws::Message::Text(text) = msg {
                println!("Received frame from {}: {}", claims.sub, text);
            }
        }

        println!("Socket disconnected for player ID: {}", claims.sub);
    }))
}