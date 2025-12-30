/**
 * Visionary Gallery System - Advanced Version
 * Handles persistent storage and device-level downloads
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
            
            // Extract clear label (svg, png, jpeg)
            const format = item.type.split('/')[1].toUpperCase();

            div.innerHTML = `
                <img src="${item.data}" onclick="GalleryUI.viewFull('${item.data}')">
                <div class="gallery-info" style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 10px; color: #aaa;">${format}</span>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="GalleryUI.download('${item.data}', '${item.id}', '${format.toLowerCase()}')" style="width:32px; height:32px; padding:0; background:none; border:none; font-size:18px;">⬇️</button>
                        <button onclick="GalleryUI.remove(${item.id})" style="width:32px; height:32px; padding:0; background:none; border:none; font-size:18px;">🗑️</button>
                    </div>
                </div>
            `;
            grid.appendChild(div);
        });
    },

    download(dataUrl, id, ext) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `visionary-sketch-${id}.${ext === 'svg+xml' ? 'svg' : ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    async remove(id) {
        if(confirm("Delete this masterpiece?")) {
            await GalleryDB.delete(id);
            this.open();
        }
    },

    // Handled via the enhanced logic injected in index.html onload
    viewFull(data) {
        console.log("Viewing full resolution...");
    },

    closeFull() {
        document.getElementById('full-viewer').style.display = 'none';
    }
};