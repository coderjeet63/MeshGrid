# Phase 6: The Real-Time Scaling Layer (Redis + WebSockets)
**Goal:** Prevent database crashes during mass-reconnection events by introducing a Redis message queue, and provide a real-time Live Dashboard experience for online users using Socket.io.

## 1. Technologies Introduced
* **Redis:** Acts as an in-memory shock absorber (Queue/Stream) to handle massive spikes in incoming sync traffic.
* **Socket.io:** Upgrades HTTP to WebSockets, allowing the server to push new pin data to all connected clients instantly without them needing to refresh the page.

## 2. The Core Architecture
1. **The Ingestion Queue (Backend):** When `/api/pins/sync` is hit, instead of calling Mongoose `upsert` directly, the server pushes the JSON payload into a Redis List (e.g., `pin_sync_queue`).
2. **The Background Worker:** A `setInterval` loop in Node.js continuously pops data from the Redis queue in batches and safely writes it to MongoDB at a controlled pace.
3. **The Pub/Sub Broadcast (Sockets):** As soon as data hits the server, Node.js emits a `new_pins_broadcast` event via Socket.io. 
4. **The Live UI (Frontend):** The React frontend listens for this Socket event. When it receives new pins, it injects them directly into the local Yjs `pinsMap`, automatically triggering the map UI to re-render.

## 3. Execution Strategy
* **Step 1:** Install Redis and Socket.io. Ensure a local Redis server is running.
* **Step 2:** Refactor the backend sync route to use Redis and broadcast via Sockets.
* **Step 3:** Update `MapContainer.jsx` to listen for Sockets and update the Yjs Map.