import { CONFIG } from './config.js';
import { Grid } from './grid.js';
import { Patterns } from './patterns.js';
import { ShellUiController } from './shell-ui-controller.js';
import { SidebarLayoutManager } from './sidebar-layout-manager.js';
import {
    calculateViewportOrigin,
    clampInteger,
    clampZoomLevel,
    createBoardConfig,
    getBaseMinimumCellSizePx,
    getInitialCanvasSize,
    getPointerDistance,
    isTouchUiContext,
    scaleAliveCells,
    syncTouchUiClass
} from './utils.js';

export class GameController {
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
        this.minimapRedrawTimeoutId = null;
        this.lastMinimapRenderTime = 0;
        this.activePointerId = null;
        this.pointerPan = null;
        this.canvasPointers = new Map();
        this.pinchState = null;
        this.suppressTapAfterGesture = false;
        this.minimapPointerId = null;
        this.minimapCtx = null;
        this.shellUi = null;
        this.sidebarLayoutManager = null;

        this.elements = {};
        this.cacheElements();
        this.shellUi = new ShellUiController(this.elements);
        this.sidebarLayoutManager = new SidebarLayoutManager(this.elements);
        this.minimapCtx = this.elements.minimapCanvas
            ? this.elements.minimapCanvas.getContext('2d')
            : null;
        this.bindEvents();

