import { isInsideViewport } from './utils.js';

export class Renderer {
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
        const viewportStartX = this.boardConfig.viewportX;
        const viewportStartY = this.boardConfig.viewportY;
        const viewportEndX = viewportStartX + this.boardConfig.visibleGridSize;
        const viewportEndY = viewportStartY + this.boardConfig.visibleGridSize;

        grid.forEachAliveCell((worldX, worldY) => {
            if (
                worldX < viewportStartX ||
                worldX >= viewportEndX ||
                worldY < viewportStartY ||
                worldY >= viewportEndY
            ) {
                return;
            }

            const localX = worldX - viewportStartX;
            const localY = worldY - viewportStartY;
            this.drawCell(localX, localY, true);
        });
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
