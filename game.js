/**
 * Numberlink Core Game Controller
 * Handles user interactions (Pointer/Touch/Keyboard), path routing,
 * auto-cutting, win verification, hints, undo history, and state management.
 */

class NumberlinkGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new NumberlinkRenderer(this.canvas);
        this.sound = new SoundManager();

        // Game Configuration
        this.width = 6;
        this.height = 6;
        this.numPairs = 5;
        this.seed = null;
        this.winRule = 'flow'; // 'flow' (100% fill) or 'free' (all pairs connected)
        this.theme = localStorage.getItem('numberlink_theme') || 'dark';

        // State
        this.puzzle = null;
        this.paths = {};          // { [pairId]: Array<{r, c}> }
        this.activeDrawing = null;// { id, path, startPt }
        this.moves = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.isCompleted = false;
        this.history = [];        // Undo stack
        this.hintsUsed = 0;

        // Display mode
        this.displayMode = localStorage.getItem('numberlink_display_mode') || 'numbers-colors';
        this.renderer.displayMode = this.displayMode;

        // UI references
        this.initUIReferences();
        this.bindEvents();
        this.applyTheme(this.theme);

        // Start initial game
        this.newGame(this.width, this.height, this.numPairs);
    }

    initUIReferences() {
        this.ui = {
            timer: document.getElementById('stat-timer'),
            moves: document.getElementById('stat-moves'),
            coverage: document.getElementById('stat-coverage'),
            coverageBar: document.getElementById('coverage-bar'),
            pairsConnected: document.getElementById('stat-pairs'),
            seedBadge: document.getElementById('stat-seed'),
            pairsLegend: document.getElementById('pairs-legend'),
            btnUndo: document.getElementById('btn-undo'),
            btnReset: document.getElementById('btn-reset'),
            btnHint: document.getElementById('btn-hint'),
            btnSolve: document.getElementById('btn-solve'),
            btnNew: document.getElementById('btn-new'),
            btnCustom: document.getElementById('btn-custom'),
            btnTheme: document.getElementById('btn-theme'),
            btnSound: document.getElementById('btn-sound'),
            btnHelp: document.getElementById('btn-help'),
            selectDifficulty: document.getElementById('select-difficulty'),
            selectDisplayMode: document.getElementById('select-display-mode'),
            winModal: document.getElementById('win-modal'),
            winNextBtn: document.getElementById('win-next-btn'),
            winShareBtn: document.getElementById('win-share-btn'),
            customModal: document.getElementById('custom-modal'),
            helpModal: document.getElementById('help-modal')
        };
    }

    /**
     * Start a new procedurally generated game
     */
    newGame(width = this.width, height = this.height, numPairs = this.numPairs, seed = null) {
        this.width = width;
        this.height = height;
        this.numPairs = numPairs;
        this.seed = (seed !== null && seed !== undefined) ? seed : Math.floor(Math.random() * 900000) + 100000;

        // Stop current animation / timer
        this.renderer.stopConfetti();
        this.isCompleted = false;
        this.paths = {};
        this.activeDrawing = null;
        this.history = [];
        this.moves = 0;
        this.hintsUsed = 0;
        this.resetTimer();

        // Generate puzzle
        this.puzzle = NumberlinkGenerator.generate(this.width, this.height, this.numPairs, this.seed);

        // Hide win modal if open
        if (this.ui.winModal) {
            this.ui.winModal.classList.add('hidden');
        }

        // Resize canvas and update UI
        this.resizeCanvas();
        this.startTimer();
        this.updateStats();
        this.renderLegend();
        this.requestRender();
    }

    /**
     * Resizes canvas to fit arena with square grid aspect ratio
     */
    resizeCanvas() {
        const arena = document.querySelector('.game-arena');
        if (!arena) return;

        const pad = 28;
        const availableW = Math.max(260, arena.clientWidth - pad);
        const availableH = Math.max(260, arena.clientHeight - pad);

        this.renderer.resize(availableW, availableH, this.width, this.height);
        this.requestRender();
    }

    /**
     * Render the game state to canvas
     */
    requestRender() {
        requestAnimationFrame(() => {
            this.renderer.render({
                width: this.width,
                height: this.height,
                pairs: this.puzzle ? this.puzzle.pairs : [],
                paths: this.paths,
                activeDrawing: this.activeDrawing,
                theme: this.theme
            });
        });
    }

    /**
     * Continuous render loop for animations (like confetti)
     */
    startAnimationLoop() {
        const loop = () => {
            if (this.renderer.animatingConfetti) {
                this.requestRender();
                requestAnimationFrame(loop);
            }
        };
        requestAnimationFrame(loop);
    }

    /**
     * Timer management
     */
    startTimer() {
        clearInterval(this.timerInterval);
        this.timer = 0;
        this.timerInterval = setInterval(() => {
            if (!this.isCompleted) {
                this.timer++;
                this.updateTimerUI();
            }
        }, 1000);
        this.updateTimerUI();
    }

    resetTimer() {
        clearInterval(this.timerInterval);
        this.timer = 0;
        this.updateTimerUI();
    }

    updateTimerUI() {
        if (!this.ui.timer) return;
        const mins = Math.floor(this.timer / 60);
        const secs = this.timer % 60;
        this.ui.timer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    /**
     * Finds which pair starts or ends at (r, c)
     */
    getEndpointAt(r, c) {
        if (!this.puzzle) return null;
        for (const pair of this.puzzle.pairs) {
            if ((pair.start.r === r && pair.start.c === c) || (pair.end.r === r && pair.end.c === c)) {
                return pair;
            }
        }
        return null;
    }

    /**
     * Checks which pair's existing path passes through (r, c)
     */
    getPathAt(r, c) {
        for (const [idStr, path] of Object.entries(this.paths)) {
            if (!path) continue;
            const idx = path.findIndex(pt => pt.r === r && pt.c === c);
            if (idx !== -1) {
                return { id: parseInt(idStr, 10), index: idx, path };
            }
        }
        return null;
    }

    /**
     * Saves current state to history for Undo
     */
    saveHistory() {
        const snapshot = {};
        for (const [id, path] of Object.entries(this.paths)) {
            snapshot[id] = path ? path.map(p => ({ r: p.r, c: p.c })) : null;
        }
        this.history.push(snapshot);
        if (this.history.length > 50) this.history.shift();
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.history.length === 0 || this.isCompleted) return;
        const previousState = this.history.pop();
        this.paths = previousState;
        this.sound.playClick();
        this.updateStats();
        this.renderLegend();
        this.requestRender();
    }

    /**
     * Reset the entire board
     */
    reset() {
        if (this.isCompleted) return;
        this.saveHistory();
        this.paths = {};
        this.activeDrawing = null;
        this.moves++;
        this.sound.playCut();
        this.updateStats();
        this.renderLegend();
        this.requestRender();
    }

    /**
     * Event binding for mouse, touch, and UI controls
     */
    bindEvents() {
        window.addEventListener('resize', () => this.resizeCanvas());

        // Pointer events (unifies mouse and touch)
        this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        this.canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
        this.canvas.addEventListener('pointercancel', (e) => this.handlePointerUp(e));

        // Prevent touch scrolling on canvas
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.undo();
            } else if (e.key === 'r' || e.key === 'R') {
                this.reset();
            } else if (e.key === 'h' || e.key === 'H') {
                this.giveHint();
            }
        });

        // UI buttons
        if (this.ui.btnUndo) this.ui.btnUndo.addEventListener('click', () => this.undo());
        if (this.ui.btnReset) this.ui.btnReset.addEventListener('click', () => this.reset());
        if (this.ui.btnHint) this.ui.btnHint.addEventListener('click', () => this.giveHint());
        if (this.ui.btnSolve) this.ui.btnSolve.addEventListener('click', () => this.solvePuzzle());
        if (this.ui.btnNew) this.ui.btnNew.addEventListener('click', () => this.newGame());
        if (this.ui.btnTheme) this.ui.btnTheme.addEventListener('click', () => this.toggleTheme());
        if (this.ui.btnSound) this.ui.btnSound.addEventListener('click', () => this.toggleSound());

        // Difficulty selector
        if (this.ui.selectDifficulty) {
            this.ui.selectDifficulty.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'custom') {
                    this.openCustomModal();
                } else {
                    const [w, h, p] = val.split(',').map(Number);
                    this.newGame(w, h, p);
                }
            });
        }

        // Display mode selector
        if (this.ui.selectDisplayMode) {
            this.ui.selectDisplayMode.value = this.displayMode;
            this.ui.selectDisplayMode.addEventListener('change', (e) => {
                this.displayMode = e.target.value;
                localStorage.setItem('numberlink_display_mode', this.displayMode);
                this.renderer.displayMode = this.displayMode;
                this.renderLegend();
                this.requestRender();
            });
        }

        // Win modal buttons
        if (this.ui.winNextBtn) {
            this.ui.winNextBtn.addEventListener('click', () => {
                this.ui.winModal.classList.add('hidden');
                this.newGame();
            });
        }

        if (this.ui.winShareBtn) {
            this.ui.winShareBtn.addEventListener('click', () => this.shareSeed());
        }

        if (this.ui.seedBadge) {
            this.ui.seedBadge.addEventListener('click', () => this.promptSeedAction());
        }

        // Help Modal
        if (this.ui.btnHelp) {
            this.ui.btnHelp.addEventListener('click', () => {
                this.ui.helpModal.classList.remove('hidden');
            });
        }

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
            });
        });

        // Custom Modal handlers
        this.setupCustomModal();
    }

    /**
     * Converts client coordinates to grid cell { r, c }
     */
    getGridCellFromPointer(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cs = this.renderer.cellSize;

        if (!cs) return null;

        const c = Math.floor(x / cs);
        const r = Math.floor(y / cs);

        if (r >= 0 && r < this.height && c >= 0 && c < this.width) {
            return { r, c };
        }
        return null;
    }

    /**
     * Pointer Down: start drawing line
     */
    handlePointerDown(e) {
        if (this.isCompleted) return;
        this.sound.init();

        const cell = this.getGridCellFromPointer(e);
        if (!cell) return;

        const endpoint = this.getEndpointAt(cell.r, cell.c);
        const existingPathInfo = this.getPathAt(cell.r, cell.c);

        if (endpoint) {
            // Started on an endpoint
            this.saveHistory();
            this.moves++;

            // If this pair already had a path, remove it or restart from this endpoint
            this.activeDrawing = {
                id: endpoint.id,
                path: [{ r: cell.r, c: cell.c }],
                startPt: { r: cell.r, c: cell.c }
            };

            delete this.paths[endpoint.id];
            this.canvas.setPointerCapture(e.pointerId);
            this.sound.playStep(0);
            this.updateStats();
            this.renderLegend();
            this.requestRender();

        } else if (existingPathInfo) {
            // Clicked inside an existing path: pick up and re-draw from here!
            this.saveHistory();
            this.moves++;

            const id = existingPathInfo.id;
            const fullPath = existingPathInfo.path;
            const cutIdx = existingPathInfo.index;

            // Determine which endpoint the path started from
            const truncatedPath = fullPath.slice(0, cutIdx + 1);

            this.activeDrawing = {
                id: id,
                path: truncatedPath,
                startPt: truncatedPath[0]
            };

            this.paths[id] = truncatedPath;
            this.canvas.setPointerCapture(e.pointerId);
            this.sound.playStep(truncatedPath.length);
            this.updateStats();
            this.renderLegend();
            this.requestRender();
        }
    }

    /**
     * Pointer Move: extend, backtrack, or cut paths
     */
    handlePointerMove(e) {
        if (!this.activeDrawing || this.isCompleted) return;

        const cell = this.getGridCellFromPointer(e);
        if (!cell) return;

        const path = this.activeDrawing.path;
        const last = path[path.length - 1];

        // Same cell
        if (last.r === cell.r && last.c === cell.c) return;

        // Check if orthogonal step
        const dist = Math.abs(cell.r - last.r) + Math.abs(cell.c - last.c);
        if (dist !== 1) {
            // If pointer jumped fast across multiple cells, interpolate
            if (dist === 2 && (cell.r === last.r || cell.c === last.c)) {
                const mid = {
                    r: (cell.r + last.r) / 2,
                    c: (cell.c + last.c) / 2
                };
                this.stepToCell(mid);
            } else {
                return; // non-orthogonal or too far
            }
        }

        this.stepToCell(cell);
    }

    /**
     * Process moving the active path into a cell
     */
    stepToCell(cell) {
        const path = this.activeDrawing.path;
        const id = this.activeDrawing.id;

        // 1. Backtrack check: is cell already in our current drawing path?
        const backIdx = path.findIndex(p => p.r === cell.r && p.c === cell.c);
        if (backIdx !== -1) {
            // Player dragged back along the path -> truncate back to that cell!
            this.activeDrawing.path = path.slice(0, backIdx + 1);
            this.sound.playStep(backIdx);
            this.requestRender();
            return;
        }

        // 2. Check if cell is an endpoint of ANOTHER pair
        const endpoint = this.getEndpointAt(cell.r, cell.c);
        if (endpoint && endpoint.id !== id) {
            // Cannot cross through another pair's endpoints
            return;
        }

        // 3. Collision with another path: cut or remove colliding path
        const otherPathInfo = this.getPathAt(cell.r, cell.c);
        if (otherPathInfo && otherPathInfo.id !== id) {
            const otherId = otherPathInfo.id;
            const otherPath = otherPathInfo.path;
            const cutIdx = otherPathInfo.index;

            // Cut from the collision point forward
            if (cutIdx <= 1) {
                delete this.paths[otherId];
            } else {
                this.paths[otherId] = otherPath.slice(0, cutIdx);
            }
            this.sound.playCut();
        }

        // 4. Check if we reached the matching endpoint of our CURRENT pair!
        if (endpoint && endpoint.id === id) {
            // Reached target!
            path.push({ r: cell.r, c: cell.c });
            this.paths[id] = [...path];
            this.activeDrawing = null;

            this.sound.playConnect(id);
            this.updateStats();
            this.renderLegend();
            this.checkWinCondition();
            this.requestRender();
            return;
        }

        // 5. Normal empty cell extension
        path.push({ r: cell.r, c: cell.c });
        this.sound.playStep(path.length);
        this.updateStats();
        this.requestRender();
    }

    /**
     * Pointer Up: commit active drawing
     */
    handlePointerUp(e) {
        if (!this.activeDrawing) return;

        const id = this.activeDrawing.id;
        const path = this.activeDrawing.path;

        // Keep partial path on the board so player can resume anytime
        if (path && path.length >= 1) {
            this.paths[id] = [...path];
        } else {
            delete this.paths[id];
        }

        this.activeDrawing = null;
        this.updateStats();
        this.renderLegend();
        this.checkWinCondition();
        this.requestRender();
    }

    /**
     * Calculates coverage and connected pairs
     */
    getGameMetrics() {
        if (!this.puzzle) return { connectedCount: 0, totalPairs: 0, coveredCells: 0, totalCells: 1, isWin: false };

        const totalPairs = this.puzzle.pairs.length;
        const totalCells = this.width * this.height;
        const occupied = new Set();
        let connectedCount = 0;

        for (const pair of this.puzzle.pairs) {
            const path = this.paths[pair.id];
            if (!path || path.length < 2) continue;

            const isStartFirst = (path[0].r === pair.start.r && path[0].c === pair.start.c);
            const isStartLast = (path[path.length - 1].r === pair.start.r && path[path.length - 1].c === pair.start.c);
            const isEndFirst = (path[0].r === pair.end.r && path[0].c === pair.end.c);
            const isEndLast = (path[path.length - 1].r === pair.end.r && path[path.length - 1].c === pair.end.c);

            if ((isStartFirst && isEndLast) || (isStartLast && isEndFirst)) {
                connectedCount++;
            }

            path.forEach(pt => occupied.add(`${pt.r},${pt.c}`));
        }

        const coveredCells = occupied.size;
        const coveragePercent = Math.round((coveredCells / totalCells) * 100);

        let isWin = false;
        if (this.winRule === 'flow') {
            isWin = (connectedCount === totalPairs) && (coveredCells === totalCells);
        } else {
            isWin = (connectedCount === totalPairs);
        }

        return {
            connectedCount,
            totalPairs,
            coveredCells,
            totalCells,
            coveragePercent,
            isWin
        };
    }

    /**
     * Updates HUD numbers and progress bars
     */
    updateStats() {
        const metrics = this.getGameMetrics();

        if (this.ui.moves) this.ui.moves.textContent = this.moves;
        if (this.ui.pairsConnected) this.ui.pairsConnected.textContent = `${metrics.connectedCount}/${metrics.totalPairs}`;
        if (this.ui.coverage) this.ui.coverage.textContent = `${metrics.coveredCells}/${metrics.totalCells} (${metrics.coveragePercent}%)`;
        if (this.ui.coverageBar) this.ui.coverageBar.style.width = `${metrics.coveragePercent}%`;
        if (this.ui.seedBadge) this.ui.seedBadge.textContent = `#${this.seed}`;
    }

    /**
     * Renders pair status pills at the bottom
     */
    renderLegend() {
        if (!this.ui.pairsLegend || !this.puzzle) return;
        this.ui.pairsLegend.innerHTML = '';

        this.puzzle.pairs.forEach(pair => {
            const color = this.renderer.getColor(pair.id, this.theme !== 'light');
            const path = this.paths[pair.id];
            const isConnected = path && path.length >= 2 &&
                ((path[0].r === pair.start.r && path[path.length - 1].r === pair.end.r &&
                  path[0].c === pair.start.c && path[path.length - 1].c === pair.end.c) ||
                 (path[0].r === pair.end.r && path[path.length - 1].r === pair.start.r &&
                  path[0].c === pair.end.c && path[path.length - 1].c === pair.start.c));

            const pill = document.createElement('div');
            pill.className = `pair-pill ${isConnected ? 'connected' : ''}`;
            pill.style.borderColor = color.hex;

            let label = pair.id;
            if (this.displayMode === 'symbols') label = this.renderer.symbols[(pair.id - 1) % this.renderer.symbols.length];
            if (this.displayMode === 'letters') label = this.renderer.letters[(pair.id - 1) % this.renderer.letters.length];

            pill.innerHTML = `
                <span class="pill-dot" style="background:${color.hex}; color:${color.text}">${label}</span>
                <span class="pill-status">${isConnected ? '✓' : '—'}</span>
            `;

            // Click pill to clear or highlight pair
            pill.addEventListener('click', () => {
                if (this.paths[pair.id]) {
                    this.saveHistory();
                    delete this.paths[pair.id];
                    this.sound.playCut();
                    this.updateStats();
                    this.renderLegend();
                    this.requestRender();
                }
            });

            this.ui.pairsLegend.appendChild(pill);
        });
    }

    /**
     * Checks if current board satisfies victory condition
     */
    checkWinCondition() {
        const metrics = this.getGameMetrics();

        if (metrics.isWin && !this.isCompleted) {
            this.isCompleted = true;
            clearInterval(this.timerInterval);

            // Celebration audio & confetti!
            this.sound.playVictory();
            this.renderer.startConfetti();
            this.startAnimationLoop();

            // Calculate stars
            // 3 stars: no hints used, perfect fill
            // 2 stars: solved with 1 hint
            // 1 star: solved with multiple hints
            let stars = 3;
            if (this.hintsUsed > 0) stars = Math.max(1, 3 - this.hintsUsed);

            setTimeout(() => {
                this.showWinModal(stars, metrics);
            }, 600);
        }
    }

    /**
     * Display celebration modal with stats
     */
    showWinModal(stars, metrics) {
        if (!this.ui.winModal) return;

        const starsEl = document.getElementById('win-stars');
        const timeEl = document.getElementById('win-time');
        const movesEl = document.getElementById('win-moves');
        const coverageEl = document.getElementById('win-coverage');
        const seedEl = document.getElementById('win-seed-code');

        if (starsEl) {
            starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        }
        if (timeEl) timeEl.textContent = this.ui.timer.textContent;
        if (movesEl) movesEl.textContent = this.moves;
        if (coverageEl) coverageEl.textContent = `${metrics.coveragePercent}%`;
        if (seedEl) seedEl.textContent = `${this.width}x${this.height}-${this.numPairs}-${this.seed}`;

        this.ui.winModal.classList.remove('hidden');
    }

    /**
     * Reveal one pair from the ground-truth solution
     */
    giveHint() {
        if (this.isCompleted || !this.puzzle) return;

        // Find a pair that is not yet connected correctly
        for (const pair of this.puzzle.pairs) {
            const current = this.paths[pair.id];
            const sol = pair.solution;

            const isCorrect = current && current.length === sol.length &&
                ((current[0].r === sol[0].r && current[current.length - 1].r === sol[sol.length - 1].r) ||
                 (current[0].r === sol[sol.length - 1].r && current[current.length - 1].r === sol[0].r));

            if (!isCorrect) {
                this.saveHistory();
                this.hintsUsed++;
                this.moves++;

                // Cut any intersecting paths
                sol.forEach(cell => {
                    const hit = this.getPathAt(cell.r, cell.c);
                    if (hit && hit.id !== pair.id) {
                        delete this.paths[hit.id];
                    }
                });

                this.paths[pair.id] = sol.map(pt => ({ r: pt.r, c: pt.c }));
                this.sound.playConnect(pair.id);
                this.updateStats();
                this.renderLegend();
                this.checkWinCondition();
                this.requestRender();
                return;
            }
        }
    }

    /**
     * Reveal entire solution
     */
    solvePuzzle() {
        if (this.isCompleted || !this.puzzle) return;
        this.saveHistory();
        this.hintsUsed += 99;

        this.puzzle.pairs.forEach(pair => {
            this.paths[pair.id] = pair.solution.map(pt => ({ r: pt.r, c: pt.c }));
        });

        this.sound.playVictory();
        this.updateStats();
        this.renderLegend();
        this.checkWinCondition();
        this.requestRender();
    }

    /**
     * Copies level seed code to clipboard
     */
    shareSeed() {
        const code = `${this.width}x${this.height}-${this.numPairs}-${this.seed}`;
        navigator.clipboard.writeText(code).then(() => {
            alert(`Kód úrovne "${code}" bol skopírovaný do schránky!`);
        }).catch(() => {
            prompt('Kód tejto úrovne:', code);
        });
    }

    /**
     * Prompts user with options to view/copy current seed or load a new seed
     */
    promptSeedAction() {
        const currentCode = `${this.width}x${this.height}-${this.numPairs}-${this.seed}`;
        const input = prompt(
            `Kód aktuálnej úrovne:\n${currentCode}\n\nAk chcete nahrať inú úroveň, zadajte jej kód (napr. 7x7-6-123456):`,
            currentCode
        );
        if (!input) return;
        const trimmed = input.trim();
        if (trimmed && trimmed !== currentCode) {
            this.loadSeedCode(trimmed);
        } else if (trimmed === currentCode) {
            navigator.clipboard.writeText(currentCode).catch(() => {});
        }
    }

    /**
     * Parses and loads a seed code (e.g. 7x7-6-123456 or raw seed)
     */
    loadSeedCode(code) {
        const match = code.match(/^(\d+)x(\d+)-(\d+)-(.+)$/i);
        if (match) {
            const w = Math.max(4, Math.min(12, parseInt(match[1], 10)));
            const h = Math.max(4, Math.min(12, parseInt(match[2], 10)));
            const p = Math.max(2, Math.min(12, parseInt(match[3], 10)));
            const s = match[4];
            this.newGame(w, h, p, s);
        } else {
            this.newGame(this.width, this.height, this.numPairs, code);
        }
    }

    /**
     * Theme toggle
     */
    toggleTheme() {
        const next = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(next);
    }

    applyTheme(theme) {
        this.theme = theme;
        localStorage.setItem('numberlink_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        if (this.ui.btnTheme) {
            this.ui.btnTheme.innerHTML = theme === 'dark' ? '☀️' : '🌙';
            this.ui.btnTheme.title = theme === 'dark' ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim';
        }
        this.renderLegend();
        this.requestRender();
    }

    /**
     * Sound toggle
     */
    toggleSound() {
        const isMuted = this.sound.toggleMute();
        if (this.ui.btnSound) {
            this.ui.btnSound.innerHTML = isMuted ? '🔇' : '🔊';
            this.ui.btnSound.title = isMuted ? 'Zapnúť zvuk' : 'Stlmiť zvuk';
        }
    }

    /**
     * Custom Game modal setup
     */
    setupCustomModal() {
        const btnOpen = document.getElementById('btn-custom');
        const modal = document.getElementById('custom-modal');
        const btnStart = document.getElementById('custom-start-btn');
        const inW = document.getElementById('custom-width');
        const inH = document.getElementById('custom-height');
        const inP = document.getElementById('custom-pairs');
        const inSeed = document.getElementById('custom-seed');

        if (btnOpen && modal) {
            btnOpen.addEventListener('click', () => {
                inW.value = this.width;
                inH.value = this.height;
                inP.value = this.numPairs;
                inSeed.value = '';
                modal.classList.remove('hidden');
            });
        }

        if (btnStart && modal) {
            btnStart.addEventListener('click', () => {
                const w = Math.max(4, Math.min(12, parseInt(inW.value, 10) || 6));
                const h = Math.max(4, Math.min(12, parseInt(inH.value, 10) || 6));
                const maxPairs = Math.min(12, Math.floor((w * h) / 3));
                const p = Math.max(2, Math.min(maxPairs, parseInt(inP.value, 10) || 5));
                const seedVal = inSeed.value.trim();
                const seed = seedVal ? (isNaN(seedVal) ? seedVal : parseInt(seedVal, 10)) : null;

                modal.classList.add('hidden');
                if (this.ui.selectDifficulty) this.ui.selectDifficulty.value = 'custom';
                this.newGame(w, h, p, seed);
            });
        }
    }

    openCustomModal() {
        const modal = document.getElementById('custom-modal');
        if (modal) modal.classList.remove('hidden');
    }
}

// Instantiate game upon window load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new NumberlinkGame();
});
