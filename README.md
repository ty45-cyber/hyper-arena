⚡ HYPER ARENAA low-latency, server-authoritative multiplayer arena engine built with Rust, WebSockets, and Next.js.Hyper Arena is designed around a zero-trust, server-authoritative architecture. The server executes a strict 60 FPS physics and collision loop, broadcasting state ticks over WebSockets while the React frontend uses client-side linear interpolation (LERP) to render butter-smooth visual state between server updates.🏗️ Architecture Overview ┌──────────────────────┐   WebSocket Ticks (~60 FPS)   ┌──────────────────────┐
 │     Rust Backend     │ ────────────────────────────> │   Next.js Frontend   │
 │   (Axum + Tokio)     │ <──────────────────────────── │   (Canvas + LERP)    │
 └──────────────────────┘         User Inputs           └──────────────────────┘
            │                                                      │
 ┌──────────┴───────────┐                               ┌──────────┴───────────┐
 │ • Server Physics Loop│                               │ • Visual Interpolation│
 │ • Vector Collisions  │                               │ • Input Handler      │
 │ • Broadcast Channel  │                               │ • HTML5 Canvas Render│
 └──────────────────────┘                               └──────────────────────┘
✨ Key FeaturesServer-Authoritative Engine: All position calculations, vector movement, and boundary collisions happen exclusively on the Rust backend to prevent client-side manipulation.Low-Latency Broadcasts: Uses tokio::sync::broadcast to push state ticks across concurrent WebSocket connections with minimal overhead.Smooth Interpolation: The HTML5 canvas leverages linear interpolation (lerp) to eliminate stutter and mask network variance.Instant Matchmaking: Automatic session initialization without friction or authorization delays.🛠️ Tech StackDomainTech / FrameworkPurposeBackendRust (Axum & Tokio)High-concurrency async runtime and WebSocket serverNetworkingfutures-util & WebSocketsBi-directional real-time binary/text state broadcastingFrontendNext.js 14 & ReactUser interface wrapper and asset mountingRenderingHTML5 Canvas API60 FPS custom loop execution via requestAnimationFrameStylingTailwind CSSDark-mode HUD and cyber-arena UI🚀 Quick StartPrerequisitesRust (cargo 1.70+)Node.js (v18+)1. Clone & Set UpBashgit clone https://github.com/your-username/hyper-arena.git
cd hyper-arena
2. Run the Rust BackendBashcd backend
cargo run
The engine will start listening on ws://localhost:4000/ws.3. Run the Next.js FrontendIn a new terminal window:Bashcd frontend
npm install
npm run dev
Open http://localhost:3000 in your browser, click INITIALIZE MATCH, and enter the arena!🎮 ControlsMove Up: W or Up ArrowMove Down: S or Down Arrow📄 LicenseDistributed under the MIT License. See LICENSE for more information.
