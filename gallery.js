/**
 * Visionary Gallery System - Advanced Version
 * Handles persistent storage, format labeling, and device-level downloads
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
    // Viewer state for pinch/zoom logic (handled in index.html, 
    // but initialized here for object safety)
    state: { scale: 1, x: 0, y: 0, lastDist: 0, lastX: 0, lastY: 0, isDragging: false, tapCount: 0, tapTimer: null },

    async open() {
        const modal = document.getElementById('gallery-modal');
        const overlay = document.getElementById('export-modal-overlay');
        const grid = document.getElementById('gallery-grid');
        
        grid.innerHTML = '<p style="color:white; text-align:center; width:100%;">Loading Studio Gallery...</p>';
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
            
            // Professional Format detection
            let format = item.type.split('/')[1].toUpperCase();
            if (format.includes('SVG')) format = 'SVG'; // Clean up SVG+XML
            if (format === 'JPEG') format = 'JPG';

            div.innerHTML = `
                <img src="${item.data}" onclick="GalleryUI.viewFull('${item.data}')">
                <div class="gallery-info" style="display:flex; justify-content:space-between; align-items:center; padding: 10px; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);">
                    <span style="background: var(--accent); padding: 2px 8px; border-radius: 6px; font-weight: 900; font-size: 10px; color: #fff; letter-spacing: 1px;">${format}</span>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <button onclick="GalleryUI.download('${item.data}', '${item.id}', '${format.toLowerCase()}')" style="width:28px; height:28px; padding:0; background:none; border:none; font-size:18px; cursor:pointer;" title="Download to Device">⬇️</button>
                        <button onclick="GalleryUI.remove(${item.id})" style="width:28px; height:28px; padding:0; background:none; border:none; font-size:18px; cursor:pointer;" title="Delete Artwork">🗑️</button>
                    </div>
                </div>
            `;
            grid.appendChild(div);
        });
    },

    download(dataUrl, id, ext) {
        const link = document.createElement('a');
        link.href = dataUrl;
        // Ensure proper filename extension for vectors
        const fileExt = ext === 'svg' ? 'svg' : (ext === 'jpg' ? 'jpg' : 'png');
        link.download = `visionary-art-${id}.${fileExt}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    async remove(id) {
        if(confirm("Delete this masterpiece?")) {
            await GalleryDB.delete(id);
            this.open(); // Refresh grid
        }
    },

    // Injected/Overridden via index.html for high-res vector viewing
    viewFull(data) {
        console.log("Opening full-res viewer...");
    },

    closeFull() {
        document.getElementById('full-viewer').style.display = 'none';
    }
};