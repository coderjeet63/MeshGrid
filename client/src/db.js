import Dexie from 'dexie';

const db = new Dexie('MeshGridDB');

// Define the schema for the pins table
db.version(1).stores({
  pins: '++id, title, desc, pinType, latitude, longitude, syncedStatus'
});

export default db;
