class WebSocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Set();
    this.trafficDataCache = new Map();
    this.incidentDataCache = new Map();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.connectedClients.add(socket);
      
      // Send initial data to newly connected client
      this.sendInitialData(socket);
      
      // Handle client subscriptions
      socket.on('subscribe-traffic', (data) => {
        console.log(`Client ${socket.id} subscribed to traffic updates`);
        socket.join('traffic-updates');
      });
      
      socket.on('subscribe-incidents', (data) => {
        console.log(`Client ${socket.id} subscribed to incident updates`);
        socket.join('incident-updates');
      });
      
      socket.on('subscribe-analytics', (data) => {
        console.log(`Client ${socket.id} subscribed to analytics updates`);
        socket.join('analytics-updates');
      });
      
      // Handle client disconnect
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket);
      });
      
      // Handle client requests
      socket.on('request-traffic-data', (bounds) => {
        this.sendTrafficDataForBounds(socket, bounds);
      });
      
      socket.on('request-incident-data', () => {
        this.sendIncidentData(socket);
      });
      
      socket.on('request-analytics-data', (params) => {
        this.sendAnalyticsData(socket, params);
      });
    });
    
    console.log('WebSocket handler initialized');
  }

  sendInitialData(socket) {
    // Send cached traffic data if available
    if (this.trafficDataCache.size > 0) {
      const trafficData = Array.from(this.trafficDataCache.values());
      socket.emit('initial-traffic-data', {
        timestamp: new Date().toISOString(),
        traffic_data: trafficData,
        summary: this.generateSummary(trafficData)
      });
    }
    
    // Send cached incident data if available
    if (this.incidentDataCache.size > 0) {
      socket.emit('initial-incident-data', {
        timestamp: new Date().toISOString(),
        incidents: Array.from(this.incidentDataCache.values())
      });
    }
  }

  broadcastTrafficUpdate(trafficData) {
    // Update cache
    trafficData.traffic_data.forEach(record => {
      this.trafficDataCache.set(record.segment_id, record);
    });
    
    // Update incident cache
    if (trafficData.incidents) {
      trafficData.incidents.forEach(incident => {
        this.incidentDataCache.set(incident.incident_id, incident);
      });
    }
    
    // Broadcast to all subscribers
    this.io.to('traffic-updates').emit('traffic-update', trafficData);
    
    // Also send to analytics subscribers with additional metrics
    const analyticsData = this.transformForAnalytics(trafficData);
    this.io.to('analytics-updates').emit('analytics-update', analyticsData);
    
    console.log(`Broadcasted traffic update to ${this.connectedClients.size} clients`);
  }

  broadcastIncidentUpdate(incidentData) {
    // Update incident cache
    incidentData.incidents.forEach(incident => {
      this.incidentDataCache.set(incident.incident_id, incident);
    });
    
    // Broadcast to incident subscribers
    this.io.to('incident-updates').emit('incident-update', incidentData);
    console.log(`Broadcasted incident update to ${this.connectedClients.size} clients`);
  }

  sendTrafficDataForBounds(socket, bounds) {
    // Filter cached data by geographic bounds
    const filteredData = Array.from(this.trafficDataCache.values()).filter(record => {
      // Simple bounds filtering - in production, use PostGIS spatial queries
      return true; // Placeholder for actual spatial filtering
    });
    
    socket.emit('traffic-data-bounds', {
      bounds: bounds,
      traffic_data: filteredData,
      timestamp: new Date().toISOString()
    });
  }

  sendIncidentData(socket) {
    const incidents = Array.from(this.incidentDataCache.values());
    socket.emit('incident-data', {
      timestamp: new Date().toISOString(),
      incidents: incidents
    });
  }

  sendAnalyticsData(socket, params) {
    // Generate analytics data based on parameters
    const analyticsData = this.generateAnalyticsData(params);
    socket.emit('analytics-data', analyticsData);
  }

  transformForAnalytics(trafficData) {
    const currentTime = new Date();
    const hour = currentTime.getHours();
    
    return {
      timestamp: trafficData.timestamp,
      real_time: {
        total_segments: trafficData.summary.total_segments,
        average_congestion: trafficData.summary.average_congestion,
        average_speed: trafficData.summary.average_speed,
        severity_distribution: trafficData.summary.severity_distribution
      },
      hourly_trends: {
        hour: hour,
        peak_congestion: this.getPeakCongestion(hour),
        typical_patterns: this.getTypicalPatterns(hour)
      },
      predictions: {
        next_hour_congestion: this.predictNextHourCongestion(trafficData.summary.average_congestion, hour),
        recommendations: this.generateRecommendations(trafficData.summary)
      }
    };
  }

  generateAnalyticsData(params) {
    const { timeRange, metrics, filters } = params;
    
    return {
      timestamp: new Date().toISOString(),
      time_range: timeRange,
      metrics: {
        congestion_trends: this.generateCongestionTrends(timeRange),
        speed_analysis: this.generateSpeedAnalysis(timeRange),
        incident_frequency: this.generateIncidentFrequency(timeRange),
        route_performance: this.generateRoutePerformance(timeRange)
      },
      insights: {
        peak_hours: this.identifyPeakHours(),
        congestion_hotspots: this.identifyCongestionHotspots(),
        improvement_recommendations: this.generateImprovementRecommendations()
      }
    };
  }

  getPeakCongestion(hour) {
    // Simulate typical daily congestion patterns
    if (hour >= 7 && hour <= 9) return 0.8;
    if (hour >= 17 && hour <= 19) return 0.85;
    if (hour >= 10 && hour <= 16) return 0.4;
    if (hour >= 22 || hour <= 5) return 0.1;
    return 0.3;
  }

  getTypicalPatterns(hour) {
    return {
      weekday_pattern: hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19 ? 'high' : 'normal',
      weekend_pattern: hour >= 12 && hour <= 20 ? 'moderate' : 'low',
      seasonal_variation: Math.random() * 0.3
    };
  }

  predictNextHourCongestion(currentCongestion, hour) {
    // Simple prediction based on current state and typical patterns
    const basePrediction = this.getPeakCongestion(hour + 1);
    const trendFactor = (basePrediction - currentCongestion) * 0.5;
    return Math.max(0, Math.min(1, currentCongestion + trendFactor + (Math.random() - 0.5) * 0.1));
  }

  generateRecommendations(summary) {
    const recommendations = [];
    
    if (summary.average_congestion > 0.7) {
      recommendations.push({
        type: 'congestion_alert',
        priority: 'high',
        message: 'High congestion detected. Consider alternative routes.',
        actions: ['route_alternatives', 'departure_delay']
      });
    }
    
    if (summary.severity_distribution.heavy > summary.total_segments * 0.3) {
      recommendations.push({
        type: 'incident_alert',
        priority: 'critical',
        message: 'Multiple heavy congestion areas detected.',
        actions: ['incident_avoidance', 'real_time_updates']
      });
    }
    
    recommendations.push({
      type: 'optimization',
      priority: 'medium',
      message: 'Monitor traffic patterns for optimal route planning.',
      actions: ['pattern_analysis', 'predictive_routing']
    });
    
    return recommendations;
  }

  generateCongestionTrends(timeRange) {
    // Generate sample congestion trend data
    const trends = [];
    const startTime = new Date(timeRange.start);
    const endTime = new Date(timeRange.end);
    
    for (let time = new Date(startTime); time <= endTime; time.setHours(time.getHours() + 1)) {
      trends.push({
        timestamp: new Date(time).toISOString(),
        congestion_level: this.getPeakCongestion(time.getHours()) + (Math.random() - 0.5) * 0.2,
        segment_count: Math.floor(10 + Math.random() * 5)
      });
    }
    
    return trends;
  }

  generateSpeedAnalysis(timeRange) {
    return {
      average_speed: 45 + Math.random() * 20,
      speed_distribution: {
        free_flow: Math.random() * 0.4,
        moderate: Math.random() * 0.3,
        heavy: Math.random() * 0.2,
        standstill: Math.random() * 0.1
      },
      speed_trends: this.generateCongestionTrends(timeRange)
    };
  }

  generateIncidentFrequency(timeRange) {
    return {
      total_incidents: Math.floor(Math.random() * 50),
      incidents_by_type: {
        accident: Math.floor(Math.random() * 20),
        construction: Math.floor(Math.random() * 15),
        closure: Math.floor(Math.random() * 10),
        weather: Math.floor(Math.random() * 5)
      },
      average_resolution_time: 45 + Math.random() * 60
    };
  }

  generateRoutePerformance(timeRange) {
    return {
      average_travel_time: 25 + Math.random() * 15,
      on_time_performance: 0.75 + Math.random() * 0.2,
      route_efficiency: 0.8 + Math.random() * 0.15
    };
  }

  identifyPeakHours() {
    return [
      { hour: 8, congestion_level: 0.85, type: 'morning_rush' },
      { hour: 18, congestion_level: 0.9, type: 'evening_rush' },
      { hour: 12, congestion_level: 0.5, type: 'lunch_time' }
    ];
  }

  identifyCongestionHotspots() {
    return [
      { segment_id: 'hwy_101_north', name: 'Highway 101 North', avg_congestion: 0.8 },
      { segment_id: 'bay_bridge_east', name: 'Bay Bridge East', avg_congestion: 0.9 },
      { segment_id: 'market_st', name: 'Market Street', avg_congestion: 0.7 }
    ];
  }

  generateImprovementRecommendations() {
    return [
      {
        area: 'Highway 101 Corridor',
        issue: 'Consistent heavy congestion during peak hours',
        recommendation: 'Consider variable speed limits and ramp metering',
        expected_impact: '15-20% reduction in travel time'
      },
      {
        area: 'Bay Bridge Approach',
        issue: 'Bridge bottleneck causing backups',
        recommendation: 'Optimize traffic signal timing and add lanes',
        expected_impact: '25-30% improvement in throughput'
      }
    ];
  }

  generateSummary(trafficData) {
    if (!trafficData || trafficData.length === 0) {
      return {
        total_segments: 0,
        average_congestion: 0,
        average_speed: 0,
        severity_distribution: { free: 0, light: 0, moderate: 0, heavy: 0 }
      };
    }

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
      severity_distribution: severityCounts
    };
  }
}

module.exports = WebSocketHandler;