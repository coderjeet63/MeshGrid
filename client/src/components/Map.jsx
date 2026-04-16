import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import axios from 'axios';
import PinModal from './PinModal';
import db from '../db';

// Fix for default marker icon in react-leaflet
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
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

  // Fetch pins from local DB first, then backend on component mount
  useEffect(() => {
    const fetchPins = async () => {
      try {
        // Step 1: Fetch local pins from Dexie
        const localPins = await db.pins.toArray();
        console.log('Local pins fetched:', localPins.length);
        
        // Step 2: Try to fetch backend pins
        try {
          const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/pins`);
          const backendPins = response.data;
          console.log('Backend pins fetched:', backendPins.length);
          
          // Step 3: Merge local and backend pins
          // Convert local pins to match backend format
          const formattedLocalPins = localPins.map(pin => ({
            _id: `local_${pin.id}`,
            title: pin.title,
            desc: pin.desc,
            pinType: pin.pinType,
            location: {
              type: 'Point',
              coordinates: [pin.longitude, pin.latitude]
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            syncedStatus: pin.syncedStatus
          }));
          
          // Combine pins, avoiding duplicates
          const allPins = [...formattedLocalPins, ...backendPins];
          setPins(allPins);
          
        } catch (error) {
          console.error('Backend fetch failed, using local pins only:', error);
          // Fallback: Use only local pins if backend is unavailable
          const formattedLocalPins = localPins.map(pin => ({
            _id: `local_${pin.id}`,
            title: pin.title,
            desc: pin.desc,
            pinType: pin.pinType,
            location: {
              type: 'Point',
              coordinates: [pin.longitude, pin.latitude]
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            syncedStatus: pin.syncedStatus
          }));
          setPins(formattedLocalPins);
        }
      } catch (error) {
        console.error('Error fetching pins:', error);
        setPins([]);
      }
    };

    fetchPins();
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

  const handlePinSubmit = async (pinData) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/pins`, {
        ...pinData,
        location: {
          type: 'Point',
          coordinates: [newPinLocation.lng, newPinLocation.lat]
        }
      });
      
      // Add the new pin to the existing pins
      setPins([...pins, response.data]);
      handleModalClose();
    } catch (error) {
      console.error('Error creating pin:', error);
    }
  };

  const getMarkerIcon = (pinType) => {
    const iconColors = {
      RESOURCE: '#10b981', // green
      SOS: '#ef4444',      // red
      DANGER: '#f97316'    // orange
    };

    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
          <path fill="${iconColors[pinType]}" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5S25 25 25 12.5C25 5.6 19.4 0 12.5 0zm0 17c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z"/>
        </svg>
      `)}`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  };

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <MapContainer
        center={[20.5937, 78.9629]} // Center of India
        zoom={5}
        style={{ height: '100vh', width: '100%' }}
        doubleClickZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <LocationSelector onMapDoubleClick={handleMapDoubleClick} />

        {pins.map((pin) => (
          <Marker
            key={pin._id}
            position={[pin.location.coordinates[1], pin.location.coordinates[0]]}
            icon={getMarkerIcon(pin.pinType)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg">{pin.title}</h3>
                <p className="text-sm text-gray-600 mb-1">{pin.desc}</p>
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
        ))}
      </MapContainer>

      {modalOpen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
          <PinModal
            isOpen={modalOpen}
            onClose={handleModalClose}
            onSubmit={handlePinSubmit}
            onPinAdd={addPinToState}
            location={newPinLocation}
          />
        </div>
      )}
    </div>
  );
};

export default Map;
