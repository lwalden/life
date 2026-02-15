export class Grid {
    constructor(size) {
        this.size = size;
        this.aliveCells = new Set();
        this.cycleCount = 0;
        this.transitionHistory = [];
    }

    clearHistory() {
        this.transitionHistory.length = 0;
    }

    clear() {
        this.aliveCells.clear();
        this.cycleCount = 0;
        this.clearHistory();
    }

    getCellIndex(x, y) {
        return (y * this.size) + x;
    }

    getCoordinatesFromIndex(index) {
        const x = index % this.size;
        const y = (index - x) / this.size;
        return { x, y };
    }

    forEachAliveCell(callback) {
        for (const cellIndex of this.aliveCells) {
            const { x, y } = this.getCoordinatesFromIndex(cellIndex);
            callback(x, y);
        }
    }

    getAliveCells() {
        const aliveCells = [];
        this.forEachAliveCell((x, y) => {
            aliveCells.push([x, y]);
        });
        return aliveCells;
    }

    loadCells(cells) {
        this.aliveCells.clear();
        this.clearHistory();

        for (const [x, y] of cells) {
            this.setCell(x, y, true, { clearHistory: false });
        }
    }

    toggleCell(x, y) {
        if (!this.isValidPosition(x, y)) return;
        const cellIndex = this.getCellIndex(x, y);

        if (this.aliveCells.has(cellIndex)) {
            this.aliveCells.delete(cellIndex);
            this.clearHistory();
            return;
        }

        this.aliveCells.add(cellIndex);
        this.clearHistory();
    }

    setCell(x, y, alive, options = {}) {
        const clearHistory = options.clearHistory ?? true;
        if (!this.isValidPosition(x, y)) return;
        const cellIndex = this.getCellIndex(x, y);
        const isAlive = this.aliveCells.has(cellIndex);
        if (isAlive === alive) return;

        if (alive) {
            this.aliveCells.add(cellIndex);
            if (clearHistory) this.clearHistory();
            return;
        }

        this.aliveCells.delete(cellIndex);
        if (clearHistory) this.clearHistory();
    }

    getCell(x, y) {
        if (!this.isValidPosition(x, y)) return false;
        return this.aliveCells.has(this.getCellIndex(x, y));
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.size && y >= 0 && y < this.size;
    }

    nextGenerationWithTransitions() {
        const neighborCounts = new Map();
        const dyingCells = [];
        const bornCellIndexes = [];
        const diedCellIndexes = [];

        for (const cellIndex of this.aliveCells) {
            const { x, y } = this.getCoordinatesFromIndex(cellIndex);

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;

                    const nextX = x + dx;
                    const nextY = y + dy;

                    if (!this.isValidPosition(nextX, nextY)) continue;

                    const neighborIndex = this.getCellIndex(nextX, nextY);
                    const existingCount = neighborCounts.get(neighborIndex) ?? 0;
                    neighborCounts.set(neighborIndex, existingCount + 1);
                }
            }
        }

        const nextAliveCells = new Set();

        for (const [cellIndex, neighborCount] of neighborCounts) {
            const isAlive = this.aliveCells.has(cellIndex);
            if (neighborCount === 3 || (isAlive && neighborCount === 2)) {
                nextAliveCells.add(cellIndex);
            }
        }

        for (const cellIndex of this.aliveCells) {
            if (nextAliveCells.has(cellIndex)) continue;
            diedCellIndexes.push(cellIndex);
            const { x, y } = this.getCoordinatesFromIndex(cellIndex);
            dyingCells.push([x, y]);
        }

        for (const cellIndex of nextAliveCells) {
            if (this.aliveCells.has(cellIndex)) continue;
            bornCellIndexes.push(cellIndex);
        }

        this.aliveCells = nextAliveCells;
        this.cycleCount++;
        this.transitionHistory.push({
            bornCellIndexes,
            diedCellIndexes
        });

        return {
            cycleCount: this.cycleCount,
            dyingCells
        };
    }

    canStepBack() {
        return this.cycleCount > 0 && this.transitionHistory.length > 0;
    }

    stepBack() {
        if (!this.canStepBack()) {
            return {
                cycleCount: this.cycleCount,
                didStepBack: false
            };
        }

        const transition = this.transitionHistory.pop();

        for (const cellIndex of transition.bornCellIndexes) {
            this.aliveCells.delete(cellIndex);
        }

        for (const cellIndex of transition.diedCellIndexes) {
            this.aliveCells.add(cellIndex);
        }

        this.cycleCount = Math.max(0, this.cycleCount - 1);

        return {
            cycleCount: this.cycleCount,
            didStepBack: true
        };
    }

    loadPattern(pattern) {
        this.clear();
        for (const [x, y] of pattern) {
            this.setCell(x, y, true, { clearHistory: false });
        }
    }
}
