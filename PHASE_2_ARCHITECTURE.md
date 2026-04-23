# Phase 2: The Offline Survival Engine (PWA & IndexedDB)
**Goal:** Make the React application load without an internet connection and save Map Pins locally to the browser's IndexedDB.

## 1. Technologies Introduced
* **vite-plugin-pwa:** To generate Service Workers that cache our HTML/CSS/JS and Leaflet map tiles for offline access.
* **Dexie.js:** A minimalist wrapper for IndexedDB to store the GeoJSON pins directly inside the user's browser storage.

## 2. The New Data Flow (Offline-First Strategy)
1. User drops a Pin on the map.
2. The app **FIRST** saves this pin to Dexie (IndexedDB) locally. (Success is guaranteed even offline).
3. The app checks: `navigator.onLine`.
4. If ONLINE: It instantly syncs the pin to the Node.js backend.
5. If OFFLINE: It keeps it in Dexie and waits. When the browser fires the `window.addEventListener('online')` event, it pushes all pending local pins to the backend.

## 3. Directory Updates
```text
client/
├── src/
│   ├── db.js          # NEW: Dexie database configuration
│   ├── ...