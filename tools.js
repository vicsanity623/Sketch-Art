/**
 * Tools.js - Professional Advanced Canvas Utilities
 * Redesigned for Drag-Stability and Vertex Morphing
 */

const ToolsDrawer = {
    isOpen: false,
    activeTool: null,
    liveElement: null,
    currentShader: null,
    lastDist: 0,
    tapCount: 0,
    tapTimer: null,
    touchStartPos: { x: 0, y: 0 },
    
    toggle() {
        this.isOpen = !this.isOpen;
        document.getElementById('tools-drawer').classList.toggle('open', this.isOpen);
    },

    setTool(tool) {
        setMode('advanced');
        this.activeTool = tool;
        this.liveElement = null;
        this.currentShader = null;
        document.querySelectorAll('.drawer-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`tool-${tool}`);
        if(btn) btn.classList.add('active');
    },

    addShape(shapeType) {
        setMode('advanced');
        this.activeTool = 'shape';
        const center = screenToWorld(window.innerWidth/2, window.innerHeight/2);
        const size = 150 / camera.zoom;
        this.liveElement = {
            type: 'shape', shape: shapeType, x: center.x, y: center.y, size: size,
            thickness: document.getElementById('sizePicker').value / camera.zoom,
            color: document.getElementById('colorPicker').value,
            editMode: 'transform',
            points: this.generateInitialPoints(shapeType, center.x, center.y, size)
        };
    },

    generateInitialPoints(type, cx, cy, sz) {
        let pts = []; const r = sz / 2;
        if (type === 'square') pts = [{x:cx-r,y:cy-r}, {x:cx+r,y:cy-r}, {x:cx+r,y:cy+r}, {x:cx-r,y:cy+r}];
        else if (type === 'rect') pts = [{x:cx-r*1.5,y:cy-r}, {x:cx+r*1.5,y:cy-r}, {x:cx+r*1.5,y:cy+r}, {x:cx-r*1.5,y:cy+r}];
        else if (type === 'circle') for(let i=0; i<24; i++) { const a=(i/24)*Math.PI*2; pts.push({x:cx+r*Math.cos(a), y:cy+r*Math.sin(a)}); }
        else if (type === 'tri') for(let i=0; i<3; i++) { const a=(i/3)*Math.PI*2-Math.PI/2; pts.push({x:cx+r*Math.cos(a), y:cy+r*Math.sin(a)}); }
        else if (type === 'star') { let a=-Math.PI/2; for(let i=0;i<5;i++){ pts.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}); a+=Math.PI/5; pts.push({x:cx+(r/2.5)*Math.cos(a),y:cy+(r/2.5)*Math.sin(a)}); a+=Math.PI/5; }}
        else if (type === 'hex' || type === 'oct') { const s=(type==='hex'?6:8); for(let i=0;i<s;i++){ const a=(i/s)*Math.PI*2-Math.PI/2; pts.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}); }}
        return pts;
    },

    commit() {
        if (!this.liveElement) return;
        strokes.push({...this.liveElement});
        this.liveElement = null;
    }
};

// --- Rendering Logic ---
function drawShader(ctx, s) {
    ctx.save();
    ctx.globalAlpha = s.opacity;
    const softness = s.smoothness / 100;
    const core = Math.max(0.01, 1 - softness); 
    s.points.forEach(p => {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s.radius);
        grad.addColorStop(0, s.color);
        grad.addColorStop(core, s.color); 
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x - s.radius, p.y - s.radius, s.radius * 2, s.radius * 2);
    });
    ctx.restore();
}

function drawStaticAdvanced(ctx, s) {
    if (s.type === 'shader') { drawShader(ctx, s); return; }
    ctx.save();
    ctx.strokeStyle = s.color; ctx.lineWidth = s.thickness;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (s.type === 'line') {
        ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y); ctx.lineTo(s.b.x, s.b.y); ctx.stroke();
    } else if (s.type === 'shape' && s.points.length > 0) {
        ctx.beginPath(); ctx.moveTo(s.points[0].x, s.points[0].y);
        s.points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
}

function drawAdvanced(ctx) {
    const el = ToolsDrawer.liveElement;
    if (!el) return;
    drawStaticAdvanced(ctx, el);
    ctx.fillStyle = "white"; ctx.shadowBlur = 10; ctx.shadowColor = "rgba(0,0,0,0.5)";
    const hR = 12 / camera.zoom; // Slightly larger handles for easier grabbing
    if (el.type === 'line') {
        ctx.beginPath(); ctx.arc(el.a.x, el.a.y, hR, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(el.b.x, el.b.y, hR, 0, Math.PI*2); ctx.fill();
    } else if (el.type === 'shape') {
        if (el.editMode === 'transform') {
            ctx.beginPath(); ctx.arc(el.x, el.y, hR*1.5, 0, Math.PI*2); ctx.fill();
        } else {
            el.points.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, hR, 0, Math.PI*2); ctx.fill(); });
        }
    }
}

