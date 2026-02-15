'use strict';

/* ========================================
   Configuration
   ======================================== */
const CONFIG = Object.freeze({
    DEFAULT_CANVAS_SIZE: 800,
    DEFAULT_VISIBLE_GRID_SIZE: 80,
    DEFAULT_WORLD_SIZE: 240,
    WORLD_SIZE_MULTIPLIER: 3,
    DEFAULT_ZOOM_LEVEL: 1,
    MIN_ZOOM_LEVEL: 0.5,
    MAX_ZOOM_LEVEL: 1,
    PINCH_ZOOM_SMOOTHING: 0.24,
    PINCH_ZOOM_APPLY_STEP: 0.004,
    PAN_DRAG_THRESHOLD_PX: 7,

    MIN_CANVAS_SIZE: 200,
    MAX_CANVAS_SIZE: 2000,
    MIN_VISIBLE_GRID_SIZE: 6,
    MAX_VISIBLE_GRID_SIZE: 240,
    MIN_WORLD_SIZE: 40,
    MAX_WORLD_SIZE: 2000,

    DESKTOP_MIN_CELL_REM: 0.75,
    TOUCH_MIN_CELL_REM: 1.5,

    ANIMATION_DELAY: 100,
    DEATH_FLASH_MS: 100,

    COLORS: {
        ALIVE: '#58b66f',
        DEAD: '#171b1a',
        GRID: '#33413d',
        DYING: '#5a2429'
    }
});

