const { v4: uuidv4 } = require('uuid');
const database = require('../database');

class TrafficGenerator {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.updateInterval = 30000; // 30 seconds
    this.roadSegments = this.initializeRoadSegments();
    this.incidentTypes = ['accident', 'construction', 'closure', 'weather', 'event'];
    this.severityLevels = [1, 2, 3, 4, 5]; // 1=low, 5=critical
  }

  initializeRoadSegments() {
    return [
      // Major highways and arterial roads
      { segment_id: 'hwy_101_north', name: 'Highway 101 North', type: 'highway', length_km: 12.5, speed_limit: 100, coordinates: [[37.7749, -122.4194], [37.8044, -122.2711]] },
      { segment_id: 'hwy_101_south', name: 'Highway 101 South', type: 'highway', length_km: 12.5, speed_limit: 100, coordinates: [[37.8044, -122.2711], [37.7749, -122.4194]] },
      { segment_id: 'hwy_280_north', name: 'Highway 280 North', type: 'highway', length_km: 15.2, speed_limit: 110, coordinates: [[37.7749, -122.4194], [37.8044, -122.2711]] },
      { segment_id: 'hwy_280_south', name: 'Highway 280 South', type: 'highway', length_km: 15.2, speed_limit: 110, coordinates: [[37.8044, -122.2711], [37.7749, -122.4194]] },
      
      // Urban arterial roads
      { segment_id: 'market_st', name: 'Market Street', type: 'arterial', length_km: 3.2, speed_limit: 50, coordinates: [[37.7849, -122.4094], [37.7749, -122.4194]] },
      { segment_id: 'van_ness Ave', name: 'Van Ness Avenue', type: 'arterial', length_km: 4.1, speed_limit: 45, coordinates: [[37.8044, -122.4211], [37.7749, -122.4194]] },
      { segment_id: 'geary_blvd', name: 'Geary Boulevard', type: 'arterial', length_km: 8.5, speed_limit: 40, coordinates: [[37.7849, -122.4094], [37.7749, -122.4594]] },
      { segment_id: 'lombard_st', name: 'Lombard Street', type: 'arterial', length_km: 2.8, speed_limit: 35, coordinates: [[37.8044, -122.4211], [37.7944, -122.4311]] },
      
      // Residential streets
      { segment_id: 'fillmore_st', name: 'Fillmore Street', type: 'residential', length_km: 2.1, speed_limit: 30, coordinates: [[37.7849, -122.4294], [37.7749, -122.4194]] },
      { segment_id: 'haight_st', name: 'Haight Street', type: 'residential', length_km: 1.8, speed_limit: 25, coordinates: [[37.7749, -122.4294], [37.7649, -122.4394]] },
      { segment_id: 'castro_st', name: 'Castro Street', type: 'residential', length_km: 1.5, speed_limit: 25, coordinates: [[37.7649, -122.4394], [37.7549, -122.4494]] },
      { segment_id: 'mission_st', name: 'Mission Street', type: 'arterial', length_km: 5.2, speed_limit: 35, coordinates: [[37.7849, -122.4094], [37.7649, -122.4194]] },
      
      // Bridge approaches
      { segment_id: 'bay_bridge_east', name: 'Bay Bridge East Approach', type: 'highway', length_km: 4.8, speed_limit: 80, coordinates: [[37.8044, -122.4211], [37.8244, -122.4011]] },
      { segment_id: 'bay_bridge_west', name: 'Bay Bridge West Approach', type: 'highway', length_km: 4.8, speed_limit: 80, coordinates: [[37.8244, -122.4011], [37.8044, -122.4211]] },
      { segment_id: 'golden_gate_north', name: 'Golden Gate Bridge North', type: 'highway', length_km: 2.7, speed_limit: 70, coordinates: [[37.8044, -122.4711], [37.8344, -122.4811]] },
      { segment_id: 'golden_gate_south', name: 'Golden Gate Bridge South', type: 'highway', length_km: 2.7, speed_limit: 70, coordinates: [[37.8344, -122.4811], [37.8044, -122.4711]] }
    ];
  }

  start(callback) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.callback = callback;
    
    // Initialize road segments in database
    this.roadSegments.forEach(segment => {
      database.insertRoadSegment(segment);
    });
    
    // Generate initial traffic data
    this.generateTrafficData();
    
    // Start periodic updates
    this.interval = setInterval(() => {
      this.generateTrafficData();
    }, this.updateInterval);
    
    console.log('Traffic generator started with 30-second update interval');
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    console.log('Traffic generator stopped');
  }

  generateTrafficData() {
    const timestamp = new Date();
    const trafficData = [];
    const incidents = [];
    
    // Generate traffic data for each road segment
    this.roadSegments.forEach(segment => {
      const trafficRecord = this.generateTrafficRecord(segment, timestamp);
      trafficData.push(trafficRecord);
      
      // Occasionally generate incidents (5% chance per segment)
      if (Math.random() < 0.05) {
        const incident = this.generateIncident(segment, timestamp);
        incidents.push(incident);
      }
    });
    
    // Store data in database
    trafficData.forEach(record => {
      database.insertTrafficData(record);
    });
    
    incidents.forEach(incident => {
      database.insertTrafficIncident(incident);
    });
    
    // Broadcast updates
    if (this.callback) {
      this.callback({
        timestamp: timestamp.toISOString(),
        traffic_data: trafficData,
        incidents: incidents,
        summary: this.generateSummary(trafficData)
      });
    }
  }

  generateTrafficRecord(segment, timestamp) {
    const hour = timestamp.getHours();
    const baseCongestion = this.getBaseCongestionForHour(hour);
    const randomVariation = (Math.random() - 0.5) * 0.3;
    const congestionLevel = Math.max(0, Math.min(1, baseCongestion + randomVariation));
    
    const currentSpeed = segment.speed_limit * (1 - congestionLevel);
    const travelTimeMinutes = (segment.length_km / currentSpeed) * 60;
    
    return {
      segment_id: segment.segment_id,
      current_speed: Math.round(currentSpeed),
      free_flow_speed: segment.speed_limit,
      congestion_level: Math.round(congestionLevel * 100) / 100,
      travel_time_minutes: Math.round(travelTimeMinutes * 10) / 10
    };
  }

  generateIncident(segment, timestamp) {
    const incidentType = this.incidentTypes[Math.floor(Math.random() * this.incidentTypes.length)];
    const severity = this.severityLevels[Math.floor(Math.random() * this.severityLevels.length)];
    
    const descriptions = {
      accident: ['Multi-vehicle collision', 'Rear-end collision', 'Sideswipe accident', 'Single vehicle crash'],
      construction: ['Lane closure for maintenance', 'Road construction ahead', 'Bridge repair work', 'Utility work'],
      closure: ['Road closure due to event', 'Emergency road closure', 'Police activity', 'Special event closure'],
      weather: ['Heavy rain conditions', 'Fog advisory', 'High winds', 'Flooding'],
      event: ['Sporting event traffic', 'Concert venue traffic', 'Festival traffic', 'Parade route']
    };
    
    const description = descriptions[incidentType][Math.floor(Math.random() * descriptions[incidentType].length)];
    
    // Random location along the segment
    const [startLat, startLng] = segment.coordinates[0];
    const [endLat, endLng] = segment.coordinates[1];
    const randomFactor = Math.random();
    
    const incidentLat = startLat + (endLat - startLat) * randomFactor;
    const incidentLng = startLng + (endLng - startLng) * randomFactor;
    
    return {
      incident_id: uuidv4(),
      segment_id: segment.segment_id,
      type: incidentType,
      severity: severity,
      description: description,
      location: [incidentLat, incidentLng],
      start_time: timestamp,
      end_time: new Date(timestamp.getTime() + (30 + Math.random() * 120) * 60000), // 30-150 minutes
      status: 'active'
    };
  }

  getBaseCongestionForHour(hour) {
    // Simulate realistic daily traffic patterns
    if (hour >= 7 && hour <= 9) return 0.75; // Morning rush hour
    if (hour >= 17 && hour <= 19) return 0.85; // Evening rush hour
    if (hour >= 10 && hour <= 16) return 0.35; // Daytime
    if (hour >= 22 || hour <= 5) return 0.1; // Night time
    return 0.25; // Other times
  }

  generateSummary(trafficData) {
    const totalSegments = trafficData.length;
    const avgCongestion = trafficData.reduce((sum, record) => sum + record.congestion_level, 0) / totalSegments;
    const avgSpeed = trafficData.reduce((sum, record) => sum + record.current_speed, 0) / totalSegments;
    
    const severityCounts = {
      free: trafficData.filter(r => r.congestion_level < 0.2).length,
      light: trafficData.filter(r => r.congestion_level >= 0.2 && r.congestion_level < 0.4).length,
      moderate: trafficData.filter(r => r.congestion_level >= 0.4 && r.congestion_level < 0.7).length,
      heavy: trafficData.filter(r => r.congestion_level >= 0.7).length
    };
    
    return {
      total_segments: totalSegments,
      average_congestion: Math.round(avgCongestion * 100) / 100,
      average_speed: Math.round(avgSpeed),
      severity_distribution: severityCounts,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = TrafficGenerator;