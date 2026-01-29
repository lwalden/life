'use strict';

/* ========================================
   Configuration
   ======================================== */
const CONFIG = Object.freeze({
    CANVAS_SIZE: 800,
    GRID_SIZE: 80,
    CELL_SIZE: 10,
    ANIMATION_DELAY: 100,
    COLORS: {
        ALIVE: '#1f2937',
        DEAD: '#ffffff',
        GRID: '#e5e7eb'
    }
});

/* ========================================
   Patterns Module
   ======================================== */
const Patterns = {
    // LIFE text pattern - matches original exactly
    life() {
        const cells = [];

        // L - vertical line at x=31, y=37-43, horizontal at x=32-34, y=43
        for (let y = 37; y < 44; y++) cells.push([31, y]);
        for (let x = 32; x < 35; x++) cells.push([x, 43]);

        // I - vertical line at x=37, y=37-43
        for (let y = 37; y < 44; y++) cells.push([37, y]);

        // F - vertical at x=40, horizontals at y=37 and y=40
        for (let y = 37; y < 44; y++) cells.push([40, y]);
        for (let x = 41; x < 44; x++) {
            cells.push([x, 37]);
            cells.push([x, 40]);
        }

        // E - vertical at x=46, horizontals at y=37, y=40, y=43
        for (let y = 37; y < 44; y++) cells.push([46, y]);
        for (let x = 47; x < 50; x++) {
            cells.push([x, 37]);
            cells.push([x, 40]);
            cells.push([x, 43]);
        }

        return cells;
    },

    // Gosper Glider Gun - matches original coordinates exactly
    gosperGliderGun() {
        return [
            // Left square
            [22, 38], [22, 39], [23, 38], [23, 39],
            // Left part of gun
            [32, 38], [32, 39], [32, 40],
            [33, 37], [33, 41],
            [34, 36], [34, 42],
            [35, 36], [35, 42],
            [36, 39],
            [37, 37], [37, 41],
            [38, 38], [38, 39], [38, 40],
            [39, 39],
            // Right part of gun
            [42, 36], [42, 37], [42, 38],
            [43, 36], [43, 37], [43, 38],
            [44, 35], [44, 39],
            [46, 34], [46, 35], [46, 39], [46, 40],
            // Right square
            [56, 36], [56, 37], [57, 36], [57, 37]
        ];
    }
};

/* ========================================
   Grid Class - Game State Management
   ======================================== */
class Grid {
    constructor(size) {
        this.size = size;
        this.cells = this.createEmptyGrid();
        this.cycleCount = 0;
    }

    createEmptyGrid() {
        return Array.from({ length: this.size }, () =>
            Array(this.size).fill(false)
        );
    }

    clear() {
        this.cells = this.createEmptyGrid();
        this.cycleCount = 0;
    }

    toggleCell(x, y) {
        if (this.isValidPosition(x, y)) {
            this.cells[x][y] = !this.cells[x][y];
        }
    }

    setCell(x, y, alive) {
        if (this.isValidPosition(x, y)) {
            this.cells[x][y] = alive;
        }
    }

    getCell(x, y) {
        // Toroidal wrapping
        const wrappedX = ((x % this.size) + this.size) % this.size;
        const wrappedY = ((y % this.size) + this.size) % this.size;
        return this.cells[wrappedX][wrappedY];
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.size && y >= 0 && y < this.size;
    }

    countNeighbors(x, y) {
        let count = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                if (this.getCell(x + dx, y + dy)) count++;
            }
        }
        return count;
    }

    nextGeneration() {
        const newCells = this.createEmptyGrid();

        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                const neighbors = this.countNeighbors(x, y);
                const alive = this.cells[x][y];

                // Conway's rules
                if (alive && (neighbors === 2 || neighbors === 3)) {
                    newCells[x][y] = true;
                } else if (!alive && neighbors === 3) {
                    newCells[x][y] = true;
                }
                // All other cases: cell dies or stays dead
            }
        }

        this.cells = newCells;
        this.cycleCount++;
        return this.cycleCount;
    }

    loadPattern(pattern) {
        this.clear();
        for (const [x, y] of pattern) {
            this.setCell(x, y, true);
        }
    }
}

