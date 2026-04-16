import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';

// Initialize the Yjs document - this is our ultimate source of truth
const ydoc = new Y.Doc();

// Create a shared Map for pins - this will be synchronized across all peers
export const pinsMap = ydoc.getMap('pins');

// Add IndexedDB persistence - whatever changes in the Y.Doc instantly saves offline
const indexeddbProvider = new IndexeddbPersistence('meshgrid-db', ydoc);

// Add WebRTC provider - automatically discovers peers and establishes direct connections
const webrtcProvider = new WebrtcProvider('meshgrid-emergency-room', ydoc, {
  signaling: ['wss://signaling.yjs.dev']
});

// Log connection status for debugging
webrtcProvider.on('status', event => {
  console.log('WebRTC status:', event.status);
});

webrtcProvider.on('peers', event => {
  console.log('Connected peers:', event.peers.size);
});

// Log when IndexedDB persistence is ready
indexeddbProvider.on('synced', () => {
  console.log('IndexedDB persistence synced');
});

indexeddbProvider.on('load', () => {
  console.log('IndexedDB persistence loaded');
});

export { ydoc, indexeddbProvider, webrtcProvider };
