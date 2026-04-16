# Phase 1: Vanilla MERN Map (Project MeshGrid)
**Goal:** Build the online, centralized foundation of a geospatial crisis mapping application. 
**Note for AI (Windsurf):** Do not implement offline caching, PWA features, or WebRTC in this phase. Focus strictly on a robust React + Node.js + MongoDB architecture with GeoJSON indexing.

## 1. Tech Stack
* **Frontend:** React.js (Vite), Tailwind CSS, React-Map-GL (Mapbox) or React-Leaflet.
* **Backend:** Node.js, Express.js.
* **Database:** MongoDB (Mongoose) with GeoJSON `2dsphere` indexing.

## 2. Directory Structure
```text
meshgrid/
├── client/          # React Frontend
├── server/          # Node.js Backend
└── PHASE_1.md       # This context file