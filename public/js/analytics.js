class AnalyticsDashboard {
    constructor() {
        this.charts = {};
        this.map = null;
        this.currentTimeRange = '24h';
        this.analyticsData = null;
        
        this.init();
    }

    async init() {
        try {
            await this.initializeMap();
            await this.loadAnalyticsData();
            this.setupEventListeners();
            this.renderDashboard();
            
            console.log('Analytics dashboard initialized');
        } catch (error) {
            console.error('Error initializing analytics dashboard:', error);
        }
    }

    async initializeMap() {
        // Initialize map for heatmap visualization
        this.map = L.map('heatmap-map', {
            center: [37.7749, -122.4194],
            zoom: 11,
            zoomControl: true,
            attributionControl: true
        });

        // Add dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        console.log('Heatmap map initialized');
    }

    async loadAnalyticsData() {
        try {
            const response = await fetch(`/api/analytics/dashboard?timeRange=${this.currentTimeRange}`);
            const data = await response.json();
            
            if (data.success) {
                this.analyticsData = data.data;
                console.log('Analytics data loaded:', this.currentTimeRange);
            }
        } catch (error) {
            console.error('Error loading analytics data:', error);
        }
    }

    setupEventListeners() {
        // Time range selector
        document.querySelectorAll('.time-range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.time-range-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTimeRange = e.target.dataset.range;
                this.refreshData();
            });
        });

        // Window resize for charts
        window.addEventListener('resize', () => {
            this.resizeCharts();
        });
    }

    async renderDashboard() {
        if (!this.analyticsData) return;

        this.renderMetrics();
        this.renderCharts();
        this.renderHeatmap();
        this.renderInsights();
        
        // Animate dashboard appearance
        this.animateDashboard();
    }

    renderMetrics() {
        const metricsContainer = document.getElementById('dashboard-metrics');
        
        const metrics = [
            {
                title: 'Total Segments',
                icon: 'fas fa-road',
                value: this.analyticsData.overview.total_segments,
                change: '+2.3%',
                changeType: 'positive'
            },
            {
                title: 'Average Congestion',
                icon: 'fas fa-chart-line',
                value: `${Math.round(this.analyticsData.key_metrics.average_congestion * 100)}%`,
                change: `${this.analyticsData.trends.congestion_change > 0 ? '+' : ''}${Math.round(this.analyticsData.trends.congestion_change * 100)}%`,
                changeType: this.analyticsData.trends.congestion_change > 0 ? 'negative' : 'positive'
            },
            {
                title: 'Average Speed',
                icon: 'fas fa-tachometer-alt',
                value: `${Math.round(this.analyticsData.key_metrics.average_speed)} km/h`,
                change: `${this.analyticsData.trends.speed_change > 0 ? '+' : ''}${Math.round(this.analyticsData.trends.speed_change * 100)}%`,
                changeType: this.analyticsData.trends.speed_change > 0 ? 'positive' : 'negative'
            },
            {
                title: 'Data Points',
                icon: 'fas fa-database',
                value: this.analyticsData.overview.data_points.toLocaleString(),
                change: '+5.7%',
                changeType: 'positive'
            }
        ];

        const html = metrics.map(metric => `
            <div class="metric-card fade-in">
                <div class="metric-header">
                    <div class="metric-title">${metric.title}</div>
                    <div class="metric-icon">
                        <i class="${metric.icon}"></i>
                    </div>
                </div>
                <div class="metric-value">${metric.value}</div>
                <div class="metric-change ${metric.changeType}">
                    <i class="fas fa-arrow-${metric.changeType === 'positive' ? 'up' : 'down'}"></i>
                    ${metric.change} vs last period
                </div>
            </div>
        `).join('');

        metricsContainer.innerHTML = html;
    }

    renderCharts() {
        this.renderCongestionChart();
        this.renderSpeedChart();
        this.renderHourlyChart();
    }

    renderCongestionChart() {
        const chartDom = document.getElementById('congestion-chart');
        const myChart = echarts.init(chartDom);
        
        const data = this.analyticsData.charts.congestion_over_time.data;
        
        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(26, 35, 50, 0.9)',
                borderColor: '#00d4ff',
                textStyle: {
                    color: '#e2e8f0'
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: data.map(d => d.x),
                axisLine: {
                    lineStyle: {
                        color: 'rgba(226, 232, 240, 0.3)'
                    }
                },
                axisLabel: {
                    color: 'rgba(226, 232, 240, 0.7)',
                    fontSize: 11
                }
            },
            yAxis: {
                type: 'value',
                axisLine: {
                    lineStyle: {
                        color: 'rgba(226, 232, 240, 0.3)'
                    }
                },
                axisLabel: {
                    color: 'rgba(226, 232, 240, 0.7)',
                    fontSize: 11,
                    formatter: '{value}%'
                },
                splitLine: {
                    lineStyle: {
                        color: 'rgba(226, 232, 240, 0.1)'
                    }
                }
            },
            series: [{
                name: 'Congestion Level',
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: {
                    color: '#00d4ff',
                    width: 3
                },
                itemStyle: {
                    color: '#00d4ff'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [{
                            offset: 0, color: 'rgba(0, 212, 255, 0.3)'
                        }, {
                            offset: 1, color: 'rgba(0, 212, 255, 0.05)'
                        }]
                    }
                },
                data: data.map(d => d.y * 100)
            }]
        };

        myChart.setOption(option);
        this.charts.congestion = myChart;
    }

    renderSpeedChart() {
        const chartDom = document.getElementById('speed-chart');
        const myChart = echarts.init(chartDom);
        
        const data = this.analyticsData.charts.speed_distribution.data;
        
        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(26, 35, 50, 0.9)',
                borderColor: '#00d4ff',
                textStyle: {
                    color: '#e2e8f0'
                }
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                textStyle: {
                    color: '#e2e8f0'
                }
            },
            series: [{
                name: 'Speed Distribution',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: 'rgba(26, 35, 50, 0.8)',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: '18',
                        fontWeight: 'bold',
                        color: '#e2e8f0'
                    }
                },
                labelLine: {
                    show: false
                },
                data: data.map((d, index) => ({
                    value: d.value,
                    name: d.label,
                    itemStyle: {
                        color: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index]
                    }
                }))
            }]
        };

        myChart.setOption(option);
        this.charts.speed = myChart;
    }

    renderHourlyChart() {
        const chartDom = document.getElementById('hourly-chart');
        const myChart = echarts.init(chartDom);
        
        const data = this.analyticsData.charts.hourly_patterns.data;
        
        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(26, 35, 50, 0.9)',
                borderColor: '#00d4ff',
                textStyle: {
                    color: '#e2e8f0'
                }
            },
            legend: {
                data: ['Congestion Level', 'Average Speed'],
                textStyle: {
                    color: '#e2e8f0'
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: data.map(d => d.x),
                axisLine: {
                    lineStyle: {
                        color: 'rgba(226, 232, 240, 0.3)'
                    }
                },
                axisLabel: {
                    color: 'rgba(226, 232, 240, 0.7)',
                    fontSize: 11
                }
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Congestion (%)',
                    position: 'left',
                    axisLine: {
                        lineStyle: {
                            color: 'rgba(226, 232, 240, 0.3)'
                        }
                    },
                    axisLabel: {
                        color: 'rgba(226, 232, 240, 0.7)',
                        fontSize: 11,
                        formatter: '{value}%'
                    },
                    splitLine: {
                        lineStyle: {
                            color: 'rgba(226, 232, 240, 0.1)'
                        }
                    }
                },
                {
                    type: 'value',
                    name: 'Speed (km/h)',
                    position: 'right',
                    axisLine: {
                        lineStyle: {
                            color: 'rgba(226, 232, 240, 0.3)'
                        }
                    },
                    axisLabel: {
                        color: 'rgba(226, 232, 240, 0.7)',
                        fontSize: 11,
                        formatter: '{value} km/h'
                    }
                }
            ],
            series: [
                {
                    name: 'Congestion Level',
                    type: 'bar',
                    data: data.map(d => d.y * 100),
                    itemStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [{
                                offset: 0, color: '#00d4ff'
                            }, {
                                offset: 1, color: '#c77b3a'
                            }]
                        }
                    }
                },
                {
                    name: 'Average Speed',
                    type: 'line',
                    yAxisIndex: 1,
                    data: data.map(d => d.speed),
                    smooth: true,
                    lineStyle: {
                        color: '#10b981',
                        width: 3
                    },
                    itemStyle: {
                        color: '#10b981'
                    }
                }
            ]
        };

        myChart.setOption(option);
        this.charts.hourly = myChart;
    }

    renderHeatmap() {
        // Add heatmap layer to map
        if (this.map && this.analyticsData.heatmap_data) {
            const heatmapData = this.analyticsData.heatmap_data;
            
            // Clear existing heatmap
            this.map.eachLayer(layer => {
                if (layer.options && layer.options.isHeatmap) {
                    this.map.removeLayer(layer);
                }
            });

            // Create heatmap layer
            const heatmapPoints = heatmapData.map(point => [
                point.coordinates[0],
                point.coordinates[1],
                point.intensity
            ]);

            // Simple heatmap implementation using circle markers
            heatmapPoints.forEach(point => {
                const [lat, lng, intensity] = point;
                const radius = Math.max(5, intensity * 50);
                const color = this.getHeatmapColor(intensity);
                
                L.circle([lat, lng], {
                    radius: radius,
                    color: 'transparent',
                    fillColor: color,
                    fillOpacity: 0.6,
                    isHeatmap: true
                }).addTo(this.map);
            });
        }
    }

    renderInsights() {
        const keyInsightsContainer = document.getElementById('key-insights');
        const recommendationsContainer = document.getElementById('recommendations');
        
        // Key insights
        const keyInsights = [
            {
                label: 'Peak Congestion Hours',
                value: '7-9 AM and 5-7 PM show highest congestion levels (85-90%)'
            },
            {
                label: 'Best Travel Times',
                value: '10 PM - 6 AM offer the best traffic conditions with <20% congestion'
            },
            {
                label: 'Most Affected Areas',
                value: 'Highway 101 and Bay Bridge approaches experience consistent heavy traffic'
            },
            {
                label: 'Weekend Patterns',
                value: 'Saturday afternoons show moderate congestion around shopping areas'
            }
        ];

        const insightsHtml = keyInsights.map(insight => `
            <div class="insight-item">
                <div class="insight-label">${insight.label}</div>
                <div class="insight-value">${insight.value}</div>
            </div>
        `).join('');

        keyInsightsContainer.innerHTML = insightsHtml;

        // Recommendations
        const recommendations = [
            {
                label: 'Route Optimization',
                value: 'Consider alternative routes during peak hours to save 15-20 minutes'
            },
            {
                label: 'Departure Time',
                value: 'Leaving 30 minutes earlier or later can significantly reduce travel time'
            },
            {
                label: 'Real-time Monitoring',
                value: 'Check traffic conditions before departure for optimal route selection'
            },
            {
                label: 'Infrastructure',
                value: 'Variable speed limits on Highway 101 could improve traffic flow by 15%'
            }
        ];

        const recommendationsHtml = recommendations.map(rec => `
            <div class="insight-item">
                <div class="insight-label">${rec.label}</div>
                <div class="insight-value">${rec.value}</div>
            </div>
        `).join('');

        recommendationsContainer.innerHTML = recommendationsHtml;
    }

    getHeatmapColor(intensity) {
        if (intensity < 0.2) return '#10b981';
        if (intensity < 0.4) return '#f59e0b';
        if (intensity < 0.7) return '#ef4444';
        return '#8b5cf6';
    }

    animateDashboard() {
        // Animate metric cards
        anime({
            targets: '.metric-card',
            scale: [0.9, 1],
            opacity: [0, 1],
            duration: 600,
            delay: anime.stagger(100),
            easing: 'easeOutQuad'
        });

        // Animate chart containers
        anime({
            targets: '.chart-container',
            translateY: [30, 0],
            opacity: [0, 1],
            duration: 800,
            delay: anime.stagger(150, {start: 300}),
            easing: 'easeOutQuad'
        });

        // Animate insights
        anime({
            targets: '.insights-card',
            translateX: [-30, 0],
            opacity: [0, 1],
            duration: 600,
            delay: anime.stagger(200, {start: 600}),
            easing: 'easeOutQuad'
        });
    }

    async refreshData() {
        // Show loading states
        document.getElementById('dashboard-metrics').innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                Loading analytics data...
            </div>
        `;

        await this.loadAnalyticsData();
        this.renderDashboard();
    }

    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.resize();
            }
        });
    }
}

// Initialize analytics dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.analyticsDashboard = new AnalyticsDashboard();
});