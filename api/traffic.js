const express = require('express');
const router = express.Router();
const database = require('../database');

// Get real-time traffic data
router.get('/realtime', async (req, res) => {
  try {
    const { bounds, segments } = req.query;
    
    let segmentIds = [];
    if (segments) {
      segmentIds = segments.split(',');
    } else {
      // Get all segments if none specified
      const segments = await database.getRoadSegments();
      segmentIds = segments.map(s => s.segment_id);
    }
    
    const trafficData = await database.getLatestTrafficData(segmentIds);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: trafficData,
      count: trafficData.length
    });
  } catch (error) {
    console.error('Error fetching real-time traffic data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch traffic data',
      message: error.message
    });
  }
});

// Get traffic incidents
router.get('/incidents', async (req, res) => {
  try {
    const { active, type, severity } = req.query;
    
    let incidents = await database.getActiveIncidents();
    
    // Apply filters
    if (type) {
      incidents = incidents.filter(i => i.type === type);
    }
    if (severity) {
      incidents = incidents.filter(i => i.severity === parseInt(severity));
    }
    if (active === 'true') {
      incidents = incidents.filter(i => i.status === 'active');
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: incidents,
      count: incidents.length
    });
  } catch (error) {
    console.error('Error fetching traffic incidents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incidents',
      message: error.message
    });
  }
});

// Get road segments
router.get('/segments', async (req, res) => {
  try {
    const { bounds, type } = req.query;
    
    let segments = await database.getRoadSegments();
    
    if (type) {
      segments = segments.filter(s => s.type === type);
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: segments,
      count: segments.length
    });
  } catch (error) {
    console.error('Error fetching road segments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch road segments',
      message: error.message
    });
  }
});

// Get historical traffic data
router.get('/historical', async (req, res) => {
  try {
    const { start_date, end_date, segments, aggregation } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required'
      });
    }
    
    const segmentIds = segments ? segments.split(',') : [];
    const dateRange = { start: start_date, end: end_date };
    
    const analyticsData = await database.getTrafficAnalytics(dateRange, segmentIds);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: analyticsData,
      count: analyticsData.length,
      aggregation: aggregation || 'hourly'
    });
  } catch (error) {
    console.error('Error fetching historical traffic data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch historical data',
      message: error.message
    });
  }
});

// Get traffic summary
router.get('/summary', async (req, res) => {
  try {
    const segments = await database.getRoadSegments();
    const segmentIds = segments.map(s => s.segment_id);
    const trafficData = await database.getLatestTrafficData(segmentIds);
    
    const summary = {
      total_segments: trafficData.length,
      average_congestion: trafficData.reduce((sum, record) => sum + record.congestion_level, 0) / trafficData.length,
      average_speed: trafficData.reduce((sum, record) => sum + record.current_speed, 0) / trafficData.length,
      severity_distribution: {
        free: trafficData.filter(r => r.congestion_level < 0.2).length,
        light: trafficData.filter(r => r.congestion_level >= 0.2 && r.congestion_level < 0.4).length,
        moderate: trafficData.filter(r => r.congestion_level >= 0.4 && r.congestion_level < 0.7).length,
        heavy: trafficData.filter(r => r.congestion_level >= 0.7).length
      }
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: summary
    });
  } catch (error) {
    console.error('Error fetching traffic summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch traffic summary',
      message: error.message
    });
  }
});

// Get congestion heatmap data
router.get('/heatmap', async (req, res) => {
  try {
    const { bounds, zoom } = req.query;
    
    const segments = await database.getRoadSegments();
    const segmentIds = segments.map(s => s.segment_id);
    const trafficData = await database.getLatestTrafficData(segmentIds);
    
    // Transform traffic data into heatmap format
    const heatmapData = trafficData.map(record => {
      const segment = segments.find(s => s.segment_id === record.segment_id);
      return {
        segment_id: record.segment_id,
        name: segment ? segment.name : record.segment_id,
        coordinates: segment ? segment.coordinates : [],
        congestion_level: record.congestion_level,
        current_speed: record.current_speed,
        free_flow_speed: record.free_flow_speed,
        intensity: record.congestion_level // For heatmap visualization
      };
    });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: heatmapData,
      count: heatmapData.length
    });
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch heatmap data',
      message: error.message
    });
  }
});

// POST endpoint to report new incident
router.post('/incidents', async (req, res) => {
  try {
    const { type, severity, description, location, segment_id } = req.body;
    
    if (!type || !severity || !description || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const incident = {
      incident_id: require('uuid').v4(),
      segment_id: segment_id || null,
      type: type,
      severity: severity,
      description: description,
      location: location,
      start_time: new Date(),
      end_time: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      status: 'active'
    };
    
    await database.insertTrafficIncident(incident);
    
    res.json({
      success: true,
      message: 'Incident reported successfully',
      data: incident
    });
  } catch (error) {
    console.error('Error reporting incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report incident',
      message: error.message
    });
  }
});

module.exports = router;