/* ========================================
   Renderer Class - Canvas Drawing
   ======================================== */
class Renderer {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;
        this.setupCanvas();
    }

    setupCanvas() {
        // Handle high-DPI displays
        const dpr = window.devicePixelRatio || 1;

        // Set actual size in memory
        this.canvas.width = this.config.CANVAS_SIZE * dpr;
        this.canvas.height = this.config.CANVAS_SIZE * dpr;

        // Scale context to match
        this.ctx.scale(dpr, dpr);

        // Set display size
        this.canvas.style.width = `${this.config.CANVAS_SIZE}px`;
        this.canvas.style.height = `${this.config.CANVAS_SIZE}px`;
    }

    clear() {
        this.ctx.fillStyle = this.config.COLORS.DEAD;
        this.ctx.fillRect(0, 0, this.config.CANVAS_SIZE, this.config.CANVAS_SIZE);
    }

    drawGrid() {
        this.ctx.strokeStyle = this.config.COLORS.GRID;
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        for (let i = 0; i <= this.config.CANVAS_SIZE; i += this.config.CELL_SIZE) {
            // Vertical lines
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.config.CANVAS_SIZE);
            // Horizontal lines
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.config.CANVAS_SIZE, i);
        }
        this.ctx.stroke();
    }

    drawCell(x, y, alive) {
        const pixelX = x * this.config.CELL_SIZE;
        const pixelY = y * this.config.CELL_SIZE;

        this.ctx.fillStyle = alive ? this.config.COLORS.ALIVE : this.config.COLORS.DEAD;
        this.ctx.fillRect(
            pixelX + 1,
            pixelY + 1,
            this.config.CELL_SIZE - 2,
            this.config.CELL_SIZE - 2
        );
    }

    render(grid) {
        this.clear();
        this.drawGrid();

        for (let x = 0; x < grid.size; x++) {
            for (let y = 0; y < grid.size; y++) {
                if (grid.cells[x][y]) {
                    this.drawCell(x, y, true);
                }
            }
        }
    }

    getCellFromMouseEvent(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.config.CANVAS_SIZE / rect.width;
        const scaleY = this.config.CANVAS_SIZE / rect.height;

        const x = Math.floor((event.clientX - rect.left) * scaleX / this.config.CELL_SIZE);
        const y = Math.floor((event.clientY - rect.top) * scaleY / this.config.CELL_SIZE);

        return { x, y };
    }
}

/* ========================================
   Game Controller Class
   ======================================== */
class GameController {
    constructor(grid, renderer) {
        this.grid = grid;
        this.renderer = renderer;
        this.isPlaying = false;
        this.animationId = null;
        this.lastFrameTime = 0;

        this.elements = {};
        this.cacheElements();
        this.bindEvents();

        // Initial render with LIFE pattern
        this.loadPattern('life');
    }

    cacheElements() {
        this.elements = {
            canvas: document.getElementById('game-canvas'),
            cycleCount: document.getElementById('cycle-count'),
            batchCycles: document.getElementById('batch-cycles'),
            btnRunCycles: document.getElementById('btn-run-cycles'),
            btnPlay: document.getElementById('btn-play'),
            btnStep: document.getElementById('btn-step'),
            btnPatternLife: document.getElementById('btn-pattern-life'),
            btnPatternGlider: document.getElementById('btn-pattern-glider'),
            btnClear: document.getElementById('btn-clear'),
            btnAbout: document.getElementById('btn-about'),
            aboutModal: document.getElementById('about-modal'),
            btnCloseModal: document.getElementById('btn-close-modal'),
            btnModalClose: document.getElementById('btn-modal-close')
        };
    }

    bindEvents() {
        // Canvas click to toggle cells
        this.elements.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Playback controls
        this.elements.btnPlay.addEventListener('click', () => this.togglePlay());
        this.elements.btnStep.addEventListener('click', () => this.step());
        this.elements.btnRunCycles.addEventListener('click', () => this.runBatchCycles());

        // Pattern buttons
        this.elements.btnPatternLife.addEventListener('click', () => this.loadPattern('life'));
        this.elements.btnPatternGlider.addEventListener('click', () => this.loadPattern('gosperGliderGun'));

        // Clear button
        this.elements.btnClear.addEventListener('click', () => this.clearGrid());

        // Modal controls
        this.elements.btnAbout.addEventListener('click', () => this.openModal());
        this.elements.btnCloseModal.addEventListener('click', () => this.closeModal());
        this.elements.btnModalClose.addEventListener('click', () => this.closeModal());

        // Close modal on backdrop click
        this.elements.aboutModal.addEventListener('click', (e) => {
            if (e.target === this.elements.aboutModal) {
                this.closeModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Enter key in batch cycles input
        this.elements.batchCycles.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.runBatchCycles();
            }
        });
    }

