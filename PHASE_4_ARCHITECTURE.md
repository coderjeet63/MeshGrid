# Phase 4: Geo-Awareness & Emergency UI (Responder Engine)
**Goal:** Transform the static map into a live navigation and triage dashboard by implementing real-time geolocation tracking, proximity calculations, and urgency-based UI animations.

## 1. Technologies Introduced
* **Geolocation API:** Browser's native `navigator.geolocation.watchPosition` for real-time tracking with high accuracy.
* **Haversine Formula Math:** Mathematical algorithm to calculate the shortest distance over the earth's surface between the user's live coordinates and the pins' coordinates.
* **Tailwind CSS Animations:** Custom keyframes to create a "pulsing" radar effect for high-priority pins (SOS/DANGER).

## 2. The Core Architecture (How it works)
1.  **The Blue Dot (Self):** On load, the app asks for Location Permission. It then places a unique marker (Blue Dot) on the map and continuously updates its `lat/lng` state as the user walks.
2.  **Dynamic Rendering:** When a user clicks a Pin on the map, the Popup doesn't just show "Title and Desc". It intercepts the user's current location, runs the Haversine calculation, and dynamically injects "Distance: X meters/km away" into the popup.
3.  **Visual Triage:** CSS `animate-ping` (or custom Leaflet DivIcons) will be applied to SOS markers to ensure they bypass visual clutter.

## 3. Execution Strategy
* **Step 1:** Update `MapContainer.jsx` to request and track live location.
* **Step 2:** Create a helper math function for distance calculation.
* **Step 3:** Overhaul the Leaflet markers to use custom HTML icons (DivIcon) so we can inject Tailwind animations directly into the map pins.