function clampInteger(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

function getRootFontSizePx() {
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    return Number.isFinite(rootFontSize) && rootFontSize > 0 ? rootFontSize : 16;
}

function isCoarsePointer() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

function getBaseMinimumCellSizePx() {
    const remSize = isCoarsePointer() ? CONFIG.TOUCH_MIN_CELL_REM : CONFIG.DESKTOP_MIN_CELL_REM;
    return remSize * getRootFontSizePx();
}

function clampZoomLevel(value) {
    if (!Number.isFinite(value)) return CONFIG.DEFAULT_ZOOM_LEVEL;
    return Math.min(Math.max(value, CONFIG.MIN_ZOOM_LEVEL), CONFIG.MAX_ZOOM_LEVEL);
}

function getCanvasContentWidth(canvas) {
    const wrapper = canvas.closest('.canvas-wrapper');
    if (!wrapper) return null;

    const wrapperRect = wrapper.getBoundingClientRect();
    const wrapperStyles = window.getComputedStyle(wrapper);
    const horizontalPadding =
        Number.parseFloat(wrapperStyles.paddingLeft || '0') +
        Number.parseFloat(wrapperStyles.paddingRight || '0');
    const horizontalBorder =
        Number.parseFloat(wrapperStyles.borderLeftWidth || '0') +
        Number.parseFloat(wrapperStyles.borderRightWidth || '0');

    return Math.floor(wrapperRect.width - horizontalPadding - horizontalBorder);
}

function getInitialCanvasSize(canvas, maxCanvasSize) {
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const contentWidth = getCanvasContentWidth(canvas);
    const availableWidth = contentWidth ? Math.min(contentWidth, viewportWidth) : viewportWidth;

    return clampInteger(
        availableWidth,
        CONFIG.MIN_CANVAS_SIZE,
        maxCanvasSize,
        maxCanvasSize
    );
}

function getMaxVisibleGridForCanvas(canvasSize, minCellSizePx) {
    return Math.max(1, Math.floor(canvasSize / minCellSizePx));
}

function calculateViewportOrigin(worldSize, visibleGridSize, centerX, centerY) {
    const maxOrigin = Math.max(0, worldSize - visibleGridSize);
    const viewportX = clampInteger(
        Math.round(centerX - (visibleGridSize / 2)),
        0,
        maxOrigin,
        0
    );
    const viewportY = clampInteger(
        Math.round(centerY - (visibleGridSize / 2)),
        0,
        maxOrigin,
        0
    );

    return { viewportX, viewportY };
}

function createBoardConfig(overrides = {}) {
    const maxCanvasSize = clampInteger(
        overrides.maxCanvasSize,
        CONFIG.MIN_CANVAS_SIZE,
        CONFIG.MAX_CANVAS_SIZE,
        CONFIG.DEFAULT_CANVAS_SIZE
    );

    const canvasSize = clampInteger(
        overrides.canvasSize,
        CONFIG.MIN_CANVAS_SIZE,
        maxCanvasSize,
        maxCanvasSize
    );

    const baseMinCellSizePx = Number.isFinite(overrides.baseMinCellSizePx) && overrides.baseMinCellSizePx > 0
        ? overrides.baseMinCellSizePx
        : (
            Number.isFinite(overrides.minCellSizePx) && overrides.minCellSizePx > 0
                ? overrides.minCellSizePx
                : getBaseMinimumCellSizePx()
        );
    const zoomLevel = clampZoomLevel(overrides.zoomLevel ?? CONFIG.DEFAULT_ZOOM_LEVEL);
    const minCellSizePx = baseMinCellSizePx * zoomLevel;

    const preferredVisibleGridSize = clampInteger(
        overrides.visibleGridSize,
        CONFIG.MIN_VISIBLE_GRID_SIZE,
        CONFIG.MAX_VISIBLE_GRID_SIZE,
        CONFIG.DEFAULT_VISIBLE_GRID_SIZE
    );

    const maxVisibleByCellSize = getMaxVisibleGridForCanvas(canvasSize, minCellSizePx);
    const visibleGridSize = Math.max(
        1,
        Math.min(preferredVisibleGridSize, maxVisibleByCellSize)
    );

    const defaultWorldSize = Math.max(
        CONFIG.DEFAULT_WORLD_SIZE,
        visibleGridSize * CONFIG.WORLD_SIZE_MULTIPLIER
    );

    const worldSize = Math.max(
        visibleGridSize,
        clampInteger(
            overrides.worldSize,
            CONFIG.MIN_WORLD_SIZE,
            CONFIG.MAX_WORLD_SIZE,
            defaultWorldSize
        )
    );

    const hasExplicitViewport = Number.isFinite(overrides.viewportX) && Number.isFinite(overrides.viewportY);
    let viewportX;
    let viewportY;

    if (hasExplicitViewport) {
        const maxOrigin = Math.max(0, worldSize - visibleGridSize);
        viewportX = clampInteger(overrides.viewportX, 0, maxOrigin, 0);
        viewportY = clampInteger(overrides.viewportY, 0, maxOrigin, 0);
    } else {
        const viewportCenterX = Number.isFinite(overrides.viewportCenterX)
            ? overrides.viewportCenterX
            : worldSize / 2;
        const viewportCenterY = Number.isFinite(overrides.viewportCenterY)
            ? overrides.viewportCenterY
            : worldSize / 2;

        ({ viewportX, viewportY } = calculateViewportOrigin(
            worldSize,
            visibleGridSize,
            viewportCenterX,
            viewportCenterY
        ));
    }

    return {
        canvasSize,
        maxCanvasSize,
        visibleGridSize,
        worldSize,
        viewportX,
        viewportY,
        zoomLevel,
        baseMinCellSizePx,
        minCellSizePx,
        cellSize: canvasSize / visibleGridSize
    };
}

function parseInitialBoardConfig(canvas) {
    if (!canvas) return createBoardConfig();

    const configuredMaxCanvas = clampInteger(
        canvas.dataset.canvasSize,
        CONFIG.MIN_CANVAS_SIZE,
        CONFIG.MAX_CANVAS_SIZE,
        CONFIG.DEFAULT_CANVAS_SIZE
    );

    const fittedCanvasSize = getInitialCanvasSize(canvas, configuredMaxCanvas);

    return createBoardConfig({
        maxCanvasSize: configuredMaxCanvas,
        canvasSize: fittedCanvasSize,
        visibleGridSize: canvas.dataset.gridSize,
        worldSize: canvas.dataset.worldSize,
        zoomLevel: Number.parseFloat(canvas.dataset.zoomLevel) / 100,
        baseMinCellSizePx: getBaseMinimumCellSizePx()
    });
}

function scaleAliveCells(cells, sourceSize, targetSize) {
    if (sourceSize === targetSize) {
        return cells.map(([x, y]) => [x, y]);
    }

    const mapped = new Set();

    for (const [x, y] of cells) {
        const mappedX = Math.min(targetSize - 1, Math.floor((x / sourceSize) * targetSize));
        const mappedY = Math.min(targetSize - 1, Math.floor((y / sourceSize) * targetSize));
        mapped.add(`${mappedX},${mappedY}`);
    }

    return Array.from(mapped, (entry) => entry.split(',').map(Number));
}

function isInsideViewport(worldX, worldY, boardConfig) {
    const viewportEndX = boardConfig.viewportX + boardConfig.visibleGridSize;
    const viewportEndY = boardConfig.viewportY + boardConfig.visibleGridSize;

    return worldX >= boardConfig.viewportX &&
        worldX < viewportEndX &&
        worldY >= boardConfig.viewportY &&
        worldY < viewportEndY;
}

function getPointerDistance(pointA, pointB) {
    return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
}

/* ========================================
   Patterns Module
   ======================================== */
const Patterns = {
    life() {
        const cells = [];

        for (let y = 37; y < 44; y++) cells.push([31, y]);
        for (let x = 32; x < 35; x++) cells.push([x, 43]);

        for (let y = 37; y < 44; y++) cells.push([37, y]);

        for (let y = 37; y < 44; y++) cells.push([40, y]);
        for (let x = 41; x < 44; x++) {
            cells.push([x, 37]);
            cells.push([x, 40]);
        }

        for (let y = 37; y < 44; y++) cells.push([46, y]);
        for (let x = 47; x < 50; x++) {
            cells.push([x, 37]);
            cells.push([x, 40]);
            cells.push([x, 43]);
        }

        return cells;
    },

    gosperGliderGun() {
        return [
            [22, 38], [22, 39], [23, 38], [23, 39],
            [32, 38], [32, 39], [32, 40],
            [33, 37], [33, 41],
            [34, 36], [34, 42],
            [35, 36], [35, 42],
            [36, 39],
            [37, 37], [37, 41],
            [38, 38], [38, 39], [38, 40],
            [39, 39],
            [42, 36], [42, 37], [42, 38],
            [43, 36], [43, 37], [43, 38],
            [44, 35], [44, 39],
            [46, 34], [46, 35], [46, 39], [46, 40],
            [56, 36], [56, 37], [57, 36], [57, 37]
        ];
    },

    centerInArea(pattern, areaSize, offsetX = 0, offsetY = 0) {
        if (pattern.length === 0) return [];

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const [x, y] of pattern) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }

        const width = (maxX - minX) + 1;
        const height = (maxY - minY) + 1;
        const shiftX = Math.floor((areaSize - width) / 2) - minX;
        const shiftY = Math.floor((areaSize - height) / 2) - minY;

        return pattern.map(([x, y]) => [x + shiftX + offsetX, y + shiftY + offsetY]);
    }
};

