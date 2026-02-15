export class Grid {
    constructor(size) {
        this.size = size;
        this.aliveCells = new Set();
        this.cycleCount = 0;
    }

    clear() {
        this.aliveCells.clear();
        this.cycleCount = 0;
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

        for (const [x, y] of cells) {
            this.setCell(x, y, true);
        }
    }

    toggleCell(x, y) {
        if (!this.isValidPosition(x, y)) return;
        const cellIndex = this.getCellIndex(x, y);

        if (this.aliveCells.has(cellIndex)) {
            this.aliveCells.delete(cellIndex);
            return;
        }

        this.aliveCells.add(cellIndex);
    }

    setCell(x, y, alive) {
        if (!this.isValidPosition(x, y)) return;
        const cellIndex = this.getCellIndex(x, y);
        if (alive) {
            this.aliveCells.add(cellIndex);
            return;
        }

        this.aliveCells.delete(cellIndex);
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
            const { x, y } = this.getCoordinatesFromIndex(cellIndex);
            dyingCells.push([x, y]);
        }

        this.aliveCells = nextAliveCells;
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
