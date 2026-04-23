import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { io } from 'socket.io-client';
import PinModal from './PinModal';
import { pinsMap } from '../meshSync';
import { calculateDistance } from '../utils/math';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationSelector = ({ onMapDoubleClick }) => {
  useMapEvents({
    dblclick: (e) => {
      const { lat, lng } = e.latlng;
      console.log('Double-click detected at:', lat, lng); // Debug log
      onMapDoubleClick(lat, lng);
    },
  });
  return null;
};

const Map = () => {
  const [pins, setPins] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newPinLocation, setNewPinLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [map, setMap] = useState(null);

  const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  const syncToCloud = useCallback(async () => {
    console.log("⚡ [SYNC] 1. syncToCloud triggered. isOnline:", navigator.onLine);
    if (!navigator.onLine) return;

    try {
      if (!apiBaseUrl) {
        console.error("🚨 [SYNC] ERROR:", 'VITE_API_URL is not set');
        return;
      }

      // IMPORTANT: pinsMap.values() loses the Yjs key (the unique pin id).
      // We must include it so the backend can upsert by yjsId.
      const pinsArray = Array.from(pinsMap.entries()).map(([yjsId, pin]) => ({
        yjsId,
        ...pin,
      }));
      console.log("📦 [SYNC] 2. Raw data from Yjs:", pinsArray);

      if (pinsArray.length === 0) {
        console.log("⚠️ [SYNC] 3. No pins inside Yjs to sync. Aborting.");
        return;
      }

      console.log("🚀 [SYNC] 4. Firing Axios POST request...");
      const response = await axios.post(`${apiBaseUrl}/api/pins/sync`, { pins: pinsArray });
      console.log("✅ [SYNC] 5. Success! Backend says:", response.data);
    } catch (error) {
      console.error("🚨 [SYNC] ERROR:", error.response?.data || error.message);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!apiBaseUrl) {
      console.error('[SOCKET] VITE_API_URL is not set - cannot connect');
      return;
    }

    console.log('[SOCKET] Connecting to:', apiBaseUrl);
    const socket = io(apiBaseUrl);

    socket.on('connect', () => {
      console.log('[SOCKET] Connected. id:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected. reason:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[SOCKET] Connection error:', err.message);
    });

    socket.on('new_pins_broadcast', (incomingPins) => {
      console.log('[SOCKET] new_pins_broadcast received. count:', Array.isArray(incomingPins) ? incomingPins.length : 'invalid');

      if (!Array.isArray(incomingPins)) return;

      incomingPins
        .filter((p) => p && (p.yjsId || p.id))
        .forEach((p) => {
          const yjsId = p.yjsId || p.id;

          const nextValue = { ...p };
          delete nextValue.id;
          delete nextValue.yjsId;

          pinsMap.set(yjsId, nextValue);
        });
    });

    return () => {
      console.log('[SOCKET] Disconnecting');
      socket.disconnect();
    };
  }, [apiBaseUrl]);

  // Load pins from Yjs map and observe for changes
  useEffect(() => {
    // Initial load of pins from Yjs map
    const loadPins = () => {
      const pinsData = pinsMap.toJSON();
      const formattedPins = Object.entries(pinsData).map(([id, pin]) => ({
        _id: id,
        title: pin.title,
        desc: pin.desc,
        pinType: pin.pinType,
        location: {
          type: 'Point',
          coordinates: [pin.longitude, pin.latitude]
        },
        createdAt: new Date(pin.createdAt),
        updatedAt: new Date(pin.updatedAt),
        syncedStatus: pin.syncedStatus
      }));
      
      console.log('Loaded pins from Yjs:', formattedPins.length);
      setPins(formattedPins);
    };

    // Initial load
    loadPins();

    // Observe changes to the Yjs map
    const observer = () => {
      console.log('Yjs map changed, updating pins...');
      loadPins();
    };

    pinsMap.observe(observer);

    // Cleanup observer on unmount
    return () => {
      pinsMap.unobserve(observer);
    };
  }, []);

  useEffect(() => {
    console.log('[SYNC] Registering window online listener');
    window.addEventListener('online', syncToCloud);
    return () => {
      console.log('[SYNC] Removing window online listener');
      window.removeEventListener('online', syncToCloud);
    };
  }, [syncToCloud]);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.error('Geolocation watch error:', error);
      },
      {
        enableHighAccuracy: true,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const handleMapDoubleClick = (lat, lng) => {
    console.log('handleMapDoubleClick called with:', lat, lng); // Debug log
    setNewPinLocation({ lat, lng });
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setNewPinLocation(null);
  };

  const addPinToState = (pinData) => {
    // Add new pin to the existing pins state
    const newPin = {
      _id: `local_${Date.now()}`, // Temporary ID for local pins
      title: pinData.title,
      desc: pinData.desc,
      pinType: pinData.pinType,
      location: {
        type: 'Point',
        coordinates: [pinData.longitude || pinData.location?.coordinates?.[0], pinData.latitude || pinData.location?.coordinates?.[1]]
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      syncedStatus: pinData.syncedStatus || 0
    };
    
    setPins(prevPins => [...prevPins, newPin]);
  };

  const handlePinSubmit = async (createdPinFromServer) => {
    setPins((prevPins) => [...prevPins, createdPinFromServer]);
    handleModalClose();
    await syncToCloud();
  };

  const getPinIcon = useMemo(() => {
    const iconByType = {
      RESOURCE: L.divIcon({
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10],
        html: '<div class="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-md"></div>'
      }),
      DANGER: L.divIcon({
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10],
        html: '<div class="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow-md"></div>'
      }),
      SOS: L.divIcon({
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
        html: '<div class="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-md animate-pulse"></div>'
      }),
    };

    return (pinType) => iconByType[pinType] || iconByType.RESOURCE;
  }, []);

  const userIcon = useMemo(
    () =>
      L.divIcon({
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
        html: '<div class="w-6 h-6 rounded-full bg-blue-500/40 border-2 border-blue-600 shadow-md"><div class="w-2 h-2 rounded-full bg-blue-700 m-auto mt-2"></div></div>'
      }),
    []
  );

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <MapContainer
        center={[20.5937, 78.9629]} // Center of India
        zoom={5}
        style={{ height: '100vh', width: '100%' }}
        doubleClickZoom={false}
        whenCreated={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <LocationSelector onMapDoubleClick={handleMapDoubleClick} />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg">You</h3>
                <p className="text-sm text-gray-600">
                  {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {pins.map((pin) => (
          (() => {
            const pinLat = pin.location.coordinates[1];
            const pinLng = pin.location.coordinates[0];
            const distance = userLocation
              ? calculateDistance(userLocation.lat, userLocation.lng, pinLat, pinLng)
              : null;

            return (
          <Marker
            key={pin._id}
            position={[pinLat, pinLng]}
            icon={getPinIcon(pin.pinType)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg">{pin.title}</h3>
                <p className="text-sm text-gray-600 mb-1">{pin.desc}</p>
                {distance && (
                  <p className="text-sm text-gray-700 mb-1">Distance: {distance} away</p>
                )}
                <span className={`inline-block px-2 py-1 text-xs rounded ${
                  pin.pinType === 'RESOURCE' ? 'bg-green-100 text-green-800' :
                  pin.pinType === 'SOS' ? 'bg-red-100 text-red-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {pin.pinType}
                </span>
              </div>
            </Popup>
          </Marker>
            );
          })()
        ))}
      </MapContainer>

      <button
        type="button"
        onClick={() => {
          if (!map || !userLocation) return;
          map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 16), {
            animate: true,
          });
        }}
        className="absolute top-4 right-4 z-[1000] bg-white/90 hover:bg-white text-gray-900 border border-gray-200 shadow px-3 py-2 rounded-md text-sm"
        disabled={!userLocation}
      >
        Recenter
      </button>

      <button
        type="button"
        onClick={syncToCloud}
        className="absolute top-4 right-24 z-[1000] bg-blue-500 hover:bg-blue-600 text-white border border-blue-600 shadow px-3 py-2 rounded-md text-sm"
      >
        Force Sync
      </button>

      {modalOpen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
          <PinModal
            isOpen={modalOpen}
            onClose={handleModalClose}
            onSubmit={handlePinSubmit}
            onPinAdd={addPinToState}
            onCloudSync={syncToCloud}
            location={newPinLocation}
          />
        </div>
      )}
    </div>
  );
};

export default Map;
