const { Client } = require('pg');
require('dotenv').config();

class Database {
  constructor() {
    this.client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'traffic_monitoring',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    });
    
    this.connected = false;
    this.connect();
  }

  async connect() {
    try {
      await this.client.connect();
      this.connected = true;
      console.log('Connected to PostgreSQL database');
      await this.initializeTables();
    } catch (error) {
      console.error('Database connection error:', error);
      // Fallback to in-memory storage for demo purposes
      this.initializeMemoryStorage();
    }
  }

  async initializeTables() {
    try {
      // Create road_segments table with PostGIS support
      await this.client.query(`
        CREATE EXTENSION IF NOT EXISTS postgis;
        
        CREATE TABLE IF NOT EXISTS road_segments (
          id SERIAL PRIMARY KEY,
          segment_id VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255),
          type VARCHAR(50),
          coordinates GEOMETRY(LINESTRING, 4326),
          length_km FLOAT,
          speed_limit INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create traffic_data table for real-time measurements
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS traffic_data (
          id SERIAL PRIMARY KEY,
          segment_id VARCHAR(50) NOT NULL,
          current_speed FLOAT,
          free_flow_speed FLOAT,
          congestion_level INTEGER,
          travel_time_minutes FLOAT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (segment_id) REFERENCES road_segments(segment_id)
        );
      `);

      // Create traffic_incidents table
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS traffic_incidents (
          id SERIAL PRIMARY KEY,
          incident_id VARCHAR(50) UNIQUE NOT NULL,
          segment_id VARCHAR(50),
          type VARCHAR(50),
          severity INTEGER,
          description TEXT,
          location GEOMETRY(POINT, 4326),
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create historical_traffic table for analytics
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS historical_traffic (
          id SERIAL PRIMARY KEY,
          segment_id VARCHAR(50) NOT NULL,
          date DATE NOT NULL,
          hour INTEGER NOT NULL,
          avg_speed FLOAT,
          avg_congestion FLOAT,
          total_vehicles INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('Database tables initialized');
    } catch (error) {
      console.error('Error initializing database tables:', error);
      this.initializeMemoryStorage();
    }
  }

  initializeMemoryStorage() {
    console.log('Using in-memory storage for demo purposes');
    this.memoryStorage = {
      road_segments: [],
      traffic_data: [],
      traffic_incidents: [],
      historical_traffic: []
    };
  }

  // Road segments operations
  async insertRoadSegment(segment) {
    if (this.connected) {
      const query = `
        INSERT INTO road_segments (segment_id, name, type, coordinates, length_km, speed_limit)
        VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5, $6)
        ON CONFLICT (segment_id) DO NOTHING
      `;
      const coordinates = `LINESTRING(${segment.coordinates.map(c => `${c[1]} ${c[0]}`).join(', ')})`;
      await this.client.query(query, [
        segment.segment_id,
        segment.name,
        segment.type,
        coordinates,
        segment.length_km,
        segment.speed_limit
      ]);
    } else {
      this.memoryStorage.road_segments.push(segment);
    }
  }

  async getRoadSegments(bounds) {
    if (this.connected) {
      const query = `
        SELECT segment_id, name, type, 
               ST_AsGeoJSON(coordinates) as coordinates,
               length_km, speed_limit
        FROM road_segments
        WHERE coordinates && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      `;
      const result = await this.client.query(query, bounds);
      return result.rows.map(row => ({
        ...row,
        coordinates: JSON.parse(row.coordinates).coordinates
      }));
    } else {
      return this.memoryStorage.road_segments;
    }
  }

  // Traffic data operations
  async insertTrafficData(data) {
    if (this.connected) {
      const query = `
        INSERT INTO traffic_data (segment_id, current_speed, free_flow_speed, congestion_level, travel_time_minutes)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await this.client.query(query, [
        data.segment_id,
        data.current_speed,
        data.free_flow_speed,
        data.congestion_level,
        data.travel_time_minutes
      ]);
    } else {
      this.memoryStorage.traffic_data.push({
        ...data,
        timestamp: new Date(),
        id: this.memoryStorage.traffic_data.length + 1
      });
    }
  }

  async getLatestTrafficData(segmentIds) {
    if (this.connected) {
      const query = `
        SELECT DISTINCT ON (segment_id) 
               segment_id, current_speed, free_flow_speed, congestion_level, travel_time_minutes, timestamp
        FROM traffic_data
        WHERE segment_id = ANY($1)
        ORDER BY segment_id, timestamp DESC
      `;
      const result = await this.client.query(query, [segmentIds]);
      return result.rows;
    } else {
      const latestData = {};
      this.memoryStorage.traffic_data.forEach(record => {
        if (segmentIds.includes(record.segment_id)) {
          if (!latestData[record.segment_id] || 
              new Date(record.timestamp) > new Date(latestData[record.segment_id].timestamp)) {
            latestData[record.segment_id] = record;
          }
        }
      });
      return Object.values(latestData);
    }
  }

  // Traffic incidents operations
  async insertTrafficIncident(incident) {
    if (this.connected) {
      const query = `
        INSERT INTO traffic_incidents (incident_id, segment_id, type, severity, description, location, start_time, end_time)
        VALUES ($1, $2, $3, $4, $5, ST_GeomFromText($6, 4326), $7, $8)
        ON CONFLICT (incident_id) DO UPDATE
        SET status = EXCLUDED.status, end_time = EXCLUDED.end_time
      `;
      const location = `POINT(${incident.location[1]} ${incident.location[0]})`;
      await this.client.query(query, [
        incident.incident_id,
        incident.segment_id,
        incident.type,
        incident.severity,
        incident.description,
        location,
        incident.start_time,
        incident.end_time
      ]);
    } else {
      this.memoryStorage.traffic_incidents.push(incident);
    }
  }

  async getActiveIncidents() {
    if (this.connected) {
      const query = `
        SELECT incident_id, segment_id, type, severity, description,
               ST_AsGeoJSON(location) as location, start_time, end_time, status
        FROM traffic_incidents
        WHERE status = 'active'
      `;
      const result = await this.client.query(query);
      return result.rows.map(row => ({
        ...row,
        location: JSON.parse(row.location).coordinates
      }));
    } else {
      return this.memoryStorage.traffic_incidents.filter(i => i.status === 'active');
    }
  }

  // Analytics operations
  async getTrafficAnalytics(dateRange, segmentIds) {
    if (this.connected) {
      const query = `
        SELECT 
          date,
          hour,
          AVG(avg_speed) as avg_speed,
          AVG(avg_congestion) as avg_congestion,
          SUM(total_vehicles) as total_vehicles
        FROM historical_traffic
        WHERE date >= $1 AND date <= $2
          AND segment_id = ANY($3)
        GROUP BY date, hour
        ORDER BY date, hour
      `;
      const result = await this.client.query(query, [dateRange.start, dateRange.end, segmentIds]);
      return result.rows;
    } else {
      // Return sample analytics data for demo
      return this.generateSampleAnalytics(dateRange);
    }
  }

  generateSampleAnalytics(dateRange) {
    const analytics = [];
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      for (let hour = 0; hour < 24; hour++) {
        const baseCongestion = this.getBaseCongestionForHour(hour);
        const randomVariation = (Math.random() - 0.5) * 0.4;
        const avgCongestion = Math.max(0, Math.min(1, baseCongestion + randomVariation));
        
        analytics.push({
          date: new Date(d).toISOString().split('T')[0],
          hour: hour,
          avg_speed: 60 * (1 - avgCongestion),
          avg_congestion: avgCongestion,
          total_vehicles: Math.floor(1000 + Math.random() * 2000)
        });
      }
    }
    
    return analytics;
  }

  getBaseCongestionForHour(hour) {
    // Simulate typical daily traffic patterns
    if (hour >= 7 && hour <= 9) return 0.8; // Morning rush
    if (hour >= 17 && hour <= 19) return 0.9; // Evening rush
    if (hour >= 10 && hour <= 16) return 0.4; // Daytime
    if (hour >= 22 || hour <= 5) return 0.1; // Night
    return 0.3; // Other times
  }
}

module.exports = new Database();