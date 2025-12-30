/**
 * Visionary Gallery System - Advanced Vector Viewer
 */

const GalleryDB = {
    dbName: "VisionaryArtDB",
    version: 1,
    storeName: "gallery",

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: "id" });
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async save(dataUrl, type) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            const entry = {
                id: Date.now(),
                data: dataUrl,
                type: type,
                date: new Date().toLocaleDateString()
            };
            const request = store.add(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getAll() {
        const db = await this.init();
        return new Promise((resolve) => {
            const transaction = db.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result.reverse());
        });
    },

    async delete(id) {
        const db = await this.init();
        const transaction = db.transaction(this.storeName, "readwrite");
        transaction.objectStore(this.storeName).delete(id);
    }
};

const GalleryUI = {
    state: {
        scale: 1,
        x: 0,
        y: 0,
        lastDist: 0,
        lastX: 0,
        lastY: 0,
        isDragging: false,
        tapCount: 0,
        tapTimer: null
    },

    async open() {
        const modal = document.getElementById('gallery-modal');
        const overlay = document.getElementById('export-modal-overlay');
        const grid = document.getElementById('gallery-grid');
        
        grid.innerHTML = '<p style="color:white; text-align:center; width:100%;">Loading Gallery...</p>';
        modal.style.display = 'flex';
        overlay.style.display = 'block';

        const items = await GalleryDB.getAll();
        grid.innerHTML = '';

        if (items.length === 0) {
            grid.innerHTML = '<p style="color:#666; text-align:center; width:100%; margin-top:50px;">No saved artwork yet.</p>';
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.innerHTML = `
                <img src="${item.data}" onclick="GalleryUI.viewFull('${item.data}')">
                <div class="gallery-info">
                    <span>${item.type.split('/')[1].toUpperCase()}</span>
                    <button onclick="GalleryUI.remove(${item.id})">🗑️</button>
                </div>
            `;
            grid.appendChild(div);
        });
    },

    async remove(id) {
        if(confirm("Delete this masterpiece?")) {
            await GalleryDB.delete(id);
            this.open();
        }
    },

    viewFull(data) {
        const viewer = document.getElementById('full-viewer');
        
        // Reset state
        this.state.scale = 1;
        this.state.x = 0;
        this.state.y = 0;

        // Vector Sharpness Fix: Inject actual SVG into the DOM instead of using <img>
        // This ensures the browser treats it as vector and re-renders details on zoom.
        viewer.innerHTML = `
            <span class="close-btn" onclick="GalleryUI.closeFull()">&times;</span>
            <div id="vector-container" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; touch-action:none; will-change: transform;">
            </div>
        `;
        
        const container = document.getElementById('vector-container');

        if (data.startsWith('data:image/svg+xml')) {
            try {
                // Convert DataURL back to raw SVG text
                const base64 = data.split(',')[1];
                const svgText = decodeURIComponent(escape(atob(base64)));
                container.innerHTML = svgText;
                
                // Set the SVG to fill container
                const svgEl = container.querySelector('svg');
                svgEl.style.width = "90vw";
                svgEl.style.height = "auto";
                svgEl.style.maxHeight = "90vh";
                this.target = container;
            } catch(e) {
                console.error("SVG Decode failed", e);
            }
        } else {
            // Fallback for PNG/JPG
            const img = document.createElement('img');
            img.src = data;
            img.style.maxWidth = "95%";
            img.style.maxHeight = "95%";
            container.appendChild(img);
            this.target = container;
        }

        viewer.style.display = 'flex';
        this.initTouchListeners(viewer);
    },

    initTouchListeners(viewer) {
        viewer.addEventListener('touchstart', (e) => {
            // --- Triple Tap Reset Logic ---
            this.state.tapCount++;
            clearTimeout(this.state.tapTimer);
            this.state.tapTimer = setTimeout(() => { this.state.tapCount = 0; }, 400);

            if (this.state.tapCount === 3) {
                this.state.scale = 1; this.state.x = 0; this.state.y = 0;
                this.updateTransform();
                this.state.tapCount = 0;
                return;
            }

            if (e.touches.length === 2) {
                this.state.lastDist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
            } else {
                this.state.isDragging = true;
                this.state.lastX = e.touches[0].pageX;
                this.state.lastY = e.touches[0].pageY;
            }
        });

        viewer.addEventListener('touchmove', (e) => {
            e.preventDefault();

            if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                const delta = dist / this.state.lastDist;
                // Allow massive zoom range (up to 50x)
                this.state.scale = Math.min(Math.max(0.5, this.state.scale * delta), 50);
                this.state.lastDist = dist;
            } else if (this.state.isDragging) {
                const deltaX = e.touches[0].pageX - this.state.lastX;
                const deltaY = e.touches[0].pageY - this.state.lastY;
                
                this.state.x += deltaX;
                this.state.y += deltaY;
                
                this.state.lastX = e.touches[0].pageX;
                this.state.lastY = e.touches[0].pageY;
            }
            this.updateTransform();
        }, { passive: false });

        viewer.addEventListener('touchend', () => {
            this.state.isDragging = false;
        });
    },

    updateTransform() {
        if (!this.target) return;
        this.target.style.transform = `translate(${this.state.x}px, ${this.state.y}px) scale(${this.state.scale})`;
    },

    closeFull() {
        document.getElementById('full-viewer').style.display = 'none';
        this.target = null;
    }
};
