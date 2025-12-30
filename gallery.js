/**
 * Visionary Gallery System
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
    // Zoom/Pan State
    state: {
        scale: 1,
        x: 0,
        y: 0,
        lastDist: 0,
        lastX: 0,
        lastY: 0,
        isDragging: false,
        lastTap: 0
    },

    async open() {
        const modal = document.getElementById('gallery-modal');
        const overlay = document.getElementById('export-modal-overlay');
        const grid = document.getElementById('gallery-grid');
        
        grid.innerHTML = '<p style="color:white; text-align:center; width:100%;">Loading Gallery...</p>';
        modal.style.display = 'flex'; // Changed to flex for better centering
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
        const img = viewer.querySelector('img');
        
        // Reset state
        this.state.scale = 1;
        this.state.x = 0;
        this.state.y = 0;
        
        img.src = data;
        img.style.transform = `translate(0px, 0px) scale(1)`;
        viewer.style.display = 'flex';

        // Initialize touch listeners if not already attached
        if (!viewer.dataset.initialized) {
            this.initTouchListeners(viewer, img);
            viewer.dataset.initialized = "true";
        }
    },

    initTouchListeners(viewer, img) {
        viewer.addEventListener('touchstart', (e) => {
            // Double tap to reset
            const now = Date.now();
            if (now - this.state.lastTap < 300) {
                this.state.scale = 1; this.state.x = 0; this.state.y = 0;
                this.updateTransform(img);
                return;
            }
            this.state.lastTap = now;

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
                this.state.scale = Math.min(Math.max(1, this.state.scale * delta), 10);
                this.state.lastDist = dist;
            } else if (this.state.isDragging) {
                const deltaX = e.touches[0].pageX - this.state.lastX;
                const deltaY = e.touches[0].pageY - this.state.lastY;
                
                // Allow panning only if zoomed in
                if (this.state.scale > 1) {
                    this.state.x += deltaX;
                    this.state.y += deltaY;
                }
                
                this.state.lastX = e.touches[0].pageX;
                this.state.lastY = e.touches[0].pageY;
            }
            this.updateTransform(img);
        }, { passive: false });

        viewer.addEventListener('touchend', () => {
            this.state.isDragging = false;
        });
    },

    updateTransform(img) {
        img.style.transform = `translate(${this.state.x}px, ${this.state.y}px) scale(${this.state.scale})`;
    },

    closeFull() {
        document.getElementById('full-viewer').style.display = 'none';
    }
};