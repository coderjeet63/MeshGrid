# Phase 3: The Offline P2P Mesh Engine (WebRTC + Yjs)
**Goal:** Enable two completely offline devices to synchronize their IndexedDB map pins directly using WebRTC Data Channels and resolve conflicts mathematically using Yjs (CRDT).

## 1. Technologies Introduced
* **Yjs:** The CRDT (Conflict-free Replicated Data Type) logic core. It creates a shared document that can be updated offline.
* **y-webrtc:** A signaling and synchronization provider for Yjs over WebRTC. It automatically finds peers and connects them.
* **y-indexeddb:** To persistently store the Yjs document state inside the browser's IndexedDB, replacing Dexie.

## 2. The Core Architecture (How it connects)
Instead of saving raw JSON strings to Dexie, we will now save our data as a **Y.Map** (a shared Yjs data type).
1.  **The Yjs Document:** We create a single `new Y.Doc()`. This is our ultimate source of truth.
2.  **Persistence Layer:** We bind this document to IndexedDB using `y-indexeddb`. Whatever changes in the Y.Doc instantly saves offline.
3.  **Network Layer:** We bind this document to `y-webrtc`. When two browsers are on the same local network, `y-webrtc` automatically discovers peers, establishes a direct WebRTC connection, and syncs the Y.Doc perfectly without a central server.

## 3. Directory Updates
```text
client/
├── src/
│   ├── meshSync.js    # NEW: The core Yjs, WebRTC, and IndexedDB setup