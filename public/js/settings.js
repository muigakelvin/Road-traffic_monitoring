class SettingsManager {
    constructor() {
        this.currentSection = 'general';
        this.settings = this.loadSettings();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSettingsValues();
        this.animateSettings();
        
        console.log('Settings manager initialized');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.settings-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.dataset.section;
                this.switchSection(section);
            });
        });

        // Range sliders
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.addEventListener('input', (e) => {
                this.updateRangeValue(e.target);
            });
        });

        // Toggle switches
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleToggleChange(e.target);
            });
        });

        // Save button
        document.querySelector('.btn-primary').addEventListener('click', () => {
            this.saveSettings();
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    switchSection(section) {
        // Update navigation
        document.querySelectorAll('.settings-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Show/hide sections
        document.querySelectorAll('.settings-section').forEach(sectionEl => {
            sectionEl.style.display = 'none';
        });
        document.getElementById(`${section}-section`).style.display = 'block';

        this.currentSection = section;
        this.animateSection(section);
    }

    updateRangeValue(slider) {
        const value = slider.value;
        const rangeValue = slider.parentElement.querySelector('.range-value');
        
        if (rangeValue) {
            const suffix = slider.id === 'congestion-threshold' ? '%' : 
                          slider.id === 'speed-threshold' ? ' km/h' : 
                          slider.id === 'notification-volume' ? '%' : '';
            rangeValue.textContent = value + suffix;
        }

        // Update settings object
        this.settings[slider.id] = parseInt(value);
    }

    handleToggleChange(checkbox) {
        this.settings[checkbox.id] = checkbox.checked;
        
        // Handle specific toggle actions
        if (checkbox.id === 'dark-mode') {
            this.toggleDarkMode(checkbox.checked);
        }
        
        if (checkbox.id === 'desktop-notifications') {
            this.requestNotificationPermission(checkbox.checked);
        }
    }

    toggleDarkMode(enabled) {
        // Dark mode is default, so this would toggle to light mode
        if (!enabled) {
            document.body.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
            document.body.style.color = '#1a2332';
        } else {
            document.body.style.background = '';
            document.body.style.color = '';
        }
    }

    async requestNotificationPermission(enabled) {
        if (enabled && 'Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.showSuccess('Desktop notifications enabled');
            } else {
                this.showError('Notification permission denied');
                document.getElementById('desktop-notifications').checked = false;
            }
        }
    }

    loadSettings() {
        // Load settings from localStorage or use defaults
        const defaultSettings = {
            'default-map-view': 'san-francisco',
            'update-interval': 30,
            'map-zoom': 11,
            'auto-refresh': true,
            'show-traffic-layer': false,
            'dark-mode': true,
            'desktop-notifications': false,
            'sound-alerts': false,
            'notification-volume': 50,
            'email-notifications': false,
            'email-address': '',
            'congestion-threshold': 70,
            'speed-threshold': 20,
            'alert-accidents': true,
            'alert-construction': true,
            'alert-weather': false,
            'alert-closures': true,
            'data-collection': true,
            'location-tracking': false,
            'data-retention': 30
        };

        const savedSettings = localStorage.getItem('trafficFlowSettings');
        return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
    }

    loadSettingsValues() {
        // Load values into form elements
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.settings[key];
                } else if (element.type === 'range') {
                    element.value = this.settings[key];
                    this.updateRangeValue(element);
                } else {
                    element.value = this.settings[key];
                }
            }
        });
    }

    saveSettings() {
        // Collect all settings from form
        const formSettings = {};
        
        // Text inputs
        document.querySelectorAll('input[type="text"], input[type="email"], input[type="number"]').forEach(input => {
            formSettings[input.id] = input.value;
        });
        
        // Selects
        document.querySelectorAll('select').forEach(select => {
            formSettings[select.id] = select.value;
        });
        
        // Checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            formSettings[checkbox.id] = checkbox.checked;
        });
        
        // Range sliders
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            formSettings[slider.id] = parseInt(slider.value);
        });

        // Merge with existing settings
        this.settings = { ...this.settings, ...formSettings };

        // Save to localStorage
        localStorage.setItem('trafficFlowSettings', JSON.stringify(this.settings));

        // Show success message
        this.showSuccess('Settings saved successfully');

        // Animate save button
        this.animateSaveButton();
    }

    animateSettings() {
        // Animate settings cards
        anime({
            targets: '.settings-section',
            translateY: [30, 0],
            opacity: [0, 1],
            duration: 600,
            delay: anime.stagger(100),
            easing: 'easeOutQuad'
        });

        // Animate navigation
        anime({
            targets: '.settings-nav',
            translateX: [-30, 0],
            opacity: [0, 1],
            duration: 500,
            easing: 'easeOutQuad'
        });
    }

    animateSection(section) {
        const sectionEl = document.getElementById(`${section}-section`);
        
        anime({
            targets: sectionEl.children,
            translateY: [20, 0],
            opacity: [0, 1],
            duration: 400,
            delay: anime.stagger(50),
            easing: 'easeOutQuad'
        });
    }

    animateSaveButton() {
        const button = document.querySelector('.btn-primary');
        
        anime({
            targets: button,
            scale: [1, 1.05, 1],
            duration: 300,
            easing: 'easeInOutQuad'
        });
    }

    handleResize() {
        // Handle responsive layout changes
        if (window.innerWidth <= 768) {
            // Mobile layout adjustments
            document.querySelector('.settings-container').style.gridTemplateColumns = '1fr';
        } else {
            document.querySelector('.settings-container').style.gridTemplateColumns = '250px 1fr';
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 6px;
            z-index: 10000;
            backdrop-filter: blur(10px);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            font-weight: 500;
        `;

        if (type === 'success') {
            notification.style.background = 'rgba(16, 185, 129, 0.9)';
            notification.style.color = 'white';
            notification.style.border = '1px solid #10b981';
        } else if (type === 'error') {
            notification.style.background = 'rgba(239, 68, 68, 0.9)';
            notification.style.color = 'white';
            notification.style.border = '1px solid #ef4444';
        } else {
            notification.style.background = 'rgba(0, 212, 255, 0.9)';
            notification.style.color = 'white';
            notification.style.border = '1px solid #00d4ff';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}

// Global functions for button clicks
function exportData() {
    // Simulate data export
    const settings = JSON.parse(localStorage.getItem('trafficFlowSettings') || '{}');
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'traffic-flow-settings.json';
    link.click();
    
    window.settingsManager.showSuccess('Data exported successfully');
}

function deleteAllData() {
    if (confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
        localStorage.removeItem('trafficFlowSettings');
        window.settingsManager.showSuccess('All data deleted successfully');
        setTimeout(() => {
            location.reload();
        }, 1500);
    }
}

function generateApiKey() {
    // Simulate API key generation
    const apiKey = 'tf_' + Math.random().toString(36).substr(2, 16);
    window.settingsManager.showSuccess(`New API key generated: ${apiKey}`);
}

function viewApiKeys() {
    // Simulate API key viewing
    window.settingsManager.showSuccess('API keys management panel opened');
}

// Initialize settings manager
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});