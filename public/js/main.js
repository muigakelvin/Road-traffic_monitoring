class TrafficMonitoringSystem {
    constructor() {
        this.map = null;
        this.socket = null;
        this.trafficData = new Map();
        this.incidents = new Map();
        this.trafficLayers = new Map();
        this.updateInterval = null;
        this.dataUpdateCount = 0;
        
        this.init();
    }

    async init() {
        try {
            await this.initializeMap();
            await this.initializeWebSocket();
            await this.loadInitialData();
            this.setupEventListeners();
            this.startPeriodicUpdates();
            
            console.log('Traffic Monitoring System initialized successfully');
        } catch (error) {
            console.error('Error initializing system:', error);
            this.showError('Failed to initialize system. Please refresh the page.');
        }
    }

    async initializeMap() {
        // Initialize Leaflet map centered on San Francisco
        this.map = L.map('map', {
            center: [37.7749, -122.4194],
            zoom: 11,
            zoomControl: false,
            attributionControl: true
        });

        // Add custom tile layer with dark theme
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        // Add custom controls
        L.control.zoom({
            position: 'topright'
        }).addTo(this.map);

        // Add scale control
        L.control.scale({
            position: 'bottomleft',
            imperial: false
        }).addTo(this.map);

        console.log('Map initialized');
    }

    async initializeWebSocket() {
        // Connect to WebSocket server
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            this.updateConnectionStatus('connected');
            
            // Subscribe to traffic updates
            this.socket.emit('subscribe-traffic');
            this.socket.emit('subscribe-incidents');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            this.updateConnectionStatus('disconnected');
        });

        this.socket.on('traffic-update', (data) => {
            this.handleTrafficUpdate(data);
        });

        this.socket.on('incident-update', (data) => {
            this.handleIncidentUpdate(data);
        });

        this.socket.on('initial-traffic-data', (data) => {
            this.handleInitialTrafficData(data);
        });

        this.socket.on('initial-incident-data', (data) => {
            this.handleInitialIncidentData(data);
        });

        console.log('WebSocket initialized');
    }

    async loadInitialData() {
        try {
            // Load road segments
            const segmentsResponse = await fetch('/api/traffic/segments');
            const segmentsData = await segmentsResponse.json();
            
            if (segmentsData.success) {
                this.roadSegments = new Map(segmentsData.data.map(s => [s.segment_id, s]));
                console.log(`Loaded ${segmentsData.data.length} road segments`);
            }

            // Load initial traffic data
            const trafficResponse = await fetch('/api/traffic/realtime');
            const trafficData = await trafficResponse.json();
            
            if (trafficData.success) {
                this.updateTrafficData(trafficData.data);
                console.log(`Loaded initial traffic data for ${trafficData.data.length} segments`);
            }

            // Load initial incidents
            const incidentsResponse = await fetch('/api/traffic/incidents');
            const incidentsData = await incidentsResponse.json();
            
            if (incidentsData.success) {
                this.updateIncidents(incidentsData.data);
                console.log(`Loaded ${incidentsData.data.length} incidents`);
            }

            this.renderTrafficList();
            this.renderIncidentsList();
            this.updateBottomPanel();

        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    setupEventListeners() {
        // Map control buttons
        document.getElementById('locate-btn').addEventListener('click', () => {
            this.locateUser();
        });

        document.getElementById('fullscreen-btn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshData();
        });

        // Search and filters
        document.getElementById('road-search').addEventListener('input', (e) => {
            this.filterTrafficData(e.target.value);
        });

        document.getElementById('road-type-filter').addEventListener('change', (e) => {
            this.filterByRoadType(e.target.value);
        });

        document.getElementById('congestion-filter').addEventListener('change', (e) => {
            this.filterByCongestion(e.target.value);
        });

        // Window resize
        window.addEventListener('resize', () => {
            if (this.map) {
                this.map.invalidateSize();
            }
        });

        console.log('Event listeners setup complete');
    }

    startPeriodicUpdates() {
        // Update timestamp every second
        this.updateInterval = setInterval(() => {
            this.updateTimestamp();
        }, 1000);

        console.log('Periodic updates started');
    }

    handleTrafficUpdate(data) {
        console.log('Received traffic update:', data.timestamp);
        
        this.dataUpdateCount++;
        this.updateTrafficData(data.traffic_data);
        this.renderTrafficList();
        this.updateBottomPanel();
        this.updateMapLayers();
        
        // Animate update
        this.animateTrafficUpdate();
    }

    handleIncidentUpdate(data) {
        console.log('Received incident update:', data.timestamp);
        
        this.updateIncidents(data.incidents);
        this.renderIncidentsList();
        this.updateBottomPanel();
    }

    handleInitialTrafficData(data) {
        console.log('Received initial traffic data');
        this.updateTrafficData(data.traffic_data);
        this.renderTrafficList();
        this.updateBottomPanel();
        this.updateMapLayers();
    }

    handleInitialIncidentData(data) {
        console.log('Received initial incident data');
        this.updateIncidents(data.incidents);
        this.renderIncidentsList();
        this.updateBottomPanel();
    }

    updateTrafficData(trafficData) {
        trafficData.forEach(record => {
            this.trafficData.set(record.segment_id, record);
        });
    }

    updateIncidents(incidents) {
        incidents.forEach(incident => {
            this.incidents.set(incident.incident_id, incident);
        });
    }

    renderTrafficList() {
        const trafficList = document.getElementById('traffic-list');
        
        if (this.trafficData.size === 0) {
            trafficList.innerHTML = '<div class="loading">No traffic data available</div>';
            return;
        }

        const trafficArray = Array.from(this.trafficData.values());
        const html = trafficArray.map(record => {
            const segment = this.roadSegments.get(record.segment_id);
            const status = this.getCongestionStatus(record.congestion_level);
            
            return `
                <div class="traffic-item fade-in" data-segment-id="${record.segment_id}">
                    <div class="traffic-item-header">
                        <div class="traffic-item-name">${segment ? segment.name : record.segment_id}</div>
                        <div class="traffic-status ${status.class}">${status.label}</div>
                    </div>
                    <div class="traffic-metrics">
                        <div class="metric">
                            <div class="metric-value">${Math.round(record.current_speed)}</div>
                            <div class="metric-label">km/h</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${Math.round(record.congestion_level * 100)}%</div>
                            <div class="metric-label">Congestion</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${Math.round(record.travel_time_minutes)}</div>
                            <div class="metric-label">Minutes</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${segment ? segment.type : 'N/A'}</div>
                            <div class="metric-label">Type</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        trafficList.innerHTML = html;

        // Add click listeners
        trafficList.querySelectorAll('.traffic-item').forEach(item => {
            item.addEventListener('click', () => {
                const segmentId = item.dataset.segmentId;
                this.focusOnSegment(segmentId);
            });
        });
    }

    renderIncidentsList() {
        const incidentsList = document.getElementById('incidents-list');
        
        if (this.incidents.size === 0) {
            incidentsList.innerHTML = '<div style="text-align: center; color: rgba(226, 232, 240, 0.7);">No active incidents</div>';
            return;
        }

        const incidentsArray = Array.from(this.incidents.values());
        const html = incidentsArray.map(incident => `
            <div class="traffic-item fade-in" data-incident-id="${incident.incident_id}">
                <div class="traffic-item-header">
                    <div class="traffic-item-name">${incident.type.toUpperCase()}</div>
                    <div class="traffic-status" style="background: rgba(239, 68, 68, 0.2); color: var(--error-red);">
                        Sev ${incident.severity}
                    </div>
                </div>
                <div style="font-size: 0.85rem; margin-bottom: 8px; color: rgba(226, 232, 240, 0.8);">
                    ${incident.description}
                </div>
                <div style="font-size: 0.8rem; color: rgba(226, 232, 240, 0.6);">
                    ${this.formatTime(incident.start_time)}
                </div>
            </div>
        `).join('');

        incidentsList.innerHTML = html;
    }

    updateBottomPanel() {
        const trafficArray = Array.from(this.trafficData.values());
        const incidentsArray = Array.from(this.incidents.values());
        
        if (trafficArray.length > 0) {
            const avgCongestion = trafficArray.reduce((sum, r) => sum + r.congestion_level, 0) / trafficArray.length;
            const avgSpeed = trafficArray.reduce((sum, r) => sum + r.current_speed, 0) / trafficArray.length;
            
            document.getElementById('total-segments').textContent = trafficArray.length;
            document.getElementById('avg-congestion').textContent = `${Math.round(avgCongestion * 100)}%`;
            document.getElementById('avg-speed').textContent = `${Math.round(avgSpeed)} km/h`;
        }
        
        document.getElementById('active-incidents').textContent = incidentsArray.length;
        document.getElementById('data-updates').textContent = this.dataUpdateCount;
    }

    updateMapLayers() {
        // Clear existing traffic layers
        this.trafficLayers.forEach(layer => {
            this.map.removeLayer(layer);
        });
        this.trafficLayers.clear();

        // Add new traffic layers
        this.trafficData.forEach((record, segmentId) => {
            const segment = this.roadSegments.get(segmentId);
            if (!segment || !segment.coordinates) return;

            const color = this.getCongestionColor(record.congestion_level);
            const weight = Math.max(3, Math.min(8, record.congestion_level * 10));
            
            // Create polyline for road segment
            const polyline = L.polyline(segment.coordinates, {
                color: color,
                weight: weight,
                opacity: 0.8,
                className: 'traffic-segment'
            });

            // Add popup with traffic information
            const popupContent = `
                <div style="color: #2d3748; font-family: Inter, sans-serif;">
                    <h4 style="margin: 0 0 10px 0; color: #1a2332;">${segment.name}</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <strong>Speed:</strong> ${Math.round(record.current_speed)} km/h
                        </div>
                        <div>
                            <strong>Congestion:</strong> ${Math.round(record.congestion_level * 100)}%
                        </div>
                        <div>
                            <strong>Travel Time:</strong> ${Math.round(record.travel_time_minutes)} min
                        </div>
                        <div>
                            <strong>Type:</strong> ${segment.type}
                        </div>
                    </div>
                </div>
            `;
            
            polyline.bindPopup(popupContent);
            polyline.addTo(this.map);
            
            this.trafficLayers.set(segmentId, polyline);
        });

        // Add incident markers
        this.incidents.forEach((incident, incidentId) => {
            if (!incident.location) return;
            
            const marker = L.marker(incident.location, {
                icon: L.divIcon({
                    className: 'incident-marker',
                    html: `<div style="background: var(--error-red); width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
                             <i class="fas fa-exclamation"></i>
                           </div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            });

            const incidentPopup = `
                <div style="color: #2d3748; font-family: Inter, sans-serif;">
                    <h4 style="margin: 0 0 10px 0; color: #ef4444;">${incident.type.toUpperCase()}</h4>
                    <p style="margin: 0 0 10px 0;">${incident.description}</p>
                    <div style="font-size: 0.9rem;">
                        <strong>Severity:</strong> ${incident.severity}/5<br>
                        <strong>Started:</strong> ${this.formatTime(incident.start_time)}
                    </div>
                </div>
            `;
            
            marker.bindPopup(incidentPopup);
            marker.addTo(this.map);
            
            this.trafficLayers.set(`incident_${incidentId}`, marker);
        });
    }

    getCongestionStatus(congestionLevel) {
        if (congestionLevel < 0.2) return { class: 'free', label: 'Free Flow' };
        if (congestionLevel < 0.4) return { class: 'light', label: 'Light' };
        if (congestionLevel < 0.7) return { class: 'moderate', label: 'Moderate' };
        return { class: 'heavy', label: 'Heavy' };
    }

    getCongestionColor(congestionLevel) {
        if (congestionLevel < 0.2) return '#10b981'; // Success green
        if (congestionLevel < 0.4) return '#f59e0b'; // Warning amber
        if (congestionLevel < 0.7) return '#ef4444'; // Error red
        return '#8b5cf6'; // Critical purple
    }

    focusOnSegment(segmentId) {
        const segment = this.roadSegments.get(segmentId);
        if (!segment || !segment.coordinates) return;

        // Calculate bounds for the segment
        const bounds = L.latLngBounds(segment.coordinates);
        this.map.fitBounds(bounds, { padding: [20, 20] });

        // Highlight the segment
        const layer = this.trafficLayers.get(segmentId);
        if (layer) {
            layer.setStyle({ weight: 10, opacity: 1 });
            setTimeout(() => {
                layer.setStyle({ weight: Math.max(3, Math.min(8, this.trafficData.get(segmentId).congestion_level * 10)), opacity: 0.8 });
            }, 2000);
        }
    }

    filterTrafficData(searchTerm) {
        const trafficItems = document.querySelectorAll('.traffic-item');
        trafficItems.forEach(item => {
            const segmentId = item.dataset.segmentId;
            const segment = this.roadSegments.get(segmentId);
            const searchText = segment ? segment.name.toLowerCase() : segmentId.toLowerCase();
            
            if (searchText.includes(searchTerm.toLowerCase())) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    filterByRoadType(type) {
        const trafficItems = document.querySelectorAll('.traffic-item');
        trafficItems.forEach(item => {
            const segmentId = item.dataset.segmentId;
            const segment = this.roadSegments.get(segmentId);
            
            if (!type || (segment && segment.type === type)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    filterByCongestion(level) {
        const trafficItems = document.querySelectorAll('.traffic-item');
        trafficItems.forEach(item => {
            const segmentId = item.dataset.segmentId;
            const record = this.trafficData.get(segmentId);
            
            if (!level || !record) {
                item.style.display = 'block';
            } else {
                const status = this.getCongestionStatus(record.congestion_level);
                if (status.class === level) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            }
        });
    }

    locateUser() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    this.map.setView([latitude, longitude], 15);
                    
                    // Add user location marker
                    L.marker([latitude, longitude], {
                        icon: L.divIcon({
                            className: 'user-location-marker',
                            html: '<div style="background: var(--accent-blue); width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(this.map).bindPopup('Your Location');
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    this.showError('Unable to get your location');
                }
            );
        } else {
            this.showError('Geolocation is not supported by this browser');
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    refreshData() {
        this.dataUpdateCount = 0;
        this.loadInitialData();
        
        // Visual feedback
        const refreshBtn = document.getElementById('refresh-btn');
        refreshBtn.style.transform = 'rotate(360deg)';
        refreshBtn.style.transition = 'transform 0.5s ease';
        setTimeout(() => {
            refreshBtn.style.transform = 'rotate(0deg)';
        }, 500);
    }

    updateConnectionStatus(status) {
        const statusDot = document.getElementById('connection-status');
        const statusText = document.getElementById('data-status');
        
        statusDot.className = 'status-dot';
        
        if (status === 'connected') {
            statusDot.classList.add('success');
            statusText.textContent = 'Live Data';
        } else {
            statusDot.classList.add('error');
            statusText.textContent = 'Disconnected';
        }
    }

    updateTimestamp() {
        const timestamp = new Date().toLocaleTimeString();
        document.getElementById('timestamp').textContent = timestamp;
    }

    animateTrafficUpdate() {
        // Animate traffic list items
        const items = document.querySelectorAll('.traffic-item');
        anime({
            targets: items,
            scale: [1, 1.02, 1],
            duration: 300,
            easing: 'easeInOutQuad',
            delay: anime.stagger(50)
        });

        // Animate map layers
        const layers = document.querySelectorAll('.traffic-segment');
        anime({
            targets: layers,
            opacity: [0.5, 1, 0.8],
            duration: 500,
            easing: 'easeInOutQuad'
        });
    }

    formatTime(timeString) {
        const date = new Date(timeString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    showError(message) {
        // Simple error display - in production, use proper notification system
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(239, 68, 68, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 6px;
            z-index: 10000;
            backdrop-filter: blur(10px);
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.trafficSystem = new TrafficMonitoringSystem();
});