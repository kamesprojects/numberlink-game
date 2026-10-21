/**
 * Numberlink Canvas Renderer
 * High-DPI responsive rendering with smooth rounded pipes, glow effects,
 * customizable display modes, and victory confetti particle physics.
 */

class NumberlinkRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Color palettes
        this.pairColors = [
            { name: 'Tyrkysová', hex: '#00d2ff', light: '#00b4db', text: '#001a26' },
            { name: 'Ružová',    hex: '#ff2a85', light: '#e91e63', text: '#ffffff' },
            { name: 'Zelená',    hex: '#00e676', light: '#00c853', text: '#00290e' },
            { name: 'Jantárová', hex: '#ffb300', light: '#ffa000', text: '#332000' },
            { name: 'Oranžová',  hex: '#ff6d00', light: '#f55100', text: '#ffffff' },
            { name: 'Fialová',   hex: '#b388ff', light: '#7c4dff', text: '#1b0933' },
            { name: 'Modrá',     hex: '#2979ff', light: '#1565c0', text: '#ffffff' },
            { name: 'Červená',   hex: '#ff1744', light: '#d50000', text: '#ffffff' },
            { name: 'Mätová',    hex: '#00e5ff', light: '#00b8d4', text: '#00262b' },
            { name: 'Koralová',  hex: '#ff5722', light: '#e64a19', text: '#ffffff' },
            { name: 'Indigo',    hex: '#651fff', light: '#6200ea', text: '#ffffff' },
            { name: 'Limetková', hex: '#aeea00', light: '#64dd17', text: '#192600' }
        ];

        this.symbols = ['★', '▲', '●', '■', '◆', '⬟', '✿', '⬢', '♥', '♠', '✦', '✪'];
        this.letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

        // Display mode: 'numbers-colors', 'numbers-classic', 'colors-only', 'symbols', 'letters'
        this.displayMode = 'numbers-colors';

        // Particle system for celebration
        this.confetti = [];
        this.animatingConfetti = false;

        // Hover or highlight effects
        this.hoveredCell = null;
    }

    /**
     * Retrieves the color object for a pair id (1-based)
     */
    getColor(id, isDarkTheme = true) {
        const idx = (id - 1) % this.pairColors.length;
        const color = this.pairColors[idx];

        if (this.displayMode === 'numbers-classic') {
            return isDarkTheme
                ? { hex: '#e2e8f0', light: '#cbd5e1', text: '#0f172a' }
                : { hex: '#1e293b', light: '#334155', text: '#ffffff' };
        }

        return color;
    }

    /**
     * Resizes canvas to match container with devicePixelRatio for ultra-sharp Retina rendering
     */
    resize(containerWidth, containerHeight, width, height) {
        const dpr = window.devicePixelRatio || 1;
        // Keep square cells
        const maxCellW = Math.floor(containerWidth / width);
        const maxCellH = Math.floor(containerHeight / height);
        const cellSize = Math.max(26, Math.min(80, Math.min(maxCellW, maxCellH)));

        const realWidth = cellSize * width;
        const realHeight = cellSize * height;

        this.canvas.width = Math.round(realWidth * dpr);
        this.canvas.height = Math.round(realHeight * dpr);

        this.canvas.style.width = `${realWidth}px`;
        this.canvas.style.height = `${realHeight}px`;

        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
        this.ctx.scale(dpr, dpr);

        this.cellSize = cellSize;
        this.realWidth = realWidth;
        this.realHeight = realHeight;
    }

    /**
     * Main render function
     */
    render(gameState) {
        if (!this.ctx || !this.cellSize) return;

        const { width, height, pairs, paths, activeDrawing, theme } = gameState;
        const isDark = theme !== 'light';

        this.ctx.clearRect(0, 0, this.realWidth, this.realHeight);

        // 1. Draw Grid Background & Cell Outlines
        this.drawGrid(width, height, isDark);

        // 2. Draw Inactive / Completed Paths
        this.drawPaths(paths, isDark);

        // 3. Draw Active Drawing Path (if player is dragging)
        if (activeDrawing && activeDrawing.path && activeDrawing.path.length > 0) {
            this.drawActivePath(activeDrawing, isDark);
        }

        // 4. Draw Endpoints (Numbered / Colored Badges)
        this.drawEndpoints(pairs, paths, isDark);

        // 5. Draw Confetti (if active)
        if (this.animatingConfetti) {
            this.renderConfetti();
        }
    }

    /**
     * Draws grid lines and subtle cell centers
     */
    drawGrid(width, height, isDark) {
        const cs = this.cellSize;
        const ctx = this.ctx;

        // Base cell background styling
        ctx.save();
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                const x = c * cs;
                const y = r * cs;

                // Subtle cell background alternating or soft
                ctx.fillStyle = isDark
                    ? ((r + c) % 2 === 0 ? 'rgba(255, 255, 255, 0.025)' : 'rgba(255, 255, 255, 0.045)')
                    : ((r + c) % 2 === 0 ? 'rgba(0, 0, 0, 0.02)' : 'rgba(0, 0, 0, 0.04)');
                ctx.fillRect(x, y, cs, cs);

                // Cell borders
                ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.08)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, cs, cs);

                // Subtle center guide dot
                ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.10)';
                ctx.beginPath();
                ctx.arc(x + cs * 0.5, y + cs * 0.5, Math.max(1.5, cs * 0.04), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Outer board border
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.22)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, width * cs - 2, height * cs - 2);

        ctx.restore();
    }

    /**
     * Draws completed or committed paths
     */
    drawPaths(paths, isDark) {
        const cs = this.cellSize;
        const ctx = this.ctx;
        const lineWidth = Math.max(8, cs * 0.38);

        for (const [idStr, path] of Object.entries(paths)) {
            if (!path || path.length < 2) continue;
            const id = parseInt(idStr, 10);
            const color = this.getColor(id, isDark);

            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Outer soft glow
            ctx.shadowColor = color.hex;
            ctx.shadowBlur = isDark ? 10 : 4;
            ctx.strokeStyle = color.hex;
            ctx.lineWidth = lineWidth;

            ctx.beginPath();
            ctx.moveTo((path[0].c + 0.5) * cs, (path[0].r + 0.5) * cs);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo((path[i].c + 0.5) * cs, (path[i].r + 0.5) * cs);
            }
            ctx.stroke();

            // Inner gloss highlight line (gives shiny 3D tube feel)
            ctx.shadowBlur = 0;
            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = Math.max(2, lineWidth * 0.25);
            ctx.stroke();

            ctx.restore();
        }
    }

    /**
     * Draws currently active dragging path
     */
    drawActivePath(activeDrawing, isDark) {
        const { id, path } = activeDrawing;
        if (!path || path.length < 1) return;

        const cs = this.cellSize;
        const ctx = this.ctx;
        const color = this.getColor(id, isDark);
        const lineWidth = Math.max(9, cs * 0.42);

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Vibrant active neon glow
        ctx.shadowColor = color.hex;
        ctx.shadowBlur = isDark ? 16 : 8;
        ctx.strokeStyle = color.hex;
        ctx.lineWidth = lineWidth;

        ctx.beginPath();
        ctx.moveTo((path[0].c + 0.5) * cs, (path[0].r + 0.5) * cs);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo((path[i].c + 0.5) * cs, (path[i].r + 0.5) * cs);
        }
        ctx.stroke();

        // Bright inner core
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2.5, lineWidth * 0.28);
        ctx.stroke();

        // Tip circle at current head
        const tip = path[path.length - 1];
        ctx.fillStyle = color.hex;
        ctx.beginPath();
        ctx.arc((tip.c + 0.5) * cs, (tip.r + 0.5) * cs, lineWidth * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Draws the endpoints (numbered badge circles)
     */
    drawEndpoints(pairs, paths, isDark) {
        const cs = this.cellSize;
        const ctx = this.ctx;
        const radius = Math.max(10, cs * 0.38);

        pairs.forEach(pair => {
            const color = this.getColor(pair.id, isDark);
            const path = paths[pair.id];
            const isConnected = path && path.length >= 2 &&
                ((path[0].r === pair.start.r && path[0].c === pair.start.c &&
                  path[path.length - 1].r === pair.end.r && path[path.length - 1].c === pair.end.c) ||
                 (path[0].r === pair.end.r && path[0].c === pair.end.c &&
                  path[path.length - 1].r === pair.start.r && path[path.length - 1].c === pair.start.c));

            [pair.start, pair.end].forEach(pt => {
                const cx = (pt.c + 0.5) * cs;
                const cy = (pt.r + 0.5) * cs;

                ctx.save();

                // Outer halo ring if connected
                if (isConnected) {
                    ctx.strokeStyle = color.hex;
                    ctx.lineWidth = Math.max(2, cs * 0.06);
                    ctx.shadowColor = color.hex;
                    ctx.shadowBlur = isDark ? 10 : 5;
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Node circle background
                ctx.shadowColor = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.2)';
                ctx.shadowBlur = 6;
                ctx.shadowOffsetY = 2;

                ctx.fillStyle = color.hex;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();

                // Crisp border ring
                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;
                ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = Math.max(1.5, radius * 0.12);
                ctx.stroke();

                // Inner label text or symbol
                if (this.displayMode !== 'colors-only') {
                    let label = String(pair.id);
                    if (this.displayMode === 'symbols') {
                        label = this.symbols[(pair.id - 1) % this.symbols.length];
                    } else if (this.displayMode === 'letters') {
                        label = this.letters[(pair.id - 1) % this.letters.length];
                    }

                    const fontSize = Math.round(radius * 1.15);
                    ctx.font = `bold ${fontSize}px "Segoe UI", Inter, system-ui, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = color.text;
                    ctx.fillText(label, cx, cy + 1);
                }

                ctx.restore();
            });
        });
    }

    /**
     * Triggers victory confetti explosion
     */
    startConfetti() {
        this.confetti = [];
        const count = 120;
        const colors = this.pairColors.map(c => c.hex);

        for (let i = 0; i < count; i++) {
            this.confetti.push({
                x: this.realWidth * 0.5,
                y: this.realHeight * 0.5,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.8) * 16,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                rot: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 0.3,
                life: 1.0,
                decay: Math.random() * 0.012 + 0.008
            });
        }

        this.animatingConfetti = true;
    }

    stopConfetti() {
        this.animatingConfetti = false;
        this.confetti = [];
    }

    renderConfetti() {
        const ctx = this.ctx;
        let active = 0;

        ctx.save();
        for (const p of this.confetti) {
            if (p.life <= 0) continue;
            active++;

            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.35; // gravity
            p.vx *= 0.98; // air friction
            p.rot += p.vrot;
            p.life -= p.decay;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size * 0.6);
            ctx.restore();
        }
        ctx.restore();

        if (active === 0) {
            this.animatingConfetti = false;
        }
    }
}

// Global export
window.NumberlinkRenderer = NumberlinkRenderer;
