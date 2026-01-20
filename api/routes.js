const express = require('express');
const router = express.Router();
const database = require('../database');

// Calculate optimal route
router.post('/calculate', async (req, res) => {
  try {
    const { origin, destination, preferences = {} } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination are required'
      });
    }
    
    // Get current traffic data
    const segments = await database.getRoadSegments();
    const segmentIds = segments.map(s => s.segment_id);
    const trafficData = await database.getLatestTrafficData(segmentIds);
    
    // Calculate multiple route options
    const routes = calculateRouteOptions(origin, destination, segments, trafficData, preferences);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      origin: origin,
      destination: destination,
      routes: routes,
      count: routes.length
    });
  } catch (error) {
    console.error('Error calculating route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate route',
      message: error.message
    });
  }
});

// Get route alternatives
router.get('/alternatives', async (req, res) => {
  try {
    const { origin, destination, limit = 3 } = req.query;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination are required'
      });
    }
    
    const segments = await database.getRoadSegments();
    const segmentIds = segments.map(s => s.segment_id);
    const trafficData = await database.getLatestTrafficData(segmentIds);
    
    // Parse origin and destination
    const originCoords = origin.split(',').map(Number);
    const destinationCoords = destination.split(',').map(Number);
    
    const alternatives = generateRouteAlternatives(
      originCoords,
      destinationCoords,
      segments,
      trafficData,
      parseInt(limit)
    );
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      alternatives: alternatives,
      count: alternatives.length
    });
  } catch (error) {
    console.error('Error generating route alternatives:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate route alternatives',
      message: error.message
    });
  }
});

// Get route history
router.get('/history', async (req, res) => {
  try {
    const { user_id, limit = 10 } = req.query;
    
    // For demo purposes, generate sample route history
    const routeHistory = generateSampleRouteHistory(parseInt(limit));
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: routeHistory,
      count: routeHistory.length
    });
  } catch (error) {
    console.error('Error fetching route history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch route history',
      message: error.message
    });
  }
});

// Save favorite route
router.post('/favorites', async (req, res) => {
  try {
    const { name, origin, destination, waypoints = [], preferences = {} } = req.body;
    
    if (!name || !origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Name, origin, and destination are required'
      });
    }
    
    const favoriteRoute = {
      id: require('uuid').v4(),
      name: name,
      origin: origin,
      destination: destination,
      waypoints: waypoints,
      preferences: preferences,
      created_at: new Date().toISOString(),
      usage_count: 0
    };
    
    // In a real application, this would be saved to the database
    // For demo purposes, we'll just return the saved route
    
    res.json({
      success: true,
      message: 'Route saved to favorites',
      data: favoriteRoute
    });
  } catch (error) {
    console.error('Error saving favorite route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save favorite route',
      message: error.message
    });
  }
});

// Get favorite routes
router.get('/favorites', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    // For demo purposes, generate sample favorite routes
    const favoriteRoutes = [
      {
        id: 'route_001',
        name: 'Home to Work',
        origin: { lat: 37.7749, lng: -122.4194 },
        destination: { lat: 37.8044, lng: -122.2711 },
        waypoints: [],
        preferences: { avoid_highways: false, shortest_route: false },
        usage_count: 45,
        created_at: '2024-01-15T08:00:00Z'
      },
      {
        id: 'route_002',
        name: 'Weekend Shopping',
        origin: { lat: 37.7849, lng: -122.4094 },
        destination: { lat: 37.8044, lng: -122.4211 },
        waypoints: [
          { lat: 37.7944, lng: -122.4111 }
        ],
        preferences: { avoid_tolls: true, scenic_route: true },
        usage_count: 12,
        created_at: '2024-02-01T10:30:00Z'
      }
    ];
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: favoriteRoutes,
      count: favoriteRoutes.length
    });
  } catch (error) {
    console.error('Error fetching favorite routes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch favorite routes',
      message: error.message
    });
  }
});

// Get traffic-aware time estimates
router.get('/time-estimates', async (req, res) => {
  try {
    const { origin, destination, departure_time } = req.query;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination are required'
      });
    }
    
    const segments = await database.getRoadSegments();
    const segmentIds = segments.map(s => s.segment_id);
    const trafficData = await database.getLatestTrafficData(segmentIds);
    
    const estimates = generateTimeEstimates(
      origin.split(',').map(Number),
      destination.split(',').map(Number),
      segments,
      trafficData,
      departure_time ? new Date(departure_time) : new Date()
    );
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      estimates: estimates
    });
  } catch (error) {
    console.error('Error generating time estimates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate time estimates',
      message: error.message
    });
  }
});

