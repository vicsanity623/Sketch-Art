/**
 * Visionary Gallery System
 * Uses IndexedDB for persistent storage of high-res art
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

// UI Controller for the Gallery
const GalleryUI = {
    async open() {
        const modal = document.getElementById('gallery-modal');
        const overlay = document.getElementById('export-modal-overlay');
        const grid = document.getElementById('gallery-grid');
        
        grid.innerHTML = '<p style="color:white; text-align:center; width:100%;">Loading Gallery...</p>';
        modal.style.display = 'block';
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
        img.src = data;
        viewer.style.display = 'flex';
    },

    closeFull() {
        document.getElementById('full-viewer').style.display = 'none';
    }
};
