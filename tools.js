/**
 * Visionary Advanced Tool System
 */

const ToolsDrawer = {
    isOpen: false,
    activeTool: null,
    liveElement: null, // Holds the line or shape currently being edited
    
    toggle() {
        this.isOpen = !this.isOpen;
        document.getElementById('tools-drawer').classList.toggle('open', this.isOpen);
    },

    setTool(tool) {
        // Reset current draw mode if an advanced tool is picked
        setMode('advanced');
        this.activeTool = tool;
        this.liveElement = null;
        
        document.querySelectorAll('.drawer-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`tool-${tool}`);
        if(btn) btn.classList.add('active');
    },

    // 1. LINE TOOL LOGIC
    handleLine(type, x, y) {
        const pos = screenToWorld(x, y);
        const thickness = document.getElementById('sizePicker').value / camera.zoom;
        const color = document.getElementById('colorPicker').value;

        if (type === 'start') {
            if (!this.liveElement) {
                // Initial placement of Point A and B (start as a dot)
                this.liveElement = { type: 'line', a: {...pos}, b: {...pos}, thickness, color, activePoint: 'b' };
            } else {
                // Check if user is grabbing existing Point A or B
                const distA = Math.hypot(pos.x - this.liveElement.a.x, pos.y - this.liveElement.a.y);
                const distB = Math.hypot(pos.x - this.liveElement.b.x, pos.y - this.liveElement.b.y);
                const threshold = 30 / camera.zoom;

                if (distA < threshold) this.liveElement.activePoint = 'a';
                else if (distB < threshold) this.liveElement.activePoint = 'b';
                else this.liveElement.activePoint = null;
            }
        } else if (type === 'move' && this.liveElement?.activePoint) {
            this.liveElement[this.liveElement.activePoint] = {...pos};
        } else if (type === 'end') {
            // Keep the line live until user switches tools or clear
        }
    },

    // 2. SHADING TOOL (Faded Glow)
    handleShade(type, x, y) {
        if (type === 'move') {
            const pos = screenToWorld(x, y);
            const radius = document.getElementById('tool-param-slider').value / camera.zoom;
            const color = document.getElementById('colorPicker').value;
            const opacity = document.getElementById('opacityPicker').value / 200; // Force soft

            // Shading is immediate (commited to strokes for performance)
            strokes.push({
                type: 'brush',
                color: color,
                size: radius,
                opacity: opacity,
                points: [{...pos}, {...pos}] // Single point stroke
            });
        }
    },

    // 3. GEOMETRY SHAPES
    addShape(shapeType) {
        setMode('advanced');
        this.activeTool = 'shape';
        const center = screenToWorld(window.innerWidth/2, window.innerHeight/2);
        
        this.liveElement = {
            type: 'shape',
            shape: shapeType,
            x: center.x,
            y: center.y,
            size: 100 / camera.zoom,
            thickness: document.getElementById('sizePicker').value / 5 / camera.zoom,
            color: document.getElementById('colorPicker').value,
            rotation: 0
        };
    },

    handleShape(type, x, y, touches) {
        if (!this.liveElement) return;

        if (touches === 2) {
            // Pinch to scale shape
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            if (this.lastDist) {
                this.liveElement.size *= (dist / this.lastDist);
            }
            this.lastDist = dist;
        } else if (type === 'move') {
            const pos = screenToWorld(x, y);
            this.liveElement.x = pos.x;
            this.liveElement.y = pos.y;
        }
    },

    commitElement() {
        if (!this.liveElement) return;
        // Convert live element into a permanent stroke object
        // For simplicity in this engine, we render the live element in the loop
        // If tripple tapped, we could push it to the strokes array as a 'special' type
        strokes.push({...this.liveElement, isPermanent: true});
        this.liveElement = null;
    }
};

// --- Integration with main Engine ---
// We need to inject these calls into your main index.html touch listeners

const originalTouchStart = canvas.ontouchstart; 
// Update the existing listeners in index.html to check for advanced tools
window.addEventListener('touchstart', e => {
    if (mode === 'advanced') {
        const touch = e.touches[0];
        if (ToolsDrawer.activeTool === 'line') ToolsDrawer.handleLine('start', touch.clientX, touch.clientY);
        if (ToolsDrawer.activeTool === 'shape') ToolsDrawer.handleShape('start', touch.clientX, touch.clientY);
    }
});

window.addEventListener('touchmove', e => {
    if (mode === 'advanced') {
        const touch = e.touches[0];
        if (ToolsDrawer.activeTool === 'line') ToolsDrawer.handleLine('move', touch.clientX, touch.clientY);
        if (ToolsDrawer.activeTool === 'shade') ToolsDrawer.handleShade('move', touch.clientX, touch.clientY);
        if (ToolsDrawer.activeTool === 'shape') ToolsDrawer.handleShape('move', touch.clientX, touch.clientY, e.touches.length);
    }
});

// Triple tap to commit logic
let tapCount = 0;
let tapTimer;
window.addEventListener('touchend', e => {
    if (mode === 'advanced') {
        tapCount++;
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => {
            if (tapCount >= 3) ToolsDrawer.commitElement();
            tapCount = 0;
        }, 300);
    }
});

// Update the renderLoop to draw the "Live" elements
function drawAdvanced(tCtx) {
    const el = ToolsDrawer.liveElement;
    if (!el) return;

    tCtx.save();
    tCtx.strokeStyle = el.color;
    tCtx.lineWidth = el.thickness || 2;
    tCtx.lineCap = 'round';

    if (el.type === 'line') {
        tCtx.beginPath();
        tCtx.moveTo(el.a.x, el.a.y);
        tCtx.lineTo(el.b.x, el.b.y);
        tCtx.stroke();
        
        // Draw handles
        tCtx.fillStyle = "white";
        tCtx.beginPath(); tCtx.arc(el.a.x, el.a.y, 10/camera.zoom, 0, Math.PI*2); tCtx.fill();
        tCtx.beginPath(); tCtx.arc(el.b.x, el.b.y, 10/camera.zoom, 0, Math.PI*2); tCtx.fill();
    }

    if (el.type === 'shape') {
        tCtx.translate(el.x, el.y);
        tCtx.beginPath();
        if (el.shape === 'rect') tCtx.rect(-el.size/2, -el.size/2, el.size, el.size);
        if (el.shape === 'circle') tCtx.arc(0, 0, el.size/2, 0, Math.PI*2);
        if (el.shape === 'tri') {
            tCtx.moveTo(0, -el.size/2);
            tCtx.lineTo(el.size/2, el.size/2);
            tCtx.lineTo(-el.size/2, el.size/2);
            tCtx.closePath();
        }
        // Add more shapes similarly
        tCtx.stroke();
    }
    tCtx.restore();
}

// Hook into the main renderLoop
// Add 'drawAdvanced(ctx);' inside your index.html's renderLoop() function 
// right after 'drawPaths(ctx, camera);'
