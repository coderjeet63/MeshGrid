# Low-Level System Design (LLD) & End-to-End Architecture
**Project:** MeshGrid (Decentralized Crisis & Resource Network)
**Core Philosophy:** The system must survive severe network partitions, handle chaotic data merges, and absorb massive traffic spikes when networks restore.

## 1. The Offline Engine (Client-Side)
**Objective:** Enable the "Hyper-Local SOS" and "Danger Zone" scenarios without internet.

* **Technology:** Progressive Web App (PWA) + Service Workers.
    * **Why:** App Stores are inaccessible during disasters. PWAs cache the HTML/CSS/JS shell locally. Once loaded via a captive portal (Local Wi-Fi), it runs fully offline.
* **Local Storage:** IndexedDB (via Dexie.js).
    * **Why not LocalStorage?** LocalStorage is synchronous (blocks the main UI thread) and limited to 5MB. IndexedDB is asynchronous and can store hundreds of megabytes of map tiles and geospatial pins locally.
* **Data Integrity & Merging:** Yjs (CRDT - Conflict-Free Replicated Data Type).
    * **Why:** If two users offline edit the status of a "Food & Water" pin, traditional timestamps fail because mobile clocks drift. CRDTs use logical clocks to mathematically guarantee that when both users sync, their data merges perfectly without conflicts or data loss.

## 2. The "Good Virus" Mesh Network (Peer-to-Peer)
**Objective:** Spread survival data between devices passing within 50 meters of each other.

* **Technology:** WebRTC (RTCDataChannel).
    * **Why not WebSockets?** WebSockets require a centralized Node.js server. WebRTC enables direct browser-to-browser UDP connections. On a local hotspot network, WebRTC can establish connections using mDNS and local IPs to bypass the need for external STUN/TURN servers.
* **The Protocol:** 1. Browser A broadcasts a connection offer.
    2. Browser B accepts.
    3. Both run a Yjs "State Vector" exchange (comparing what data they are missing).
    4. Only the delta (missing bytes) is transferred, saving massive battery and local bandwidth.

## 3. The Cloud Gateway (Ingestion & Shock Absorption)
**Objective:** Prevent server crashes when a mesh of 10,000 offline users suddenly finds a 4G connection and uploads data simultaneously.

* **Technology:** Redis (Message Queue / Streams) + Node.js (Cluster Mode).
    * **Why not write directly to DB?** If 10,000 users upload 500 pins each in the same second, the database will experience connection pooling exhaustion and crash. 
    * **The Flow:** Node.js receives the incoming JSON payloads and instantly dumps them into a **Redis Stream**. Redis can handle 100,000+ writes per second in RAM. This acts as a "Shock Absorber." A background worker process then slowly pulls from Redis and writes to MongoDB at a safe pace.
* **Real-time Broadcast:** Redis Pub/Sub + Socket.io.
    * **Why:** Once data is safely ingested, Redis Pub/Sub triggers Socket.io to push the new pins to all currently online observers instantly.

## 4. The Database (Persistence & Geo-Spatial Math)
**Objective:** Instantly query nearby resources for online users.

* **Technology:** MongoDB.
    * **Why not PostgreSQL/MySQL?** While PostGIS is great, MongoDB's native JSON document structure pairs perfectly with our frontend GeoJSON data. 
    * **The Secret Weapon:** The `2dsphere` index. When someone drops an "Asthma Pump SOS", MongoDB uses a highly optimized B-Tree structure to calculate the Haversine formula (Earth's curvature) in milliseconds, finding matches within a 2km radius without scanning the entire database.

## 5. DevOps, Scaling & Fault Tolerance
**Objective:** Zero downtime, infinite scalability, automated deployments.

* **Containerization:** Docker.
    * **Why:** Ensures the Node.js server and Redis environment run identically on your laptop and in the cloud.
* **Orchestration:** Kubernetes (K8s) (Optional for Phase 1, crucial for production).
    * **Why:** If the disaster hits a highly populated area and traffic spikes, K8s monitors CPU usage. If CPU hits 80%, K8s spins up 5 new Node.js pods automatically (Horizontal Pod Autoscaler). If a pod crashes, it restarts it instantly (Self-healing).
* **CI/CD Pipeline:** GitHub Actions.
    * **The Flow:** When code is pushed to the `main` branch, GitHub Actions automatically runs unit tests. If tests pass, it builds a new Docker image, pushes it to a registry, and triggers the cloud provider (AWS/DigitalOcean from your Student Pack) to deploy the new version with zero downtime.