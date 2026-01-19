/**
 * Board and Grid Management
 */
import { Vec3, Mat4 } from './math.js';

export class Board {
    constructor() {
        this.width = 7;
        this.height = 5;

        this.grid = new Array(this.width * this.height).fill(null); // Player Grid
        this.enemyGrid = new Array(this.width * this.height).fill(null); // Enemy Grid
        this.bench = new Array(9).fill(null);

        this.tileSize = 1.2;
        this.benchOffsetZ = 4.0;
        this.riverWidth = 2.0; // Gap between boards
    }

    // Convert Grid (x, z) to World Position
    getTileWorldPosition(gx, gz, isEnemy = false) {
        const centerOffsetX = (Math.floor(this.width / 2)) * this.tileSize;
        const centerOffsetZ = (Math.floor(this.height / 2)) * this.tileSize;

        const localX = (gx * this.tileSize) - centerOffsetX;

        if (!isEnemy) {
            const localZ = (gz * this.tileSize) - centerOffsetZ;
            return new Vec3(localX, 0, localZ + 3.0);
        } else {

            const localZ = (gz * this.tileSize) - centerOffsetZ;

            if (isEnemy) {
                return new Vec3(-localX, 0, - (localZ + 3.0));
            } else {
                return new Vec3(localX, 0, localZ + 3.0);
            }
        }
    }

    getBenchWorldPosition(index) {
        // Bench centered below the board
        const count = this.bench.length; // 9
        const worldX = (index - Math.floor(count / 2)) * this.tileSize;
        // Board ends at Z approx 3.5 + 2.4 = 5.9.
        return new Vec3(worldX, 0, 8.0);
    }

    // Convert World Position to Grid Coordinates?
    worldToGrid(pos) {
        // Check Player Grid
        // Player Grid Local Z approx: (pZ + 3.0)
        // pos.z = pZ + 3.0 -> pZ = pos.z - 3.0
        // pZ = (gz - center) * tileSize
        // gz = (pZ / tileSize) + center

        const centerOffsetX = Math.floor(this.width / 2);
        const centerOffsetZ = Math.floor(this.height / 2);

        // Player Grid Check
        // Inverse transform from getTileWorldPosition
        const playerLocalZ = pos.z - 3.0;
        const playerLocalX = pos.x;

        const pgx = Math.round(playerLocalX / this.tileSize + centerOffsetX);
        const pgz = Math.round(playerLocalZ / this.tileSize + centerOffsetZ);

        if (pgx >= 0 && pgx < this.width && pgz >= 0 && pgz < this.height) {
            return { type: 'board', x: pgx, z: pgz };
        }

        // Check bench
        const benchZDiff = Math.abs(pos.z - this.benchOffsetZ);
        if (benchZDiff < this.tileSize / 2) {
            const benchOffsetX = Math.floor(this.bench.length / 2) * this.tileSize;
            const bx = Math.round((pos.x + benchOffsetX) / this.tileSize);
            if (bx >= 0 && bx < this.bench.length) {
                return { type: 'bench', index: bx };
            }
        }

        return null;
    }

    placeUnit(unit, location) {
        if (location.type === 'board') {
            const idx = location.z * this.width + location.x;
            if (location.team === 'enemy') {
                if (this.enemyGrid[idx]) return false;
                this.enemyGrid[idx] = unit;
                unit.targetPosition = this.getTileWorldPosition(location.x, location.z, true);
                unit.position = unit.targetPosition.clone(); // Snap to position
                return true;
            } else {
                if (this.grid[idx]) return false;
                this.grid[idx] = unit;
                unit.targetPosition = this.getTileWorldPosition(location.x, location.z, false);
                unit.position = unit.targetPosition.clone(); // Snap to position
                return true;
            }
        } else if (location.type === 'bench') {
            if (this.bench[location.index]) return false;
            this.bench[location.index] = unit;
            unit.targetPosition = this.getBenchWorldPosition(location.index);
            unit.position = unit.targetPosition.clone();
            return true;
        }
        return false;
    }

    removeUnit(unit) {
        // Find and remove
        const gIdx = this.grid.indexOf(unit);
        if (gIdx !== -1) {
            this.grid[gIdx] = null;
            return;
        }

        const eIdx = this.enemyGrid.indexOf(unit);
        if (eIdx !== -1) {
            this.enemyGrid[eIdx] = null;
            return;
        }

        const bIdx = this.bench.indexOf(unit);
        if (bIdx !== -1) {
            this.bench[bIdx] = null;
            return;
        }
    }

    clearEnemyGrid() {
        this.enemyGrid.fill(null);
    }

    getRenderObjects() {
        // Generate renderable tile objects
        const objects = [];

        // Board Tiles (Player)
        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                const pos = this.getTileWorldPosition(x, z, false);
                const transform = new Mat4().translate(pos).scale(new Vec3(this.tileSize * 0.9, 1, this.tileSize * 0.9));
                const isDark = (x + z) % 2 === 0;
                const col = isDark ? new Vec3(0.2, 0.2, 0.2) : new Vec3(0.3, 0.3, 0.3);
                objects.push({ type: 'plane', transform: transform, color: col });
            }
        }

        // Board Tiles (Enemy)
        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                const pos = this.getTileWorldPosition(x, z, true);
                const transform = new Mat4().translate(pos).scale(new Vec3(this.tileSize * 0.9, 1, this.tileSize * 0.9));
                const isDark = (x + z) % 2 === 0;
                // Red tint for enemy board
                const col = isDark ? new Vec3(0.2, 0.1, 0.1) : new Vec3(0.3, 0.15, 0.15);
                objects.push({ type: 'plane', transform: transform, color: col });
            }
        }

        // Bench Tiles
        for (let i = 0; i < this.bench.length; i++) {
            const pos = this.getBenchWorldPosition(i);
            const transform = new Mat4().translate(pos).scale(new Vec3(this.tileSize * 0.9, 1, this.tileSize * 0.9));
            objects.push({
                type: 'plane',
                transform: transform,
                color: new Vec3(0.15, 0.1, 0.1) // Darker for bench
            });
        }

        return objects;
    }
}
