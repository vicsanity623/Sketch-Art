/**
 * settings.js - Visionary App Core Configuration
 */

const AppSettings = {
    panel: null,
    overlay: null,
    config: {
        allowMorph: true,
        showGrid: false,
        snapToGrid: false,
        gridSize: 50
    },

    init() {
        // Load saved settings
        const saved = localStorage.getItem('visionary_prefs');
        if (saved) this.config = { ...this.config, ...JSON.parse(saved) };
        
        this.panel = document.getElementById('settings-modal');
        this.overlay = document.getElementById('export-modal-overlay');
        this.renderToggles();
    },

    toggle() {
        const isOpen = this.panel.style.display === 'block';
        this.panel.style.display = isOpen ? 'none' : 'block';
        this.overlay.style.display = isOpen ? 'none' : 'block';
    },

    update(key, value) {
        this.config[key] = value;
        localStorage.setItem('visionary_prefs', JSON.stringify(this.config));
    },

    renderToggles() {
        // Sync HTML inputs with loaded config
        document.getElementById('set-morph').checked = this.config.allowMorph;
        document.getElementById('set-grid').checked = this.config.showGrid;
        document.getElementById('set-snap').checked = this.config.snapToGrid;
    }
};

// Start settings on load
window.addEventListener('DOMContentLoaded', () => AppSettings.init());