const express = require('express');
const router = express.Router();
const database = require('../database');

// Get traffic analytics dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    const segments = await database.getRoadSegments();
    const segmentIds = segments.map(s => s.segment_id);
    
    // Generate date range based on timeRange parameter
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '1h':
        startDate.setHours(endDate.getHours() - 1);
        break;
      case '24h':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      default:
        startDate.setDate(endDate.getDate() - 1);
    }
    
    const dateRange = { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] };
    const historicalData = await database.getTrafficAnalytics(dateRange, segmentIds);
    
    const dashboardData = {
      overview: {
        total_segments: segments.length,
        monitored_area: 'San Francisco Bay Area',
        data_points: historicalData.length,
        uptime_percentage: 99.8
      },
      key_metrics: {
        average_congestion: historicalData.reduce((sum, d) => sum + d.avg_congestion, 0) / historicalData.length || 0,
        average_speed: historicalData.reduce((sum, d) => sum + d.avg_speed, 0) / historicalData.length || 0,
        peak_congestion: Math.max(...historicalData.map(d => d.avg_congestion)),
        total_vehicles: historicalData.reduce((sum, d) => sum + d.total_vehicles, 0)
      },
      trends: {
        congestion_change: Math.random() * 0.2 - 0.1, // Random trend between -10% and +10%
        speed_change: Math.random() * 0.15 - 0.075, // Random trend between -7.5% and +7.5%
        incidents_change: Math.random() * 0.3 - 0.15 // Random trend between -15% and +15%
      },
      charts: {
        congestion_over_time: generateCongestionChart(historicalData),
        speed_distribution: generateSpeedDistribution(historicalData),
        hourly_patterns: generateHourlyPatterns(historicalData),
        segment_performance: generateSegmentPerformance(segments, historicalData)
      }
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      time_range: timeRange,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching analytics dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data',
      message: error.message
    });
  }
});

// Get congestion heatmap analytics
router.get('/heatmap-analytics', async (req, res) => {
  try {
    const { date, hour } = req.query;
    
    const segments = await database.getRoadSegments();
    const analyticsData = [];
    
    segments.forEach(segment => {
      const baseCongestion = Math.random() * 0.8; // Random congestion level
      const intensity = baseCongestion;
      
      analyticsData.push({
        segment_id: segment.segment_id,
        name: segment.name,
        coordinates: segment.coordinates,
        congestion_level: baseCongestion,
        intensity: intensity,
        frequency: Math.random(), // How often this area is congested
        severity: baseCongestion > 0.7 ? 'high' : baseCongestion > 0.4 ? 'medium' : 'low'
      });
    });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: analyticsData,
      metadata: {
        date: date || new Date().toISOString().split('T')[0],
        hour: hour || new Date().getHours(),
        total_segments: analyticsData.length,
        high_congestion_areas: analyticsData.filter(a => a.severity === 'high').length
      }
    });
  } catch (error) {
    console.error('Error fetching heatmap analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch heatmap analytics',
      message: error.message
    });
  }
});

// Get predictive analytics
router.get('/predictions', async (req, res) => {
  try {
    const { timeframe = '1h' } = req.query;
    
    const segments = await database.getRoadSegments();
    const predictions = [];
    
    segments.forEach(segment => {
      const currentHour = new Date().getHours();
      const baseCongestion = database.getBaseCongestionForHour(currentHour);
      
      predictions.push({
        segment_id: segment.segment_id,
        name: segment.name,
        current_congestion: baseCongestion,
        predicted_congestion: this.predictCongestion(baseCongestion, timeframe),
        confidence: 0.8 + Math.random() * 0.2, // 80-100% confidence
        factors: [
          'historical_patterns',
          'weather_conditions',
          'time_of_day',
          'day_of_week'
        ],
        recommendations: this.generatePredictiveRecommendations(baseCongestion)
      });
    });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeframe: timeframe,
      data: predictions
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch predictions',
      message: error.message
    });
  }
});

// Get comparative analytics
router.get('/comparative', async (req, res) => {
  try {
    const { period1, period2, metrics } = req.query;
    
    const segments = await database.getRoadSegments();
    const segmentIds = segments.map(s => s.segment_id);
    
    const comparison = {
      period1: period1 || '2024-01-01,2024-01-31',
      period2: period2 || '2024-02-01,2024-02-29',
      metrics: metrics ? metrics.split(',') : ['congestion', 'speed', 'incidents'],
      data: {
        congestion_change: Math.random() * 0.4 - 0.2,
        speed_change: Math.random() * 0.3 - 0.15,
        incidents_change: Math.random() * 0.5 - 0.25,
        efficiency_change: Math.random() * 0.2 - 0.1
      },
      insights: [
        {
          metric: 'congestion',
          change: Math.random() * 0.4 - 0.2,
          interpretation: 'Traffic congestion has shown significant variation between periods',
          factors: ['seasonal_patterns', 'infrastructure_changes', 'behavioral_shifts']
        },
        {
          metric: 'speed',
          change: Math.random() * 0.3 - 0.15,
          interpretation: 'Average speeds reflect changing traffic conditions',
          factors: ['road_improvements', 'traffic_management', 'weather_impact']
        }
      ]
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: comparison
    });
  } catch (error) {
    console.error('Error fetching comparative analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comparative analytics',
      message: error.message
    });
  }
});