// Route optimization functions
function calculateRouteOptions(origin, destination, segments, trafficData, preferences) {
  const routes = [];
  
  // Fastest route
  routes.push(calculateFastestRoute(origin, destination, segments, trafficData));
  
  // Shortest route
  routes.push(calculateShortestRoute(origin, destination, segments, trafficData));
  
  // Most efficient route (balance of time and distance)
  routes.push(calculateEfficientRoute(origin, destination, segments, trafficData));
  
  // Scenic route (avoid highways when possible)
  if (preferences.scenic !== false) {
    routes.push(calculateScenicRoute(origin, destination, segments, trafficData));
  }
  
  return routes.filter(route => route !== null);
}

function calculateFastestRoute(origin, destination, segments, trafficData) {
  // Simplified route calculation - in production, use proper routing algorithm
  const routeSegments = selectOptimalSegments(origin, destination, segments, trafficData, 'fastest');
  
  return {
    id: 'fastest',
    name: 'Fastest Route',
    description: 'Optimal route based on current traffic conditions',
    segments: routeSegments,
    distance: routeSegments.reduce((sum, s) => sum + s.length_km, 0),
    estimated_time: routeSegments.reduce((sum, s) => sum + s.travel_time_minutes, 0),
    congestion_level: routeSegments.reduce((sum, s) => sum + s.congestion_level, 0) / routeSegments.length,
    instructions: generateRouteInstructions(routeSegments)
  };
}

function calculateShortestRoute(origin, destination, segments, trafficData) {
  const routeSegments = selectOptimalSegments(origin, destination, segments, trafficData, 'shortest');
  
  return {
    id: 'shortest',
    name: 'Shortest Route',
    description: 'Route with minimum distance',
    segments: routeSegments,
    distance: routeSegments.reduce((sum, s) => sum + s.length_km, 0),
    estimated_time: routeSegments.reduce((sum, s) => sum + s.travel_time_minutes, 0),
    congestion_level: routeSegments.reduce((sum, s) => sum + s.congestion_level, 0) / routeSegments.length,
    instructions: generateRouteInstructions(routeSegments)
  };
}

function calculateEfficientRoute(origin, destination, segments, trafficData) {
  const routeSegments = selectOptimalSegments(origin, destination, segments, trafficData, 'efficient');
  
  return {
    id: 'efficient',
    name: 'Most Efficient',
    description: 'Balanced route considering time and distance',
    segments: routeSegments,
    distance: routeSegments.reduce((sum, s) => sum + s.length_km, 0),
    estimated_time: routeSegments.reduce((sum, s) => sum + s.travel_time_minutes, 0),
    congestion_level: routeSegments.reduce((sum, s) => sum + s.congestion_level, 0) / routeSegments.length,
    instructions: generateRouteInstructions(routeSegments)
  };
}

function calculateScenicRoute(origin, destination, segments, trafficData) {
  const scenicSegments = segments.filter(s => s.type !== 'highway');
  const routeSegments = selectOptimalSegments(origin, destination, scenicSegments, trafficData, 'scenic');
  
  return {
    id: 'scenic',
    name: 'Scenic Route',
    description: 'Avoids highways, more scenic drive',
    segments: routeSegments,
    distance: routeSegments.reduce((sum, s) => sum + s.length_km, 0),
    estimated_time: routeSegments.reduce((sum, s) => sum + s.travel_time_minutes, 0),
    congestion_level: routeSegments.reduce((sum, s) => sum + s.congestion_level, 0) / routeSegments.length,
    instructions: generateRouteInstructions(routeSegments)
  };
}

function selectOptimalSegments(origin, destination, segments, trafficData, criteria) {
  // Simplified segment selection - in production, use proper routing algorithm
  const relevantSegments = segments.slice(0, Math.floor(Math.random() * 5) + 3);
  
  return relevantSegments.map(segment => {
    const trafficRecord = trafficData.find(t => t.segment_id === segment.segment_id);
    return {
      ...segment,
      current_speed: trafficRecord ? trafficRecord.current_speed : segment.speed_limit,
      congestion_level: trafficRecord ? trafficRecord.congestion_level : 0,
      travel_time_minutes: trafficRecord ? trafficRecord.travel_time_minutes : (segment.length_km / segment.speed_limit) * 60
    };
  });
}

