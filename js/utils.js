import { CONFIG } from './config.js';

export function clampInteger(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

export function getRootFontSizePx() {
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    return Number.isFinite(rootFontSize) && rootFontSize > 0 ? rootFontSize : 16;
}

export function isCoarsePointer() {
    if (typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(any-pointer: coarse)').matches;
}

export function hasFinePointer() {
    if (typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(pointer: fine)').matches ||
        window.matchMedia('(any-pointer: fine)').matches;
}

export function isTouchUiContext() {
    const hasTouchPoints = typeof navigator !== 'undefined' &&
        Number.isFinite(navigator.maxTouchPoints) &&
        navigator.maxTouchPoints > 0;

    return isCoarsePointer() || (hasTouchPoints && !hasFinePointer());
}

export function syncTouchUiClass() {
    if (!document.body) return;
    document.body.classList.toggle('touch-ui', isTouchUiContext());
}

export function getBaseMinimumCellSizePx() {
    const remSize = isTouchUiContext() ? CONFIG.TOUCH_MIN_CELL_REM : CONFIG.DESKTOP_MIN_CELL_REM;
    return remSize * getRootFontSizePx();
}

export function clampZoomLevel(value) {
    if (!Number.isFinite(value)) return CONFIG.DEFAULT_ZOOM_LEVEL;
    return Math.min(Math.max(value, CONFIG.MIN_ZOOM_LEVEL), CONFIG.MAX_ZOOM_LEVEL);
}

export function getCanvasContentWidth(canvas) {
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

export function getCanvasSizeFromHeightBudget(canvas, maxCanvasSize) {
    const wrapper = canvas.closest('.canvas-wrapper');
    const section = canvas.closest('.canvas-section');
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;

    if (!wrapper || !section) return maxCanvasSize;

    const wrapperRect = wrapper.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    const wrapperStyles = window.getComputedStyle(wrapper);

    const verticalPadding =
        Number.parseFloat(wrapperStyles.paddingTop || '0') +
        Number.parseFloat(wrapperStyles.paddingBottom || '0');
    const verticalBorder =
        Number.parseFloat(wrapperStyles.borderTopWidth || '0') +
        Number.parseFloat(wrapperStyles.borderBottomWidth || '0');

    const wrapperChromeHeight = verticalPadding + verticalBorder;
    const topOffsetToWrapper = Math.max(0, wrapperRect.top);
    const heightBelowWrapper = Math.max(0, sectionRect.bottom - wrapperRect.bottom);

    const maxWrapperHeight = Math.floor(
        viewportHeight - topOffsetToWrapper - heightBelowWrapper
    );

    const maxCanvasHeight = Math.floor(maxWrapperHeight - wrapperChromeHeight);

    return clampInteger(
        maxCanvasHeight,
        CONFIG.MIN_CANVAS_SIZE,
        maxCanvasSize,
        maxCanvasSize
    );
}

export function getInitialCanvasSize(canvas, maxCanvasSize) {
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const contentWidth = getCanvasContentWidth(canvas);
    const availableWidth = contentWidth ? Math.min(contentWidth, viewportWidth) : viewportWidth;
    const widthBoundSize = clampInteger(
        availableWidth,
        CONFIG.MIN_CANVAS_SIZE,
        maxCanvasSize,
        maxCanvasSize
    );
    const heightBoundSize = getCanvasSizeFromHeightBudget(canvas, maxCanvasSize);

    return clampInteger(
        Math.min(widthBoundSize, heightBoundSize),
        CONFIG.MIN_CANVAS_SIZE,
        maxCanvasSize,
        maxCanvasSize
    );
}

export function getMaxVisibleGridForCanvas(canvasSize, minCellSizePx) {
    return Math.max(1, Math.floor(canvasSize / minCellSizePx));
}

export function calculateViewportOrigin(worldSize, visibleGridSize, centerX, centerY) {
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

export function createBoardConfig(overrides = {}) {
    const safeDefaultCanvasSize = Math.min(CONFIG.DEFAULT_CANVAS_SIZE, CONFIG.RECOMMENDED_MAX_CANVAS_SIZE);
    const safeDefaultVisibleGridSize = Math.min(CONFIG.DEFAULT_VISIBLE_GRID_SIZE, CONFIG.RECOMMENDED_MAX_VISIBLE_GRID_SIZE);
    const safeDefaultWorldSize = Math.min(CONFIG.DEFAULT_WORLD_SIZE, CONFIG.RECOMMENDED_MAX_WORLD_SIZE);

    const maxCanvasSize = clampInteger(
        overrides.maxCanvasSize,
        CONFIG.MIN_CANVAS_SIZE,
        CONFIG.MAX_CANVAS_SIZE,
        safeDefaultCanvasSize
    );

    const canvasSize = clampInteger(
        overrides.canvasSize,
        CONFIG.MIN_CANVAS_SIZE,
        maxCanvasSize,
        Math.min(maxCanvasSize, safeDefaultCanvasSize)
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
        safeDefaultVisibleGridSize
    );

    const maxVisibleByCellSize = getMaxVisibleGridForCanvas(canvasSize, minCellSizePx);
    const visibleGridSize = Math.max(
        1,
        Math.min(preferredVisibleGridSize, maxVisibleByCellSize)
    );

    const defaultWorldSize = Math.max(
        safeDefaultWorldSize,
        visibleGridSize * CONFIG.WORLD_SIZE_MULTIPLIER
    );

    const worldSize = Math.max(
        visibleGridSize,
        clampInteger(
            overrides.worldSize,
            CONFIG.MIN_WORLD_SIZE,
            CONFIG.MAX_WORLD_SIZE,
            Math.min(defaultWorldSize, CONFIG.RECOMMENDED_MAX_WORLD_SIZE)
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

export function parseInitialBoardConfig(canvas) {
    if (!canvas) return createBoardConfig();

    const configuredMaxCanvas = clampInteger(
        canvas.dataset.canvasSize,
        CONFIG.MIN_CANVAS_SIZE,
        CONFIG.MAX_CANVAS_SIZE,
        CONFIG.DEFAULT_CANVAS_SIZE
    );

    const fittedCanvasSize = getInitialCanvasSize(canvas, configuredMaxCanvas);

    const configuredZoomLevel = Number.parseFloat(canvas.dataset.zoomLevel) / 100;
    const initialZoomLevel = isTouchUiContext() ? 0.5 : configuredZoomLevel;

    return createBoardConfig({
        maxCanvasSize: configuredMaxCanvas,
        canvasSize: fittedCanvasSize,
        visibleGridSize: canvas.dataset.gridSize,
        worldSize: canvas.dataset.worldSize,
        zoomLevel: initialZoomLevel,
        baseMinCellSizePx: getBaseMinimumCellSizePx()
    });
}

export function scaleAliveCells(cells, sourceSize, targetSize) {
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

export function isInsideViewport(worldX, worldY, boardConfig) {
    const viewportEndX = boardConfig.viewportX + boardConfig.visibleGridSize;
    const viewportEndY = boardConfig.viewportY + boardConfig.visibleGridSize;

    return worldX >= boardConfig.viewportX &&
        worldX < viewportEndX &&
        worldY >= boardConfig.viewportY &&
        worldY < viewportEndY;
}

export function getPointerDistance(pointA, pointB) {
    return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
}