// --- Interaction Dispatcher ---
canvas.addEventListener('touchstart', e => {
    if (mode !== 'advanced') return;
    const touch = e.touches[0];
    const pos = screenToWorld(touch.clientX, touch.clientY);
    const grabR = 50 / camera.zoom; // Large grab radius for touch screens

    ToolsDrawer.touchStartPos = { x: touch.clientX, y: touch.clientY };

    // --- Line Tool Interaction ---
    if (ToolsDrawer.activeTool === 'line') {
        if (!ToolsDrawer.liveElement) {
            ToolsDrawer.liveElement = { 
                type: 'line', a: {...pos}, b: {...pos}, 
                thickness: document.getElementById('sizePicker').value/camera.zoom, 
                color: document.getElementById('colorPicker').value, 
                activePoint: 'b' 
            };
        } else {
            const dA = Math.hypot(pos.x - ToolsDrawer.liveElement.a.x, pos.y - ToolsDrawer.liveElement.a.y);
            const dB = Math.hypot(pos.x - ToolsDrawer.liveElement.b.x, pos.y - ToolsDrawer.liveElement.b.y);
            if (dA < grabR) ToolsDrawer.liveElement.activePoint = 'a';
            else if (dB < grabR) ToolsDrawer.liveElement.activePoint = 'b';
            else ToolsDrawer.liveElement.activePoint = null;
        }
    }
    
    // --- Shade Tool Start ---
    if (ToolsDrawer.activeTool === 'shade') {
        ToolsDrawer.currentShader = { type: 'shader', radius: document.getElementById('shade-radius').value/camera.zoom, smoothness: document.getElementById('shade-smoothness').value, color: document.getElementById('colorPicker').value, opacity: document.getElementById('opacityPicker').value/100, points: [{...pos}] };
        strokes.push(ToolsDrawer.currentShader);
    }
    
    // --- Shape Tool Interaction ---
    if (ToolsDrawer.activeTool === 'shape' && ToolsDrawer.liveElement) {
        if (e.touches.length === 2) {
            ToolsDrawer.lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        } else {
            const el = ToolsDrawer.liveElement;
            if (el.editMode === 'morph') {
                el.activeVertexIdx = el.points.findIndex(p => Math.hypot(pos.x - p.x, pos.y - p.y) < grabR);
            }
            // If we didn't grab a vertex, or we are in transform mode, allow dragging the whole shape
            if (el.editMode === 'transform' || el.activeVertexIdx === -1) {
                ToolsDrawer.isDragging = true;
                ToolsDrawer.dragOffset = {x: pos.x - el.x, y: pos.y - el.y};
            }
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    if (mode !== 'advanced') return;
    const touch = e.touches[0];
    const pos = screenToWorld(touch.clientX, touch.clientY);

    // --- Line Tool Update ---
    if (ToolsDrawer.activeTool === 'line' && ToolsDrawer.liveElement?.activePoint) {
        ToolsDrawer.liveElement[ToolsDrawer.liveElement.activePoint] = {...pos};
    }

    // --- Shader Tool Update ---
    if (ToolsDrawer.activeTool === 'shade' && ToolsDrawer.currentShader) {
        const last = ToolsDrawer.currentShader.points[ToolsDrawer.currentShader.points.length - 1];
        if (Math.hypot(pos.x - last.x, pos.y - last.y) > ToolsDrawer.currentShader.radius / 10) ToolsDrawer.currentShader.points.push({...pos});
    }

    // --- Shape Tool Update ---
    if (ToolsDrawer.activeTool === 'shape' && ToolsDrawer.liveElement) {
        const el = ToolsDrawer.liveElement;
        if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const scale = dist / ToolsDrawer.lastDist;
            el.points.forEach(p => { p.x = el.x + (p.x - el.x) * scale; p.y = el.y + (p.y - el.y) * scale; });
            el.size *= scale; ToolsDrawer.lastDist = dist;
        } else {
            if (el.editMode === 'morph' && el.activeVertexIdx !== undefined && el.activeVertexIdx !== -1) {
                el.points[el.activeVertexIdx] = {...pos};
            } else if (ToolsDrawer.isDragging) {
                const dx = pos.x - ToolsDrawer.dragOffset.x - el.x, dy = pos.y - ToolsDrawer.dragOffset.y - el.y;
                el.x += dx; el.y += dy; el.points.forEach(p => { p.x += dx; p.y += dy; });
            }
        }
    }
});

canvas.addEventListener('touchend', e => {
    if (mode !== 'advanced') return;
    
    // --- Stable Tap Logic ---
    const touch = e.changedTouches[0];
    const moveDist = Math.hypot(touch.clientX - ToolsDrawer.touchStartPos.x, touch.clientY - ToolsDrawer.touchStartPos.y);

    // ONLY count as a tap if the user didn't move their finger more than 10 pixels
    if (moveDist < 10) {
        ToolsDrawer.tapCount++;
        clearTimeout(ToolsDrawer.tapTimer);
        ToolsDrawer.tapTimer = setTimeout(() => {
            if (ToolsDrawer.tapCount === 1 && ToolsDrawer.liveElement) {
                ToolsDrawer.liveElement.editMode = 'transform';
            } else if (ToolsDrawer.tapCount === 2 && ToolsDrawer.liveElement) {
                ToolsDrawer.liveElement.editMode = 'morph';
            } else if (ToolsDrawer.tapCount === 3) {
                ToolsDrawer.commit();
            }
            ToolsDrawer.tapCount = 0;
        }, 300);
    }

    // Reset interaction states
    ToolsDrawer.isDragging = false; 
    ToolsDrawer.currentShader = null; 
    if(ToolsDrawer.liveElement) {
        ToolsDrawer.liveElement.activeVertexIdx = -1;
        ToolsDrawer.liveElement.activePoint = null;
    }
});