/* ========================================
   Grid Class - World State Management
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

    getAliveCells() {
        const aliveCells = [];

        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                if (this.cells[x][y]) {
                    aliveCells.push([x, y]);
                }
            }
        }

        return aliveCells;
    }

    loadCells(cells) {
        this.cells = this.createEmptyGrid();

        for (const [x, y] of cells) {
            this.setCell(x, y, true);
        }
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
        if (!this.isValidPosition(x, y)) return false;
        return this.cells[x][y];
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

    nextGenerationWithTransitions() {
        const newCells = this.createEmptyGrid();
        const dyingCells = [];

        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                const neighbors = this.countNeighbors(x, y);
                const alive = this.cells[x][y];

                if (alive && (neighbors === 2 || neighbors === 3)) {
                    newCells[x][y] = true;
                } else if (!alive && neighbors === 3) {
                    newCells[x][y] = true;
                } else if (alive) {
                    dyingCells.push([x, y]);
                }
            }
        }

        this.cells = newCells;
        this.cycleCount++;

        return {
            cycleCount: this.cycleCount,
            dyingCells
        };
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
    constructor(canvas, colors, boardConfig) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.colors = colors;
        this.boardConfig = boardConfig;
        this.setupCanvas();
    }

    updateBoardConfig(boardConfig) {
        this.boardConfig = boardConfig;
        this.setupCanvas();
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = Math.round(this.boardConfig.canvasSize * dpr);
        this.canvas.height = Math.round(this.boardConfig.canvasSize * dpr);

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        this.canvas.style.width = `${this.boardConfig.canvasSize}px`;
        this.canvas.style.height = `${this.boardConfig.canvasSize}px`;
    }

    clear() {
        this.ctx.fillStyle = this.colors.DEAD;
        this.ctx.fillRect(0, 0, this.boardConfig.canvasSize, this.boardConfig.canvasSize);
    }

    drawGrid() {
        this.ctx.strokeStyle = this.colors.GRID;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        for (let i = 0; i <= this.boardConfig.visibleGridSize; i++) {
            const position = i * this.boardConfig.cellSize;
            this.ctx.moveTo(position, 0);
            this.ctx.lineTo(position, this.boardConfig.canvasSize);
            this.ctx.moveTo(0, position);
            this.ctx.lineTo(this.boardConfig.canvasSize, position);
        }

        this.ctx.stroke();
    }

    drawCell(localX, localY, alive, colorOverride = null) {
        const pixelX = localX * this.boardConfig.cellSize;
        const pixelY = localY * this.boardConfig.cellSize;
        const inset = Math.min(1, this.boardConfig.cellSize * 0.16);
        const drawSize = Math.max(0.5, this.boardConfig.cellSize - (inset * 2));

        if (colorOverride) {
            this.ctx.fillStyle = colorOverride;
        } else {
            this.ctx.fillStyle = alive ? this.colors.ALIVE : this.colors.DEAD;
        }

        this.ctx.fillRect(
            pixelX + inset,
            pixelY + inset,
            drawSize,
            drawSize
        );
    }

    render(grid) {
        this.clear();
        this.drawGrid();

        for (let localX = 0; localX < this.boardConfig.visibleGridSize; localX++) {
            for (let localY = 0; localY < this.boardConfig.visibleGridSize; localY++) {
                const worldX = this.boardConfig.viewportX + localX;
                const worldY = this.boardConfig.viewportY + localY;

                if (grid.getCell(worldX, worldY)) {
                    this.drawCell(localX, localY, true);
                }
            }
        }
    }

    renderWithDyingCells(grid, dyingCells) {
        this.render(grid);

        for (const [worldX, worldY] of dyingCells) {
            if (!isInsideViewport(worldX, worldY, this.boardConfig)) continue;

            const localX = worldX - this.boardConfig.viewportX;
            const localY = worldY - this.boardConfig.viewportY;
            this.drawCell(localX, localY, false, this.colors.DYING);
        }
    }

    getCellFromMouseEvent(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.boardConfig.canvasSize / rect.width;
        const scaleY = this.boardConfig.canvasSize / rect.height;

        const localX = Math.floor((event.clientX - rect.left) * scaleX / this.boardConfig.cellSize);
        const localY = Math.floor((event.clientY - rect.top) * scaleY / this.boardConfig.cellSize);

        return { localX, localY };
    }
}

/* ========================================
   Game Controller Class
   ======================================== */
