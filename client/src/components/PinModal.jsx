import { useState } from 'react';
import { X } from 'lucide-react';
import db from '../db';
import axios from 'axios';

const PinModal = ({ isOpen, onClose, onSubmit, onPinAdd, location }) => {
  const [formData, setFormData] = useState({
    title: '',
    desc: '',
    pinType: 'RESOURCE'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Step 1: Save to Dexie first (offline-first)
      const localPin = await db.pins.add({
        title: formData.title,
        desc: formData.desc,
        pinType: formData.pinType,
        latitude: location.lat,
        longitude: location.lng,
        syncedStatus: 0 // 0 = not synced
      });
      
      console.log('Pin saved locally with ID:', localPin);
      
      // Step 2: Update React state immediately for visual feedback
      const pinDataForState = {
        title: formData.title,
        desc: formData.desc,
        pinType: formData.pinType,
        latitude: location.lat,
        longitude: location.lng,
        syncedStatus: 0
      };
      
      if (onPinAdd) {
        onPinAdd(pinDataForState);
      }
      
      // Step 3: Check if online and sync to backend
      if (navigator.onLine) {
        try {
          const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/pins`, {
            title: formData.title,
            desc: formData.desc,
            pinType: formData.pinType,
            location: {
              type: 'Point',
              coordinates: [location.lng, location.lat]
            }
          });
          
          // Update synced status in Dexie
          await db.pins.update(localPin, { syncedStatus: 1 });
          console.log('Pin synced to backend successfully');
          
          // Call original onSubmit for immediate UI update
          onSubmit(response.data);
        } catch (error) {
          console.error('Failed to sync to backend:', error);
          // Still close modal since data is saved locally
          onClose();
        }
      } else {
        console.log('Offline - pin saved locally only');
        onClose();
      }
    } catch (error) {
      console.error('Error saving pin:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">New Pin</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {location && (
          <div className="mb-4 p-2 bg-gray-100 rounded text-sm text-gray-600">
            Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter pin title"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="desc" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="desc"
              name="desc"
              value={formData.desc}
              onChange={handleChange}
              required
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Enter pin description"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="pinType" className="block text-sm font-medium text-gray-700 mb-1">
              Pin Type
            </label>
            <select
              id="pinType"
              name="pinType"
              value={formData.pinType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="RESOURCE">Resource</option>
              <option value="SOS">SOS</option>
              <option value="DANGER">Danger</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PinModal;
