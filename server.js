const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const trafficRoutes = require('./api/traffic');
const analyticsRoutes = require('./api/analytics');
const routeRoutes = require('./api/routes');
const TrafficGenerator = require('./services/traffic-generator');
const WebSocketHandler = require('./services/websocket-handler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/traffic', trafficRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/routes', routeRoutes);

// WebSocket Handler
const websocketHandler = new WebSocketHandler(io);
websocketHandler.initialize();

// Traffic Data Generator
const trafficGenerator = new TrafficGenerator();
trafficGenerator.start((trafficData) => {
  websocketHandler.broadcastTrafficUpdate(trafficData);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

app.get('/routes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'routes.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Traffic Monitoring System running on port ${PORT}`);
  console.log(`WebSocket server initialized`);
  console.log(`Traffic data generator started`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  trafficGenerator.stop();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});