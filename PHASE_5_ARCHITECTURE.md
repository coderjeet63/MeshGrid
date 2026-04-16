# Phase 5: The Cloud Bridge (Global Synchronization)
**Goal:** Bridge the offline P2P mesh network to the central cloud. When any device in the offline mesh regains internet access, it must automatically bulk-upload the synchronized CRDT data to the Node.js backend for global visibility.

## 1. Technologies Introduced
* **Network Information API:** `window.addEventListener('online')` and `navigator.onLine` to detect internet restoration natively in the browser.
* **Bulk API Ingestion:** A new Express.js backend route (`POST /api/pins/sync`) designed to handle an array of pins at once and intelligently "upsert" them into MongoDB to avoid duplicate data.

## 2. The Core Architecture
1. **The Sync Queue (Frontend):** Whenever the Yjs `pinsMap` updates, the app checks if it has internet. 
   - If offline: It does nothing (Yjs/IndexedDB handles local persistence). 
   - If online (or when the browser fires the 'online' event): It extracts the JSON representation of the Y.Map and pushes it to the Node.js server.
2. **The Ingestion Gateway (Backend):**
   The Node.js server receives an array of pins. It uses MongoDB's `upsert` logic (Update if exists, Insert if it doesn't) matched by the unique Yjs pin ID. This ensures that if 5 different offline users suddenly come online and send the exact same P2P synced pins, the database only saves one copy.

## 3. Execution Strategy
* **Step 1:** Create the `/api/pins/sync` backend route with MongoDB upsert logic.
* **Step 2:** Update `MapContainer.jsx` to listen for internet connectivity and push the Yjs data.