class GameController {
    constructor(grid, renderer, boardConfig, timingConfig) {
        this.grid = grid;
        this.renderer = renderer;
        this.boardConfig = boardConfig;
        this.timingConfig = timingConfig;

        this.isPlaying = false;
        this.animationId = null;
        this.lastFrameTime = 0;
        this.deathFlashTimeoutId = null;
        this.resizeDebounceId = null;
        this.activePointerId = null;
        this.pointerPan = null;
        this.canvasPointers = new Map();
        this.pinchState = null;
        this.suppressTapAfterGesture = false;
        this.minimapPointerId = null;
        this.minimapCtx = null;

        this.elements = {};
        this.cacheElements();
        this.minimapCtx = this.elements.minimapCanvas
            ? this.elements.minimapCanvas.getContext('2d')
            : null;
        this.bindEvents();

        this.loadPattern('life');
        this.updateZoomDisplay();
    }

    cacheElements() {
        this.elements = {
            canvas: document.getElementById('game-canvas'),
            minimapCanvas: document.getElementById('minimap-canvas'),
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
            btnModalClose: document.getElementById('btn-modal-close'),
            zoomLevel: document.getElementById('zoom-level'),
            zoomLevelValue: document.getElementById('zoom-level-value'),
            boardCellCount: document.getElementById('board-cell-count'),
            boardDimensions: document.getElementById('board-dimensions')
        };
    }

