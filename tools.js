/**
 * Tools.js - Professional Advanced Canvas Utilities
 */

const ToolsDrawer = {
    isOpen: false,
    activeTool: null,
    liveElement: null,
    lastDist: 0,
    tapCount: 0,
    tapTimer: null,
    
    toggle() {
        this.isOpen = !this.isOpen;
        document.getElementById('tools-drawer').classList.toggle('open', this.isOpen);
    },

    setTool(tool) {
        setMode('advanced');
        this.activeTool = tool;
        this.liveElement = null;
        document.querySelectorAll('.drawer-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`tool-${tool}`);
        if(btn) btn.classList.add('active');
    },

    addShape(shapeType) {
        setMode('advanced');
        this.activeTool = 'shape';
        const center = screenToWorld(window.innerWidth/2, window.innerHeight/2);
        this.liveElement = {
            type: 'shape',
            shape: shapeType,
            x: center.x,
            y: center.y,
            size: 150 / camera.zoom,
            thickness: document.getElementById('sizePicker').value / camera.zoom,
            color: document.getElementById('colorPicker').value,
            rotation: 0
        };
    },

    commit() {
        if (!this.liveElement) return;
        strokes.push({...this.liveElement});
        this.liveElement = null;
    }
};

// --- Specialized Renderers ---
function drawPolygon(ctx, x, y, radius, sides) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI/2;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.stroke();
}

// --- Global Rendering Hooks ---
function drawStaticAdvanced(ctx, s) {
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.thickness;
    ctx.lineCap = 'round';
    if (s.type === 'line') {
        ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y); ctx.lineTo(s.b.x, s.b.y); ctx.stroke();
    } else if (s.type === 'shape') {
        const x = s.x, y = s.y, size = s.size;
        if (s.shape === 'rect') ctx.strokeRect(x - size/2, y - size/2, size, size);
        if (s.shape === 'circle') { ctx.beginPath(); ctx.arc(x, y, size/2, 0, Math.PI*2); ctx.stroke(); }
        if (s.shape === 'tri') drawPolygon(ctx, x, y, size/2, 3);
        if (s.shape === 'hex') drawPolygon(ctx, x, y, size/2, 6);
        if (s.shape === 'oct') drawPolygon(ctx, x, y, size/2, 8);
        if (s.shape === 'star') drawStar(ctx, x, y, 5, size/2, size/5);
    }
    ctx.restore();
}

function drawAdvanced(ctx) {
    const el = ToolsDrawer.liveElement;
    if (!el) return;
    drawStaticAdvanced(ctx, el);
    // Draw interaction handles
    ctx.fillStyle = "white";
    ctx.shadowBlur = 10; ctx.shadowColor = "rgba(0,0,0,0.5)";
    if (el.type === 'line') {
        ctx.beginPath(); ctx.arc(el.a.x, el.a.y, 8/camera.zoom, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(el.b.x, el.b.y, 8/camera.zoom, 0, Math.PI*2); ctx.fill();
    } else if (el.type === 'shape') {
        ctx.beginPath(); ctx.arc(el.x, el.y, 8/camera.zoom, 0, Math.PI*2); ctx.fill();
    }
}

// --- Touch Event Dispatcher ---
canvas.addEventListener('touchstart', e => {
    if (mode !== 'advanced') return;
    const touch = e.touches[0];
    const pos = screenToWorld(touch.clientX, touch.clientY);
    const radius = 40 / camera.zoom;

    // Triple Tap logic
    ToolsDrawer.tapCount++;
    clearTimeout(ToolsDrawer.tapTimer);
    ToolsDrawer.tapTimer = setTimeout(() => {
        if (ToolsDrawer.tapCount >= 3) ToolsDrawer.commit();
        ToolsDrawer.tapCount = 0;
    }, 300);

    if (ToolsDrawer.activeTool === 'line') {
        if (!ToolsDrawer.liveElement) {
            ToolsDrawer.liveElement = { type: 'line', a: {...pos}, b: {...pos}, thickness: document.getElementById('sizePicker').value/camera.zoom, color: document.getElementById('colorPicker').value, activePoint: 'b' };
        } else {
            const dA = Math.hypot(pos.x - ToolsDrawer.liveElement.a.x, pos.y - ToolsDrawer.liveElement.a.y);
            const dB = Math.hypot(pos.x - ToolsDrawer.liveElement.b.x, pos.y - ToolsDrawer.liveElement.b.y);
            if (dA < radius) ToolsDrawer.liveElement.activePoint = 'a';
            else if (dB < radius) ToolsDrawer.liveElement.activePoint = 'b';
            else ToolsDrawer.liveElement.activePoint = null;
        }
    }
    
    if (ToolsDrawer.activeTool === 'shape' && ToolsDrawer.liveElement) {
        if (e.touches.length === 2) {
            ToolsDrawer.lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        } else {
            ToolsDrawer.isDragging = true;
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    if (mode !== 'advanced') return;
    const touch = e.touches[0];
    const pos = screenToWorld(touch.clientX, touch.clientY);

    if (ToolsDrawer.activeTool === 'line' && ToolsDrawer.liveElement?.activePoint) {
        ToolsDrawer.liveElement[ToolsDrawer.liveElement.activePoint] = {...pos};
    }

    if (ToolsDrawer.activeTool === 'shade') {
        const smoothness = document.getElementById('tool-param-slider').value / camera.zoom;
        strokes.push({
            type: 'brush', size: smoothness, color: document.getElementById('colorPicker').value,
            opacity: document.getElementById('opacityPicker').value / 200,
            points: [{...pos}, {...pos}]
        });
    }

    if (ToolsDrawer.activeTool === 'shape' && ToolsDrawer.liveElement) {
        if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            ToolsDrawer.liveElement.size *= (dist / ToolsDrawer.lastDist);
            ToolsDrawer.lastDist = dist;
        } else if (ToolsDrawer.isDragging) {
            ToolsDrawer.liveElement.x = pos.x;
            ToolsDrawer.liveElement.y = pos.y;
        }
    }
});

canvas.addEventListener('touchend', () => { ToolsDrawer.isDragging = false; });
