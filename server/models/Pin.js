const mongoose = require('mongoose');

const pinSchema = new mongoose.Schema({
  yjsId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  desc: {
    type: String,
    required: true
  },
  pinType: {
    type: String,
    required: true,
    enum: ['RESOURCE', 'SOS', 'DANGER']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(coordinates) {
          return coordinates.length === 2 && 
                 coordinates[0] >= -180 && coordinates[0] <= 180 && // longitude
                 coordinates[1] >= -90 && coordinates[1] <= 90;     // latitude
        },
        message: 'Coordinates must be [longitude, latitude] in valid ranges'
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create 2dsphere index for location field
pinSchema.index({ location: '2dsphere' });
pinSchema.index({ yjsId: 1 }, { unique: true });

// Update the updatedAt field on save
pinSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Pin', pinSchema);
