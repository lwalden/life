export const Patterns = {
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
