require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'MeshGrid API is running' });
});

// Mock pins endpoint
app.get('/api/pins', (req, res) => {
  res.json([
    {
      _id: '1',
      title: 'Sample Resource',
      desc: 'This is a sample resource pin',
      pinType: 'RESOURCE',
      location: {
        type: 'Point',
        coordinates: [78.9629, 20.5937]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
});

// Mock POST endpoint
app.post('/api/pins', (req, res) => {
  const { title, desc, pinType, location } = req.body;
  const newPin = {
    _id: Date.now().toString(),
    title,
    desc,
    pinType,
    location,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  res.status(201).json(newPin);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