    handleCanvasClick(event) {
        const { x, y } = this.renderer.getCellFromMouseEvent(event);
        if (this.grid.isValidPosition(x, y)) {
            this.grid.toggleCell(x, y);
            this.renderer.render(this.grid);
        }
    }

    handleKeyboard(event) {
        // Ignore if typing in input or modal is open
        if (event.target.tagName === 'INPUT') return;

        switch (event.key.toLowerCase()) {
            case ' ':
                event.preventDefault();
                this.togglePlay();
                break;
            case 's':
                this.step();
                break;
            case 'c':
                this.clearGrid();
                break;
            case 'escape':
                if (this.isPlaying) this.stop();
                this.closeModal();
                break;
        }
    }

    updateCycleDisplay() {
        this.elements.cycleCount.textContent = this.grid.cycleCount;
    }

    step() {
        this.grid.nextGeneration();
        this.renderer.render(this.grid);
        this.updateCycleDisplay();
    }

    togglePlay() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.play();
        }
    }

    play() {
        this.isPlaying = true;
        this.updatePlayButton(true);
        this.disableControls(true);
        this.lastFrameTime = performance.now();
        this.animate();
    }

    stop() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.updatePlayButton(false);
        this.disableControls(false);
    }

    animate(currentTime = performance.now()) {
        if (!this.isPlaying) return;

        const elapsed = currentTime - this.lastFrameTime;

        if (elapsed >= CONFIG.ANIMATION_DELAY) {
            this.step();
            this.lastFrameTime = currentTime;
        }

        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }

    async runBatchCycles() {
        const cycles = parseInt(this.elements.batchCycles.value, 10);
        if (isNaN(cycles) || cycles <= 0) return;

        this.stop();
        this.disableControls(true);
        this.elements.btnRunCycles.textContent = 'Running...';

        for (let i = 0; i < cycles; i++) {
            this.step();
            // Yield to UI every 10 cycles for responsiveness
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        this.elements.btnRunCycles.textContent = 'Run Cycles';
        this.elements.batchCycles.value = '';
        this.disableControls(false);
    }

    loadPattern(patternName) {
        this.stop();
        const pattern = Patterns[patternName]();
        this.grid.loadPattern(pattern);
        this.renderer.render(this.grid);
        this.updateCycleDisplay();
    }

    clearGrid() {
        this.stop();
        this.grid.clear();
        this.renderer.render(this.grid);
        this.updateCycleDisplay();
    }

    updatePlayButton(playing) {
        const btn = this.elements.btnPlay;
        if (playing) {
            btn.textContent = 'Stop';
            btn.classList.remove('btn-success');
            btn.classList.add('btn-playing');
        } else {
            btn.textContent = 'Play';
            btn.classList.remove('btn-playing');
            btn.classList.add('btn-success');
        }
    }

    disableControls(disabled) {
        this.elements.btnStep.disabled = disabled;
        this.elements.btnRunCycles.disabled = disabled;
        this.elements.btnPatternLife.disabled = disabled;
        this.elements.btnPatternGlider.disabled = disabled;
        this.elements.btnClear.disabled = disabled;
        this.elements.batchCycles.disabled = disabled;
    }

    openModal() {
        this.elements.aboutModal.showModal();
    }

    closeModal() {
        this.elements.aboutModal.close();
    }
}

/* ========================================
   Application Initialization
   ======================================== */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const grid = new Grid(CONFIG.GRID_SIZE);
    const renderer = new Renderer(canvas, CONFIG);
    const game = new GameController(grid, renderer);

    // Expose for debugging if needed
    window.gameOfLife = { grid, renderer, game, CONFIG };
});
