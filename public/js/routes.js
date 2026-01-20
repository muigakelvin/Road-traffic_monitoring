class RoutePlanningSystem {
    constructor() {
        this.map = null;
        this.routeLayer = null;
        this.trafficLayer = null;
        this.originMarker = null;
        this.destinationMarker = null;
        this.selectedRoute = null;
        this.routeOptions = [];
        this.favoriteRoutes = [];
        
        this.init();
    }

    async init() {
        try {
            await this.initializeMap();
            await this.loadFavoriteRoutes();
            this.setupEventListeners();
            this.setDefaultDepartureTime();
            
            console.log('Route planning system initialized');
        } catch (error) {
            console.error('Error initializing route planning system:', error);
        }
    }

    async initializeMap() {
        // Initialize Leaflet map
        this.map = L.map('route-map', {
            center: [37.7749, -122.4194],
            zoom: 11,
            zoomControl: false,
            attributionControl: true
        });

        // Add dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        // Add controls
        L.control.zoom({
            position: 'topright'
        }).addTo(this.map);

        // Initialize route layer
        this.routeLayer = L.layerGroup().addTo(this.map);

        console.log('Route map initialized');
    }

    setupEventListeners() {
        // Route calculation
        document.getElementById('calculate-route-btn').addEventListener('click', () => {
            this.calculateRoute();
        });

        document.getElementById('clear-route-btn').addEventListener('click', () => {
            this.clearRoute();
        });

        // Route options
        document.querySelectorAll('.route-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.route-option').forEach(opt => opt.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
            });
        });

        // Map controls
        document.getElementById('locate-route-btn').addEventListener('click', () => {
            this.locateUser();
        });

        document.getElementById('fullscreen-route-btn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        document.getElementById('traffic-layer-btn').addEventListener('click', () => {
            this.toggleTrafficLayer();
        });

        // Map click for origin/destination selection
        this.map.on('click', (e) => {
            this.handleMapClick(e);
        });

        // Input field changes
        document.getElementById('origin-input').addEventListener('input', (e) => {
            this.geocodeInput(e.target.value, 'origin');
        });

        document.getElementById('destination-input').addEventListener('input', (e) => {
            this.geocodeInput(e.target.value, 'destination');
        });

        // Window resize
        window.addEventListener('resize', () => {
            if (this.map) {
                this.map.invalidateSize();
            }
        });
    }

    setDefaultDepartureTime() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('departure-time').value = now.toISOString().slice(0, 16);
    }

    async loadFavoriteRoutes() {
        try {
            const response = await fetch('/api/routes/favorites');
            const data = await response.json();
            
            if (data.success) {
                this.favoriteRoutes = data.data;
                this.renderFavoriteRoutes();
            }
        } catch (error) {
            console.error('Error loading favorite routes:', error);
        }
    }

    renderFavoriteRoutes() {
        const container = document.getElementById('favorite-routes-list');
        
        if (this.favoriteRoutes.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: rgba(226, 232, 240, 0.7);">No favorite routes yet</div>';
            return;
        }

        const html = this.favoriteRoutes.map(route => `
            <div class="favorite-route fade-in" data-route-id="${route.id}">
                <div class="favorite-route-info">
                    <div class="favorite-route-name">${route.name}</div>
                    <div class="favorite-route-details">
                        ${route.usage_count} uses • Created ${new Date(route.created_at).toLocaleDateString()}
                    </div>
                </div>
                <div class="favorite-route-actions">
                    <button class="action-btn" title="Use Route" onclick="window.routeSystem.useFavoriteRoute('${route.id}')">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-btn" title="Delete Route" onclick="window.routeSystem.deleteFavoriteRoute('${route.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    async calculateRoute() {
        const origin = document.getElementById('origin-input').value;
        const destination = document.getElementById('destination-input').value;
        const departureTime = document.getElementById('departure-time').value;
        const selectedOption = document.querySelector('.route-option.selected').dataset.option;

        if (!origin || !destination) {
            this.showError('Please enter both origin and destination');
            return;
        }

        // Show loading state
        const resultsContainer = document.getElementById('route-results');
        const cardsContainer = document.getElementById('route-cards');
        
        cardsContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                Calculating routes...
            </div>
        `;
        resultsContainer.style.display = 'block';

        try {
            // Call route calculation API
            const response = await fetch('/api/routes/cculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    origin: origin,
                    destination: destination,
                    departure_time: departureTime,
                    preferences: {
                        route_type: selectedOption
                    }
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.routeOptions = data.routes;
                this.renderRouteOptions();
                this.displayRoutesOnMap();
            } else {
                throw new Error(data.error || 'Failed to calculate routes');
            }
        } catch (error) {
            console.error('Error calculating route:', error);
            this.showError('Failed to calculate routes. Please try again.');
            cardsContainer.innerHTML = '<div class="loading">Error calculating routes</div>';
        }
    }

    renderRouteOptions() {
        const container = document.getElementById('route-cards');
        
        const html = this.routeOptions.map((route, index) => `
            <div class="route-card fade-in ${index === 0 ? 'selected' : ''}" 
                 data-route-id="${route.id}" 
                 onclick="window.routeSystem.selectRoute('${route.id}')">
                <div class="route-header">
                    <div class="route-name">${route.name}</div>
                    <div class="route-duration">${Math.round(route.estimated_time)} min</div>
                </div>
                <div class="route-details">
                    <div class="route-detail">
                        <div class="route-detail-value">${route.distance.toFixed(1)} km</div>
                        <div class="route-detail-label">Distance</div>
                    </div>
                    <div class="route-detail">
                        <div class="route-detail-value">${Math.round(route.congestion_level * 100)}%</div>
                        <div class="route-detail-label">Congestion</div>
                    </div>
                    <div class="route-detail">
                        <div class="route-detail-value">${Math.round(route.segments.reduce((sum, s) => sum + s.current_speed, 0) / route.segments.length)} km/h</div>
                        <div class="route-detail-label">Avg Speed</div>
                    </div>
                </div>
                ${route.instructions ? `
                    <div class="route-instructions">
                        ${route.instructions.slice(0, 3).map(instruction => `
                            <div class="instruction-item">
                                <div class="instruction-icon">
                                    <i class="fas fa-arrow-right"></i>
                                </div>
                                <div class="instruction-text">${instruction}</div>
                            </div>
                        `).join('')}
                        ${route.instructions.length > 3 ? `<div style="text-align: center; color: rgba(226, 232, 240, 0.6); font-size: 0.8rem; margin-top: 10px;">+${route.instructions.length - 3} more steps</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');

        container.innerHTML = html;
        
        // Auto-select first route
        if (this.routeOptions.length > 0) {
            this.selectRoute(this.routeOptions[0].id);
        }
    }

    displayRoutesOnMap() {
        // Clear existing routes
        this.routeLayer.clearLayers();

        // Display each route with different colors
        const colors = ['#00d4ff', '#10b981', '#f59e0b', '#ef4444'];
        
        this.routeOptions.forEach((route, index) => {
            const color = colors[index % colors.length];
            const weight = route.id === this.selectedRoute ? 6 : 4;
            const opacity = route.id === this.selectedRoute ? 1 : 0.7;

            route.segments.forEach(segment => {
                if (segment.coordinates) {
                    const polyline = L.polyline(segment.coordinates, {
                        color: color,
                        weight: weight,
                        opacity: opacity
                    });

                    // Add popup with segment info
                    const popupContent = `
                        <div style="color: #2d3748; font-family: Inter, sans-serif;">
                            <h4 style="margin: 0 0 10px 0; color: #1a2332;">${segment.name || 'Road Segment'}</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div><strong>Distance:</strong> ${segment.length_km?.toFixed(1) || 'N/A'} km</div>
                                <div><strong>Speed:</strong> ${segment.current_speed || 'N/A'} km/h</div>
                                <div><strong>Time:</strong> ${segment.travel_time_minutes?.toFixed(1) || 'N/A'} min</div>
                                <div><strong>Type:</strong> ${segment.type || 'N/A'}</div>
                            </div>
                        </div>
                    `;
                    
                    polyline.bindPopup(popupContent);
                    this.routeLayer.addLayer(polyline);
                }
            });
        });

        // Fit map to show all routes
        if (this.routeLayer.getLayers().length > 0) {
            const bounds = this.routeLayer.getBounds();
            this.map.fitBounds(bounds, { padding: [20, 20] });
        }

        // Add origin and destination markers
        this.addOriginDestinationMarkers();
    }

    addOriginDestinationMarkers() {
        // Clear existing markers
        if (this.originMarker) {
            this.routeLayer.removeLayer(this.originMarker);
        }
        if (this.destinationMarker) {
            this.routeLayer.removeLayer(this.destinationMarker);
        }

        // Add origin marker
        if (this.routeOptions.length > 0 && this.routeOptions[0].segments.length > 0) {
            const firstSegment = this.routeOptions[0].segments[0];
            if (firstSegment.coordinates && firstSegment.coordinates.length > 0) {
                const originCoords = firstSegment.coordinates[0];
                this.originMarker = L.marker(originCoords, {
                    icon: L.divIcon({
                        className: 'origin-marker',
                        html: '<div style="background: var(--success-green); width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">A</div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(this.routeLayer).bindPopup('Origin');
            }

            // Add destination marker
            const lastSegment = this.routeOptions[0].segments[this.routeOptions[0].segments.length - 1];
            if (lastSegment.coordinates && lastSegment.coordinates.length > 0) {
                const destCoords = lastSegment.coordinates[lastSegment.coordinates.length - 1];
                this.destinationMarker = L.marker(destCoords, {
                    icon: L.divIcon({
                        className: 'destination-marker',
                        html: '<div style="background: var(--error-red); width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">B</div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(this.routeLayer).bindPopup('Destination');
            }
        }
    }

    selectRoute(routeId) {
        // Update UI
        document.querySelectorAll('.route-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`[data-route-id="${routeId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        this.selectedRoute = routeId;
        this.displayRoutesOnMap();
    }

    handleMapClick(e) {
        const { lat, lng } = e.latlng;
        const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        if (!document.getElementById('origin-input').value) {
            document.getElementById('origin-input').value = coords;
            this.addTemporaryMarker([lat, lng], 'Origin');
        } else if (!document.getElementById('destination-input').value) {
            document.getElementById('destination-input').value = coords;
            this.addTemporaryMarker([lat, lng], 'Destination');
        }
    }

    addTemporaryMarker(coords, label) {
        // Remove existing temporary markers
        this.routeLayer.eachLayer(layer => {
            if (layer.options && layer.options.isTemporary) {
                this.routeLayer.removeLayer(layer);
            }
        });

        const marker = L.marker(coords, {
            icon: L.divIcon({
                className: 'temporary-marker',
                html: `<div style="background: var(--accent-blue); width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            }),
            isTemporary: true
        }).addTo(this.routeLayer).bindPopup(label);
    }

    async geocodeInput(input, type) {
        // Simple geocoding simulation - in production, use a real geocoding service
        if (input.includes(',')) {
            const coords = input.split(',').map(Number);
            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                this.addTemporaryMarker(coords, type === 'origin' ? 'Origin' : 'Destination');
            }
        }
    }

    useFavoriteRoute(routeId) {
        const route = this.favoriteRoutes.find(r => r.id === routeId);
        if (route) {
            document.getElementById('origin-input').value = `${route.origin.lat.toFixed(6)}, ${route.origin.lng.toFixed(6)}`;
            document.getElementById('destination-input').value = `${route.destination.lat.toFixed(6)}, ${route.destination.lng.toFixed(6)}`;
            
            // Set preferences based on saved route
            if (route.preferences) {
                // Apply saved preferences
            }
            
            this.calculateRoute();
        }
    }

    async deleteFavoriteRoute(routeId) {
        if (confirm('Are you sure you want to delete this favorite route?')) {
            try {
                // In a real application, this would call the API to delete the route
                this.favoriteRoutes = this.favoriteRoutes.filter(r => r.id !== routeId);
                this.renderFavoriteRoutes();
            } catch (error) {
                console.error('Error deleting favorite route:', error);
            }
        }
    }

    toggleTrafficLayer() {
        if (this.trafficLayer) {
            this.map.removeLayer(this.trafficLayer);
            this.trafficLayer = null;
        } else {
            // Add traffic layer (simplified implementation)
            this.addTrafficLayer();
        }
    }

    addTrafficLayer() {
        // Simplified traffic layer - in production, use real traffic data
        const trafficSegments = [
            { coords: [[37.7749, -122.4194], [37.7849, -122.4094]], congestion: 0.3 },
            { coords: [[37.7849, -122.4094], [37.7949, -122.3994]], congestion: 0.7 },
            { coords: [[37.7949, -122.3994], [37.8049, -122.3894]], congestion: 0.5 }
        ];

        this.trafficLayer = L.layerGroup();

        trafficSegments.forEach(segment => {
            const color = this.getCongestionColor(segment.congestion);
            const polyline = L.polyline(segment.coords, {
                color: color,
                weight: 4,
                opacity: 0.8
            });
            this.trafficLayer.addLayer(polyline);
        });

        this.trafficLayer.addTo(this.map);
    }

    getCongestionColor(congestionLevel) {
        if (congestionLevel < 0.2) return '#10b981';
        if (congestionLevel < 0.4) return '#f59e0b';
        if (congestionLevel < 0.7) return '#ef4444';
        return '#8b5cf6';
    }

    clearRoute() {
        document.getElementById('origin-input').value = '';
        document.getElementById('destination-input').value = '';
        document.getElementById('route-results').style.display = 'none';
        
        this.routeLayer.clearLayers();
        this.routeOptions = [];
        this.selectedRoute = null;
        this.originMarker = null;
        this.destinationMarker = null;
    }

    locateUser() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    this.map.setView([latitude, longitude], 15);
                    
                    L.marker([latitude, longitude], {
                        icon: L.divIcon({
                            className: 'user-location-marker',
                            html: '<div style="background: var(--success-green); width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
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

    showError(message) {
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

// Initialize route planning system
document.addEventListener('DOMContentLoaded', () => {
    window.routeSystem = new RoutePlanningSystem();
});