        this.loadPattern('life');
        this.updateZoomDisplay();
        this.sidebarLayoutManager.applyFit(true);
    }

    cacheElements() {
        this.elements = {
            canvas: document.getElementById('game-canvas'),
            canvasSection: document.querySelector('.canvas-section'),
            controlsSection: document.querySelector('.controls-section'),
            minimapCanvas: document.getElementById('minimap-canvas'),
            cycleCount: document.getElementById('cycle-count'),
            btnStepBack: document.getElementById('btn-step-back'),
            btnPlay: document.getElementById('btn-play'),
            btnStep: document.getElementById('btn-step'),
            btnPatternLife: document.getElementById('btn-pattern-life'),
            btnPatternGlider: document.getElementById('btn-pattern-glider'),
            btnClear: document.getElementById('btn-clear'),
            aboutButtons: Array.from(document.querySelectorAll('[data-action="about"]')),
            aboutModal: document.getElementById('about-modal'),
            btnCloseModal: document.getElementById('btn-close-modal'),
            btnModalClose: document.getElementById('btn-modal-close'),
            btnMobileMenu: document.getElementById('btn-mobile-menu'),
            btnMobileMenuClose: document.getElementById('btn-mobile-menu-close'),
            mobileSidePanel: document.getElementById('mobile-side-panel'),
            mobileSideBackdrop: document.getElementById('mobile-side-backdrop'),
            linksPanel: document.querySelector('[data-collapsible-panel="links"]'),
            rulesPanel: document.querySelector('[data-collapsible-panel="rules"]'),
            panelToggleLinks: document.getElementById('panel-toggle-links'),
            panelToggleRules: document.getElementById('panel-toggle-rules'),
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
        this.elements.canvas.addEventListener('wheel', (e) => this.handleCanvasWheel(e), { passive: false });

        if (this.elements.btnStepBack) {
            this.elements.btnStepBack.addEventListener('click', () => {
                if (this.elements.btnStepBack.disabled) return;
                this.stepBack();
            });
        }
        this.elements.btnPlay.addEventListener('click', () => this.togglePlay());
        this.elements.btnStep.addEventListener('click', () => {
            if (this.elements.btnStep.disabled) return;
            this.step();
        });

        this.elements.btnPatternLife.addEventListener('click', () => this.loadPattern('life'));
        this.elements.btnPatternGlider.addEventListener('click', () => this.loadPattern('gosperGliderGun'));

        this.elements.btnClear.addEventListener('click', () => this.clearGrid());

        for (const aboutButton of this.elements.aboutButtons) {
            aboutButton.addEventListener('click', () => {
                this.shellUi.openModal();
                if (aboutButton.dataset.aboutTarget === 'mobile') {
                    this.shellUi.closeMobileMenu();
                }
            });
        }
        this.elements.btnCloseModal.addEventListener('click', () => this.shellUi.closeModal());
        this.elements.btnModalClose.addEventListener('click', () => this.shellUi.closeModal());

        this.elements.aboutModal.addEventListener('click', (e) => {
            if (e.target === this.elements.aboutModal) {
                this.shellUi.closeModal();
            }
        });

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        if (this.elements.zoomLevel) {
            this.elements.zoomLevel.addEventListener('input', () => {
                const zoomPercent = Number.parseFloat(this.elements.zoomLevel.value);
                this.setZoomLevel(zoomPercent / 100);
            });
        }

        if (this.elements.minimapCanvas) {
            this.elements.minimapCanvas.addEventListener('pointerdown', (e) => this.handleMinimapPointerDown(e));
            this.elements.minimapCanvas.addEventListener('pointermove', (e) => this.handleMinimapPointerMove(e));
            this.elements.minimapCanvas.addEventListener('pointerup', (e) => this.handleMinimapPointerUp(e));
            this.elements.minimapCanvas.addEventListener('pointercancel', (e) => this.handleMinimapPointerCancel(e));
        }

        if (this.elements.btnMobileMenu) {
            this.elements.btnMobileMenu.addEventListener('click', () => this.shellUi.openMobileMenu());
        }
        if (this.elements.btnMobileMenuClose) {
            this.elements.btnMobileMenuClose.addEventListener('click', () => this.shellUi.closeMobileMenu());
        }
        if (this.elements.mobileSideBackdrop) {
            this.elements.mobileSideBackdrop.addEventListener('click', () => this.shellUi.closeMobileMenu());
        }
        this.sidebarLayoutManager.bindEvents();

        window.addEventListener('resize', () => this.handleWindowResize());
    }

    renderWorld() {
        this.renderer.render(this.grid);
        this.scheduleMinimapRender();
    }

    renderWorldWithDyingCells(dyingCells) {
        this.renderer.renderWithDyingCells(this.grid, dyingCells);
        this.scheduleMinimapRender();
    }

    scheduleMinimapRender(options = {}) {
        const force = options.force ?? false;
        if (!this.minimapCtx || !this.elements.minimapCanvas) return;

        const throttleMs = CONFIG.MINIMAP_REDRAW_THROTTLE_MS;
        if (force || throttleMs <= 0) {
            if (this.minimapRedrawTimeoutId) {
                clearTimeout(this.minimapRedrawTimeoutId);
                this.minimapRedrawTimeoutId = null;
            }
            this.lastMinimapRenderTime = performance.now();
            this.renderMinimap();
            return;
        }

        const now = performance.now();
        const elapsed = now - this.lastMinimapRenderTime;
        if (elapsed >= throttleMs) {
            this.lastMinimapRenderTime = now;
            this.renderMinimap();
            return;
        }

        if (this.minimapRedrawTimeoutId) return;

        const delay = Math.max(0, throttleMs - elapsed);
        this.minimapRedrawTimeoutId = setTimeout(() => {
            this.minimapRedrawTimeoutId = null;
            this.lastMinimapRenderTime = performance.now();
            this.renderMinimap();
        }, delay);
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
        ctx.fillStyle = 'rgba(8, 12, 10, 0.06)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = this.renderer.colors.ALIVE;
        this.grid.forEachAliveCell((x, y) => {
            ctx.fillRect(
                Math.floor(x * scaleX),
                Math.floor(y * scaleY),
                pointW,
                pointH
            );
        });

        const viewportX = Math.floor(this.boardConfig.viewportX * scaleX);
        const viewportY = Math.floor(this.boardConfig.viewportY * scaleY);
        const viewportWidth = Math.max(1, Math.ceil(this.boardConfig.visibleGridSize * scaleX));
        const viewportHeight = Math.max(1, Math.ceil(this.boardConfig.visibleGridSize * scaleY));

        ctx.fillStyle = 'rgba(143, 211, 170, 0.12)';
        ctx.fillRect(viewportX, viewportY, viewportWidth, viewportHeight);

        ctx.strokeStyle = '#8fd3aa';
        ctx.lineWidth = 1.25;
        ctx.strokeRect(
            viewportX,
            viewportY,
            viewportWidth,
            viewportHeight
        );
    }

    updateZoomDisplay() {
        if (!this.elements.zoomLevel || !this.elements.zoomLevelValue) return;

        const zoomPercent = this.boardConfig.zoomLevel * 100;
        const displayValue = Number.isInteger(zoomPercent)
            ? String(zoomPercent)
            : zoomPercent.toFixed(1);

        this.elements.zoomLevel.value = displayValue;
        this.elements.zoomLevelValue.textContent = `${displayValue}%`;
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
            this.updateTransportControls();
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

    handleCanvasWheel(event) {
        if (!Number.isFinite(event.deltaY) || event.deltaY === 0) return;

        event.preventDefault();

        const deltaModeMultiplier = event.deltaMode === 1
            ? 16
            : (event.deltaMode === 2 ? 100 : 1);
        const normalizedDeltaY = event.deltaY * deltaModeMultiplier;
        const direction = normalizedDeltaY < 0 ? 1 : -1;
        const nextZoomLevel = this.boardConfig.zoomLevel + (direction * CONFIG.WHEEL_ZOOM_STEP);

        this.setZoomLevel(nextZoomLevel);
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

        syncTouchUiClass();
        this.sidebarLayoutManager.applyFit(false);

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
            this.sidebarLayoutManager.applyFit(true);
        }, 120);

        if (!isTouchUiContext() && this.shellUi.isMobileMenuOpen()) {
            this.shellUi.closeMobileMenu();
        }
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
        const key = event.key.toLowerCase();

        switch (key) {
            case ' ':
                event.preventDefault();
                this.togglePlay();
                break;
            case 's':
                if (!this.elements.btnStep.disabled) {
                    this.step();
                }
                break;
            case 'c':
                this.clearGrid();
                break;
            case 'escape':
                if (this.isPlaying) this.stop();
                this.shellUi.closeModal();
                this.shellUi.closeMobileMenu();
                break;
        }
    }

    updateCycleDisplay() {
        this.elements.cycleCount.textContent = this.grid.cycleCount;
        this.updateTransportControls();
    }

    updateTransportControls() {
        const transportLocked = this.isPlaying;
        this.elements.btnStep.disabled = transportLocked;

        if (this.elements.btnStepBack) {
            const canStepBack = typeof this.grid.canStepBack === 'function'
                ? this.grid.canStepBack()
                : this.grid.cycleCount > 0;
            this.elements.btnStepBack.disabled = transportLocked || !canStepBack;
        }
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

    stepBack() {
        if (this.isPlaying) return;
        if (typeof this.grid.stepBack !== 'function') return;

        this.clearPendingDeathFlash();
        const { didStepBack } = this.grid.stepBack();
        if (!didStepBack) {
            this.updateTransportControls();
            return;
        }

        this.renderWorld();
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

    applyPlayStateClasses(button, playing) {
        if (!button) return;

        if (playing) {
            button.classList.remove('btn-success');
            button.classList.add('btn-playing');
        } else {
            button.classList.remove('btn-playing');
            button.classList.add('btn-success');
        }
    }

    updatePlayButton(playing) {
        const btn = this.elements.btnPlay;
        if (playing) {
            btn.innerHTML = '<span class="btn-icon btn-icon-stop" aria-hidden="true"></span>';
            btn.setAttribute('aria-label', 'Stop');
        } else {
            btn.innerHTML = '<span class="btn-icon btn-icon-play" aria-hidden="true"></span>';
            btn.setAttribute('aria-label', 'Play');
        }

        this.applyPlayStateClasses(this.elements.btnPlay, playing);
        this.applyPlayStateClasses(this.elements.btnStepBack, playing);
        this.applyPlayStateClasses(this.elements.btnStep, playing);
    }

    disableControls(disabled) {
        this.elements.btnPatternLife.disabled = disabled;
        this.elements.btnPatternGlider.disabled = disabled;
        this.elements.btnClear.disabled = disabled;
        this.updateTransportControls();
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
        this.sidebarLayoutManager.applyFit(false);

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