function generateRouteInstructions(segments) {
  const instructions = [];
  
  segments.forEach((segment, index) => {
    if (index === 0) {
      instructions.push(`Head ${segment.name} for ${segment.length_km.toFixed(1)} km`);
    } else {
      instructions.push(`Continue on ${segment.name} for ${segment.length_km.toFixed(1)} km`);
    }
    
    if (segment.congestion_level > 0.7) {
      instructions[instructions.length - 1] += ' (Heavy traffic expected)';
    } else if (segment.congestion_level > 0.4) {
      instructions[instructions.length - 1] += ' (Moderate traffic)';
    }
  });
  
  instructions.push('You have arrived at your destination');
  return instructions;
}

function generateRouteAlternatives(origin, destination, segments, trafficData, limit) {
  const alternatives = [];
  
  for (let i = 0; i < limit; i++) {
    const routeSegments = selectOptimalSegments(origin, destination, segments, trafficData, `alternative_${i}`);
    
    alternatives.push({
      id: `alternative_${i}`,
      name: `Alternative Route ${i + 1}`,
      segments: routeSegments,
      distance: routeSegments.reduce((sum, s) => sum + s.length_km, 0),
      estimated_time: routeSegments.reduce((sum, s) => sum + s.travel_time_minutes, 0),
      congestion_level: routeSegments.reduce((sum, s) => sum + s.congestion_level, 0) / routeSegments.length,
      reliability: 0.7 + Math.random() * 0.3,
      tolls: Math.random() < 0.3,
      highways: routeSegments.some(s => s.type === 'highway')
    });
  }
  
  return alternatives.sort((a, b) => a.estimated_time - b.estimated_time);
}

function generateSampleRouteHistory(limit) {
  const history = [];
  const routes = [
    'Home to Work',
    'Work to Gym',
    'Gym to Home',
    'Home to Shopping',
    'Home to Airport'
  ];
  
  for (let i = 0; i < limit; i++) {
    const route = routes[Math.floor(Math.random() * routes.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    history.push({
      id: `history_${i}`,
      route_name: route,
      origin: { lat: 37.7749 + (Math.random() - 0.5) * 0.1, lng: -122.4194 + (Math.random() - 0.5) * 0.1 },
      destination: { lat: 37.8044 + (Math.random() - 0.5) * 0.1, lng: -122.2711 + (Math.random() - 0.5) * 0.1 },
      travel_date: date.toISOString(),
      actual_duration: Math.floor(15 + Math.random() * 45),
      estimated_duration: Math.floor(15 + Math.random() * 45),
      average_speed: Math.floor(25 + Math.random() * 35),
      distance: Math.floor(5 + Math.random() * 25),
      congestion_level: Math.random()
    });
  }
  
  return history.sort((a, b) => new Date(b.travel_date) - new Date(a.travel_date));
}

function generateTimeEstimates(origin, destination, segments, trafficData, departureTime) {
  const hour = departureTime.getHours();
  const baseMultiplier = 1 + (database.getBaseCongestionForHour(hour) * 0.5);
  
  return {
    departure_time: departureTime.toISOString(),
    estimates: [
      {
        type: 'optimistic',
        duration_minutes: Math.floor(20 * baseMultiplier * 0.8),
        arrival_time: new Date(departureTime.getTime() + (20 * baseMultiplier * 0.8 * 60000)).toISOString(),
        conditions: 'Light traffic, ideal conditions'
      },
      {
        type: 'realistic',
        duration_minutes: Math.floor(25 * baseMultiplier),
        arrival_time: new Date(departureTime.getTime() + (25 * baseMultiplier * 60000)).toISOString(),
        conditions: 'Current traffic conditions'
      },
      {
        type: 'pessimistic',
        duration_minutes: Math.floor(35 * baseMultiplier * 1.2),
        arrival_time: new Date(departureTime.getTime() + (35 * baseMultiplier * 1.2 * 60000)).toISOString(),
        conditions: 'Heavy traffic, potential delays'
      }
    ],
    traffic_impact: {
      delay_minutes: Math.floor(baseMultiplier * 10),
      congestion_level: database.getBaseCongestionForHour(hour),
      recommended_departure: new Date(departureTime.getTime() - (baseMultiplier * 10 * 60000)).toISOString()
    }
  };
}

module.exports = router;