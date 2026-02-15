import { CONFIG } from './config.js';
import { GameController } from './game-controller.js';
import { Grid } from './grid.js';
import { Renderer } from './renderer.js';
import { renderSharedPanelContent } from './ui-content.js';
import { parseInitialBoardConfig, syncTouchUiClass } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    syncTouchUiClass();
    renderSharedPanelContent();

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