    bindEvents() {
        this.elements.canvas.addEventListener('pointerdown', (e) => this.handleCanvasPointerDown(e));
        this.elements.canvas.addEventListener('pointermove', (e) => this.handleCanvasPointerMove(e));
        this.elements.canvas.addEventListener('pointerup', (e) => this.handleCanvasPointerUp(e));
        this.elements.canvas.addEventListener('pointercancel', (e) => this.handleCanvasPointerCancel(e));

        this.elements.btnPlay.addEventListener('click', () => this.togglePlay());
        this.elements.btnStep.addEventListener('click', () => this.step());
        this.elements.btnRunCycles.addEventListener('click', () => this.runBatchCycles());

        this.elements.btnPatternLife.addEventListener('click', () => this.loadPattern('life'));
        this.elements.btnPatternGlider.addEventListener('click', () => this.loadPattern('gosperGliderGun'));

        this.elements.btnClear.addEventListener('click', () => this.clearGrid());

        this.elements.btnAbout.addEventListener('click', () => this.openModal());
        this.elements.btnCloseModal.addEventListener('click', () => this.closeModal());
        this.elements.btnModalClose.addEventListener('click', () => this.closeModal());

        this.elements.aboutModal.addEventListener('click', (e) => {
            if (e.target === this.elements.aboutModal) {
                this.closeModal();
            }
        });

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        this.elements.batchCycles.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.runBatchCycles();
            }
        });

        if (this.elements.zoomLevel) {
            this.elements.zoomLevel.addEventListener('input', () => {
                const zoomPercent = Number.parseInt(this.elements.zoomLevel.value, 10);
                this.setZoomLevel(zoomPercent / 100);
            });
        }

        if (this.elements.minimapCanvas) {
            this.elements.minimapCanvas.addEventListener('pointerdown', (e) => this.handleMinimapPointerDown(e));
            this.elements.minimapCanvas.addEventListener('pointermove', (e) => this.handleMinimapPointerMove(e));
            this.elements.minimapCanvas.addEventListener('pointerup', (e) => this.handleMinimapPointerUp(e));
            this.elements.minimapCanvas.addEventListener('pointercancel', (e) => this.handleMinimapPointerCancel(e));
        }

        window.addEventListener('resize', () => this.handleWindowResize());
    }

    renderWorld() {
        this.renderer.render(this.grid);
        this.renderMinimap();
    }

    renderWorldWithDyingCells(dyingCells) {
        this.renderer.renderWithDyingCells(this.grid, dyingCells);
        this.renderMinimap();
    }

    renderMinimap() {
        if (!this.minimapCtx || !this.elements.minimapCanvas) return;

        const ctx = this.minimapCtx;
        const canvas = this.elements.minimapCanvas;
        const width = canvas.width;
        const height = canvas.height;
        const worldSize = this.boardConfig.worldSize;
        const scaleX = width / worldSize;
        const scaleY = height / worldSize;
        const pointW = Math.max(1, Math.ceil(scaleX));
        const pointH = Math.max(1, Math.ceil(scaleY));

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#111715';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = this.renderer.colors.ALIVE;
        for (let x = 0; x < this.grid.size; x++) {
            for (let y = 0; y < this.grid.size; y++) {
                if (this.grid.cells[x][y]) {
                    ctx.fillRect(
                        Math.floor(x * scaleX),
                        Math.floor(y * scaleY),
                        pointW,
                        pointH
                    );
                }
            }
        }

        ctx.strokeStyle = '#8fd3aa';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            Math.floor(this.boardConfig.viewportX * scaleX),
            Math.floor(this.boardConfig.viewportY * scaleY),
            Math.max(1, Math.ceil(this.boardConfig.visibleGridSize * scaleX)),
            Math.max(1, Math.ceil(this.boardConfig.visibleGridSize * scaleY))
        );
    }

    updateZoomDisplay() {
        if (!this.elements.zoomLevel || !this.elements.zoomLevelValue) return;

        const zoomPercent = Math.round(this.boardConfig.zoomLevel * 100);
        this.elements.zoomLevel.value = String(zoomPercent);
        this.elements.zoomLevelValue.textContent = `${zoomPercent}%`;
    }

    applyViewport(viewportX, viewportY, shouldRender = true) {
        const maxOrigin = Math.max(0, this.boardConfig.worldSize - this.boardConfig.visibleGridSize);
        const clampedX = clampInteger(viewportX, 0, maxOrigin, 0);
        const clampedY = clampInteger(viewportY, 0, maxOrigin, 0);

        this.boardConfig.viewportX = clampedX;
        this.boardConfig.viewportY = clampedY;
        this.renderer.updateBoardConfig(this.boardConfig);

        if (shouldRender) {
            this.renderWorld();
        }

        return this.getBoardConfig();
    }

    toggleCellFromPointerEvent(event) {
        const { localX, localY } = this.renderer.getCellFromMouseEvent(event);

        if (localX < 0 || localY < 0 || localX >= this.boardConfig.visibleGridSize || localY >= this.boardConfig.visibleGridSize) {
            return;
        }

        const worldX = this.boardConfig.viewportX + localX;
        const worldY = this.boardConfig.viewportY + localY;

        if (this.grid.isValidPosition(worldX, worldY)) {
            this.grid.toggleCell(worldX, worldY);
            this.renderWorld();
        }
    }

    handleCanvasPointerDown(event) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        this.canvasPointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY
        });

        this.elements.canvas.setPointerCapture(event.pointerId);

        if (this.canvasPointers.size >= 2) {
            const points = Array.from(this.canvasPointers.values());
            const initialDistance = getPointerDistance(points[0], points[1]);

            if (initialDistance > 0) {
                this.pinchState = {
                    startDistance: initialDistance,
                    startZoomLevel: this.boardConfig.zoomLevel,
                    smoothedZoomLevel: this.boardConfig.zoomLevel
                };
            }

            this.suppressTapAfterGesture = true;
            this.activePointerId = null;
            this.pointerPan = null;
        } else if (this.canvasPointers.size === 1 && this.activePointerId === null) {
            this.activePointerId = event.pointerId;
            this.pointerPan = {
                lastX: event.clientX,
                lastY: event.clientY,
                accumX: 0,
                accumY: 0,
                moved: false
            };
        }

        event.preventDefault();
    }

    handleCanvasPointerMove(event) {
        if (!this.canvasPointers.has(event.pointerId)) return;

        this.canvasPointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY
        });

        if (this.pinchState && this.canvasPointers.size >= 2) {
            const points = Array.from(this.canvasPointers.values());
            const currentDistance = getPointerDistance(points[0], points[1]);

            if (currentDistance > 0 && this.pinchState.startDistance > 0) {
                const zoomRatio = currentDistance / this.pinchState.startDistance;
                const targetZoomLevel = clampZoomLevel(this.pinchState.startZoomLevel * zoomRatio);
                const currentSmoothedZoom = this.pinchState.smoothedZoomLevel;
                const nextSmoothedZoom = clampZoomLevel(
                    currentSmoothedZoom + ((targetZoomLevel - currentSmoothedZoom) * CONFIG.PINCH_ZOOM_SMOOTHING)
                );

                this.pinchState.smoothedZoomLevel = nextSmoothedZoom;

                if (Math.abs(nextSmoothedZoom - this.boardConfig.zoomLevel) >= CONFIG.PINCH_ZOOM_APPLY_STEP) {
                    this.setZoomLevel(nextSmoothedZoom);
                }
            }

            event.preventDefault();
            return;
        }

        if (this.activePointerId !== event.pointerId || !this.pointerPan) return;

        const dx = event.clientX - this.pointerPan.lastX;
        const dy = event.clientY - this.pointerPan.lastY;

        this.pointerPan.lastX = event.clientX;
        this.pointerPan.lastY = event.clientY;
        this.pointerPan.accumX += dx;
        this.pointerPan.accumY += dy;

        if (Math.abs(this.pointerPan.accumX) > CONFIG.PAN_DRAG_THRESHOLD_PX || Math.abs(this.pointerPan.accumY) > CONFIG.PAN_DRAG_THRESHOLD_PX) {
            this.pointerPan.moved = true;
            this.suppressTapAfterGesture = true;
        }

        const cellShiftX = Math.trunc(-this.pointerPan.accumX / this.boardConfig.cellSize);
        const cellShiftY = Math.trunc(-this.pointerPan.accumY / this.boardConfig.cellSize);

        if (cellShiftX !== 0 || cellShiftY !== 0) {
            this.pointerPan.accumX += cellShiftX * this.boardConfig.cellSize;
            this.pointerPan.accumY += cellShiftY * this.boardConfig.cellSize;
            this.panViewport(cellShiftX, cellShiftY);
        }
    }

    handleCanvasPointerUp(event) {
        if (this.elements.canvas.hasPointerCapture(event.pointerId)) {
            this.elements.canvas.releasePointerCapture(event.pointerId);
        }

        const wasActivePointer = this.activePointerId === event.pointerId;
        const shouldToggleCell =
            wasActivePointer &&
            this.pointerPan &&
            !this.pointerPan.moved &&
            !this.suppressTapAfterGesture &&
            !this.pinchState;

        this.canvasPointers.delete(event.pointerId);

        if (this.canvasPointers.size < 2) {
            this.pinchState = null;
        }

        if (wasActivePointer) {
            this.activePointerId = null;
            this.pointerPan = null;
        }

        if (this.canvasPointers.size === 0) {
            this.suppressTapAfterGesture = false;
        }

        if (shouldToggleCell) {
            this.toggleCellFromPointerEvent(event);
        }
    }

    handleCanvasPointerCancel(event) {
        if (this.elements.canvas.hasPointerCapture(event.pointerId)) {
            this.elements.canvas.releasePointerCapture(event.pointerId);
        }

        this.canvasPointers.delete(event.pointerId);

        if (this.activePointerId === event.pointerId) {
            this.activePointerId = null;
            this.pointerPan = null;
        }

        if (this.canvasPointers.size < 2) {
            this.pinchState = null;
        }

        if (this.canvasPointers.size === 0) {
            this.suppressTapAfterGesture = false;
        }
    }

    setViewportCenterFromMinimapPointer(event) {
        if (!this.elements.minimapCanvas) return;

        const rect = this.elements.minimapCanvas.getBoundingClientRect();
        const relativeX = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
        const relativeY = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
        const worldX = Math.floor(relativeX * this.boardConfig.worldSize);
        const worldY = Math.floor(relativeY * this.boardConfig.worldSize);

        this.setViewportCenter(worldX, worldY);
    }

    handleMinimapPointerDown(event) {
        if (!this.elements.minimapCanvas) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        this.minimapPointerId = event.pointerId;
        this.elements.minimapCanvas.setPointerCapture(event.pointerId);
        this.setViewportCenterFromMinimapPointer(event);
        event.preventDefault();
    }

    handleMinimapPointerMove(event) {
        if (this.minimapPointerId !== event.pointerId) return;
        this.setViewportCenterFromMinimapPointer(event);
        event.preventDefault();
    }

    handleMinimapPointerUp(event) {
        if (this.minimapPointerId !== event.pointerId || !this.elements.minimapCanvas) return;

        if (this.elements.minimapCanvas.hasPointerCapture(event.pointerId)) {
            this.elements.minimapCanvas.releasePointerCapture(event.pointerId);
        }

        this.minimapPointerId = null;
        event.preventDefault();
    }

    handleMinimapPointerCancel(event) {
        if (this.minimapPointerId !== event.pointerId || !this.elements.minimapCanvas) return;

        if (this.elements.minimapCanvas.hasPointerCapture(event.pointerId)) {
            this.elements.minimapCanvas.releasePointerCapture(event.pointerId);
        }

        this.minimapPointerId = null;
        event.preventDefault();
    }

    handleWindowResize() {
        if (this.resizeDebounceId) {
            clearTimeout(this.resizeDebounceId);
        }

        this.resizeDebounceId = setTimeout(() => {
            this.resizeDebounceId = null;
            const fittedCanvasSize = getInitialCanvasSize(this.elements.canvas, this.boardConfig.maxCanvasSize);
            this.setBoardConfig(
                {
                    canvasSize: fittedCanvasSize,
                    baseMinCellSizePx: getBaseMinimumCellSizePx(),
                    zoomLevel: this.boardConfig.zoomLevel
                },
                { preserveState: true, keepViewportCenter: true }
            );
        }, 120);
    }

    clearPendingDeathFlash() {
        if (this.deathFlashTimeoutId) {
            clearTimeout(this.deathFlashTimeoutId);
            this.deathFlashTimeoutId = null;
        }
    }

    updateBoardMetadata() {
        const worldCellCount = this.boardConfig.worldSize * this.boardConfig.worldSize;

        if (this.elements.boardCellCount) {
            this.elements.boardCellCount.textContent = worldCellCount.toLocaleString();
        }

        if (this.elements.boardDimensions) {
            this.elements.boardDimensions.textContent = `${this.boardConfig.worldSize} x ${this.boardConfig.worldSize}`;
        }
    }

    handleKeyboard(event) {
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

    step({ withDeathFlash = true } = {}) {
        this.clearPendingDeathFlash();
        const { dyingCells } = this.grid.nextGenerationWithTransitions();

        if (withDeathFlash && dyingCells.length > 0) {
            this.renderWorldWithDyingCells(dyingCells);
            this.deathFlashTimeoutId = setTimeout(() => {
                this.renderWorld();
                this.deathFlashTimeoutId = null;
            }, this.timingConfig.deathFlashMs);
        } else {
            this.renderWorld();
        }

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
        this.clearPendingDeathFlash();
        this.updatePlayButton(false);
        this.disableControls(false);
    }

    animate(currentTime = performance.now()) {
        if (!this.isPlaying) return;

        const elapsed = currentTime - this.lastFrameTime;

        if (elapsed >= this.timingConfig.animationDelay) {
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
            this.step({ withDeathFlash: false });
            if (i % 10 === 0) {
                await new Promise((resolve) => setTimeout(resolve, 0));
            }
        }

        this.elements.btnRunCycles.textContent = 'Run Cycles';
        this.elements.batchCycles.value = '';
        this.disableControls(false);
    }

    loadPattern(patternName) {
        this.stop();

        const patternFactory = Patterns[patternName];
        if (typeof patternFactory !== 'function') return;

        const centeredPattern = Patterns.centerInArea(
            patternFactory(),
            this.boardConfig.visibleGridSize,
            this.boardConfig.viewportX,
            this.boardConfig.viewportY
        );

        this.grid.loadPattern(centeredPattern);
        this.renderWorld();
        this.updateCycleDisplay();
        this.updateBoardMetadata();
    }

    clearGrid() {
        this.stop();
        this.grid.clear();
        this.renderWorld();
        this.updateCycleDisplay();
        this.updateBoardMetadata();
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

    getBoardConfig() {
        return {
            canvasSize: this.boardConfig.canvasSize,
            maxCanvasSize: this.boardConfig.maxCanvasSize,
            visibleGridSize: this.boardConfig.visibleGridSize,
            worldSize: this.boardConfig.worldSize,
            viewportX: this.boardConfig.viewportX,
            viewportY: this.boardConfig.viewportY,
            cellSize: this.boardConfig.cellSize,
            zoomLevel: this.boardConfig.zoomLevel,
            baseMinCellSizePx: this.boardConfig.baseMinCellSizePx,
            minCellSizePx: this.boardConfig.minCellSizePx
        };
    }

    setBoardConfig(nextConfig, options = {}) {
        const preserveState = options.preserveState ?? false;
        const keepViewportCenter = options.keepViewportCenter ?? true;

        const previousGrid = this.grid;
        const previousBoardConfig = this.boardConfig;

        const previousCenterX = previousBoardConfig.viewportX + (previousBoardConfig.visibleGridSize / 2);
        const previousCenterY = previousBoardConfig.viewportY + (previousBoardConfig.visibleGridSize / 2);

        const mergedConfig = createBoardConfig({
            maxCanvasSize: nextConfig.maxCanvasSize ?? previousBoardConfig.maxCanvasSize,
            canvasSize: nextConfig.canvasSize ?? previousBoardConfig.canvasSize,
            visibleGridSize: nextConfig.visibleGridSize ?? previousBoardConfig.visibleGridSize,
            worldSize: nextConfig.worldSize ?? previousBoardConfig.worldSize,
            baseMinCellSizePx: nextConfig.baseMinCellSizePx ?? previousBoardConfig.baseMinCellSizePx,
            zoomLevel: nextConfig.zoomLevel ?? previousBoardConfig.zoomLevel,
            viewportX: Number.isFinite(nextConfig.viewportX) ? nextConfig.viewportX : undefined,
            viewportY: Number.isFinite(nextConfig.viewportY) ? nextConfig.viewportY : undefined,
            viewportCenterX: Number.isFinite(nextConfig.viewportCenterX)
                ? nextConfig.viewportCenterX
                : (keepViewportCenter ? previousCenterX : undefined),
            viewportCenterY: Number.isFinite(nextConfig.viewportCenterY)
                ? nextConfig.viewportCenterY
                : (keepViewportCenter ? previousCenterY : undefined)
        });

        const needsScaleForWorldResize = preserveState && previousGrid.size !== mergedConfig.worldSize;
        const previousAliveCells = needsScaleForWorldResize ? previousGrid.getAliveCells() : null;
        const previousCycleCount = previousGrid.cycleCount;

        this.stop();

        this.boardConfig = mergedConfig;
        this.renderer.updateBoardConfig(this.boardConfig);

        if (preserveState) {
            if (previousGrid.size === this.boardConfig.worldSize) {
                this.grid = previousGrid;
            } else {
                this.grid = new Grid(this.boardConfig.worldSize);
                if (previousAliveCells) {
                    const scaledCells = scaleAliveCells(previousAliveCells, previousGrid.size, this.boardConfig.worldSize);
                    this.grid.loadCells(scaledCells);
                    this.grid.cycleCount = previousCycleCount;
                }
            }
        } else {
            this.grid = new Grid(this.boardConfig.worldSize);
            const centeredPattern = Patterns.centerInArea(
                Patterns.life(),
                this.boardConfig.visibleGridSize,
                this.boardConfig.viewportX,
                this.boardConfig.viewportY
            );
            this.grid.loadPattern(centeredPattern);
        }

        this.renderWorld();
        this.updateCycleDisplay();
        this.updateBoardMetadata();
        this.updateZoomDisplay();

        return this.getBoardConfig();
    }

    setGridSize(visibleGridSize, options = {}) {
        return this.setBoardConfig({ visibleGridSize }, options);
    }

    setCanvasSize(canvasSize, options = {}) {
        const resolvedOptions = {
            preserveState: options.preserveState ?? true,
            keepViewportCenter: options.keepViewportCenter ?? true
        };

        return this.setBoardConfig({ canvasSize }, resolvedOptions);
    }

    setWorldSize(worldSize, options = {}) {
        const resolvedOptions = {
            preserveState: options.preserveState ?? true,
            keepViewportCenter: options.keepViewportCenter ?? true
        };

        return this.setBoardConfig({ worldSize }, resolvedOptions);
    }

    setViewportCenter(centerX, centerY, options = {}) {
        const shouldRender = options.render ?? true;
        const { viewportX, viewportY } = calculateViewportOrigin(
            this.boardConfig.worldSize,
            this.boardConfig.visibleGridSize,
            centerX,
            centerY
        );

        return this.applyViewport(viewportX, viewportY, shouldRender);
    }

    panViewport(deltaX, deltaY) {
        const centerX = this.boardConfig.viewportX + (this.boardConfig.visibleGridSize / 2) + deltaX;
        const centerY = this.boardConfig.viewportY + (this.boardConfig.visibleGridSize / 2) + deltaY;
        return this.setViewportCenter(centerX, centerY);
    }

    setZoomLevel(zoomLevel, options = {}) {
        const resolvedOptions = {
            preserveState: true,
            keepViewportCenter: true,
            ...options
        };

        return this.setBoardConfig(
            {
                zoomLevel: clampZoomLevel(zoomLevel),
                visibleGridSize: this.boardConfig.worldSize
            },
            resolvedOptions
        );
    }
}

/* ========================================
   Application Initialization
   ======================================== */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const boardConfig = parseInitialBoardConfig(canvas);

    const grid = new Grid(boardConfig.worldSize);
    const renderer = new Renderer(canvas, CONFIG.COLORS, boardConfig);
    const game = new GameController(
        grid,
        renderer,
        boardConfig,
        {
            animationDelay: CONFIG.ANIMATION_DELAY,
            deathFlashMs: CONFIG.DEATH_FLASH_MS
        }
    );

    window.gameOfLife = {
        game,
        renderer,
        config: CONFIG,
        CONFIG,
        get grid() {
            return game.grid;
        },
        getGrid: () => game.grid,
        getBoardConfig: () => game.getBoardConfig(),
        setGridSize: (visibleGridSize, options) => game.setGridSize(visibleGridSize, options),
        setCanvasSize: (canvasSize, options) => game.setCanvasSize(canvasSize, options),
        setWorldSize: (worldSize, options) => game.setWorldSize(worldSize, options),
        setZoomLevel: (zoomLevel, options) => game.setZoomLevel(zoomLevel, options),
        setViewportCenter: (centerX, centerY, options) => game.setViewportCenter(centerX, centerY, options),
        panViewport: (deltaX, deltaY) => game.panViewport(deltaX, deltaY),
        setBoardConfig: (nextConfig, options) => game.setBoardConfig(nextConfig, options)
    };
});