// Get traffic pattern analysis
router.get('/patterns', async (req, res) => {
  try {
    const { segment_id, pattern_type = 'daily' } = req.query;
    
    const patterns = {
      daily: this.generateDailyPattern(segment_id),
      weekly: this.generateWeeklyPattern(segment_id),
      monthly: this.generateMonthlyPattern(segment_id),
      seasonal: this.generateSeasonalPattern(segment_id)
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      pattern_type: pattern_type,
      data: patterns[pattern_type] || patterns.daily
    });
  } catch (error) {
    console.error('Error fetching traffic patterns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch traffic patterns',
      message: error.message
    });
  }
});

// Helper functions for generating chart data
function generateCongestionChart(historicalData) {
  return {
    type: 'line',
    data: historicalData.map(d => ({
      x: `${d.date} ${d.hour}:00`,
      y: d.avg_congestion
    })),
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  };
}

function generateSpeedDistribution(historicalData) {
  const speeds = historicalData.map(d => d.avg_speed);
  const distribution = {
    '0-20 mph': speeds.filter(s => s < 20).length,
    '20-40 mph': speeds.filter(s => s >= 20 && s < 40).length,
    '40-60 mph': speeds.filter(s => s >= 40 && s < 60).length,
    '60+ mph': speeds.filter(s => s >= 60).length
  };
  
  return {
    type: 'doughnut',
    data: Object.entries(distribution).map(([label, value]) => ({ label, value })),
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  };
}

function generateHourlyPatterns(historicalData) {
  const hourlyData = {};
  
  for (let hour = 0; hour < 24; hour++) {
    const hourData = historicalData.filter(d => d.hour === hour);
    hourlyData[hour] = {
      avg_congestion: hourData.reduce((sum, d) => sum + d.avg_congestion, 0) / hourData.length || 0,
      avg_speed: hourData.reduce((sum, d) => sum + d.avg_speed, 0) / hourData.length || 0
    };
  }
  
  return {
    type: 'bar',
    data: Object.entries(hourlyData).map(([hour, data]) => ({
      x: `${hour}:00`,
      y: data.avg_congestion
    })),
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  };
}

function generateSegmentPerformance(segments, historicalData) {
  return segments.map(segment => {
    const segmentData = historicalData.filter(d => d.segment_id === segment.segment_id);
    return {
      name: segment.name,
      avg_congestion: segmentData.reduce((sum, d) => sum + d.avg_congestion, 0) / segmentData.length || 0,
      avg_speed: segmentData.reduce((sum, d) => sum + d.avg_speed, 0) / segmentData.length || 0,
      reliability: 0.8 + Math.random() * 0.2
    };
  });
}

// Helper methods for predictions
function predictCongestion(baseCongestion, timeframe) {
  const hour = new Date().getHours();
  const predictedHour = hour + (timeframe === '1h' ? 1 : timeframe === '2h' ? 2 : timeframe === '6h' ? 6 : 1);
  const basePrediction = database.getBaseCongestionForHour(predictedHour);
  
  return Math.max(0, Math.min(1, baseCongestion + (basePrediction - baseCongestion) * 0.5 + (Math.random() - 0.5) * 0.1));
}

function generatePredictiveRecommendations(congestion) {
  const recommendations = [];
  
  if (congestion > 0.7) {
    recommendations.push('Consider alternative routes due to high predicted congestion');
    recommendations.push('Leave earlier to account for delays');
  } else if (congestion > 0.4) {
    recommendations.push('Monitor traffic conditions for changes');
    recommendations.push('Have backup routes ready');
  } else {
    recommendations.push('Good traffic conditions expected');
    recommendations.push('Optimal time for travel');
  }
  
  return recommendations;
}

// Pattern generation methods
function generateDailyPattern(segment_id) {
  const pattern = [];
  for (let hour = 0; hour < 24; hour++) {
    pattern.push({
      hour: hour,
      congestion: database.getBaseCongestionForHour(hour) + (Math.random() - 0.5) * 0.1,
      volume: Math.floor(500 + Math.random() * 2000),
      speed: 60 * (1 - database.getBaseCongestionForHour(hour))
    });
  }
  return pattern;
}

function generateWeeklyPattern(segment_id) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days.map(day => ({
    day: day,
    avg_congestion: Math.random() * 0.8,
    peak_hour: 8 + Math.floor(Math.random() * 4),
    avg_volume: Math.floor(1000 + Math.random() * 3000)
  }));
}

function generateMonthlyPattern(segment_id) {
  const pattern = [];
  for (let month = 1; month <= 12; month++) {
    pattern.push({
      month: month,
      avg_congestion: Math.random() * 0.6 + 0.2,
      seasonal_factor: month <= 2 || month >= 11 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'fall',
      avg_volume: Math.floor(1500 + Math.random() * 2000)
    });
  }
  return pattern;
}

function generateSeasonalPattern(segment_id) {
  const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];
  return seasons.map(season => ({
    season: season,
    avg_congestion: Math.random() * 0.5 + 0.2,
    weather_impact: season === 'Winter' ? 0.3 : season === 'Summer' ? 0.1 : 0.2,
    avg_volume: Math.floor(1200 + Math.random() * 2500)
  }));
}

module.exports = router;