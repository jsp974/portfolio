/**
 * Input and Interaction
 */
import { Vec3, Mat4 } from './math.js';

export class Interaction {
    constructor(game, canvas) {
        this.game = game;
        this.canvas = canvas;

        this.draggedUnit = null;
        this.isDragging = false;

        // Item Dragging
        this.draggedItem = null; // { itemData, origin: 'stash' }
        this.dragGhost = null;

        this.mouse = { x: 0, y: 0 };
        this.active = true;

        // Use Pointer Events for robust cross-device support (Mouse/Touch/Pen)
        canvas.addEventListener('pointerdown', (e) => this.onMouseDown(e));
        window.addEventListener('pointermove', (e) => this.onMouseMove(e));
        window.addEventListener('pointerup', (e) => this.onMouseUp(e));
        canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e));
    }

    onContextMenu(e) {
        e.preventDefault(); // Block default menu

        // Raycast logic similar to click
        const ray = this.getRay(e.clientX, e.clientY);
        if (ray) {
            const hitPoint = this.intersectPlane(ray, 0);
            if (hitPoint) {
                const units = [...this.game.board.grid, ...this.game.board.bench];
                for (const unit of units) {
                    if (unit) {
                        const dist = Math.sqrt(
                            Math.pow(unit.position.x - hitPoint.x, 2) +
                            Math.pow(unit.position.z - hitPoint.z, 2)
                        );
                        if (dist < 0.8) {
                            // Select Unit on Right Click
                            this.game.setSelectedUnit(unit);
                            return;
                        }
                    }
                }
            }
        }
    }

    // --- Unit Drag Logic ---

    getRay(ex, ey) {
        // Normalize Device Coordinates
        const rect = this.canvas.getBoundingClientRect();
        const x = ((ex - rect.left) / rect.width) * 2 - 1;
        const y = -((ey - rect.top) / rect.height) * 2 + 1;

        // Inverse Projection * View
        const projection = Mat4.perspective(Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 100.0);
        const view = Mat4.lookAt(this.game.camera.position, this.game.camera.target, new Vec3(0, 1, 0));

        const invPV = Mat4.mul(projection, view).invert();

        if (!invPV) return null;

        // Ray clip space
        const near = new Vec3(x, y, -1);
        const far = new Vec3(x, y, 1);

        // Unproject
        const unproj = (v, inv) => {
            const d = inv.data;
            const x = v.x, y = v.y, z = v.z;
            const w = 1.0;

            const rx = d[0] * x + d[4] * y + d[8] * z + d[12] * w;
            const ry = d[1] * x + d[5] * y + d[9] * z + d[13] * w;
            const rz = d[2] * x + d[6] * y + d[10] * z + d[14] * w;
            const rw = d[3] * x + d[7] * y + d[11] * z + d[15] * w;

            return new Vec3(rx / rw, ry / rw, rz / rw);
        };

        const origin = unproj(near, invPV);
        const end = unproj(far, invPV);
        const dir = Vec3.sub(end, origin).normalize();

        return { origin, dir };
    }

    intersectPlane(ray, planeY = 0) {
        if (Math.abs(ray.dir.y) < 0.0001) return null;
        const t = (planeY - ray.origin.y) / ray.dir.y;
        if (t < 0) return null;
        return Vec3.add(ray.origin, Vec3.mul(ray.dir, t));
    }

    onMouseDown(e) {
        if (!this.active) return;
        const ray = this.getRay(e.clientX, e.clientY);
        if (!ray) return;

        const hitPoint = this.intersectPlane(ray, 0); // Intersection with ground
        if (hitPoint) {
            // Check if we hit a unit
            const units = [...this.game.board.grid, ...this.game.board.bench];

            for (const unit of units) {
                if (unit) {
                    const dist = Math.sqrt(
                        Math.pow(unit.position.x - hitPoint.x, 2) +
                        Math.pow(unit.position.z - hitPoint.z, 2)
                    );

                    if (dist < 0.6) { // Approx radius
                        // Prevent interaction during combat
                        if (this.game.gameState !== 'PREP') return;

                        if (unit.team === 'enemy') return; // Cannot move enemy units

                        this.draggedUnit = unit;
                        this.originalPosition = unit.position.clone();
                        this.isDragging = true;

                        // Temporarily remove from board logic so we can "move" it
                        this.game.board.removeUnit(unit);
                        break;
                    }
                }
            }
        }
    }

    // --- Item Drag Logic ---
    startItemDrag(item, e) {
        if (this.game.gameState === 'COMBAT') return;

        this.draggedItem = { itemData: item, origin: 'inventory' };

        // Create Ghost Logic
        this.dragGhost = document.createElement('div');
        this.dragGhost.className = 'item-icon-placeholder';
        this.dragGhost.innerText = item.name.charAt(0).toUpperCase();
        this.dragGhost.style.position = 'fixed';
        this.dragGhost.style.pointerEvents = 'none'; // Pass through to raycast
        this.dragGhost.style.zIndex = '1000';
        this.dragGhost.style.width = '40px';
        this.dragGhost.style.height = '40px';

        // Match color
        const hash = item.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
        this.dragGhost.style.backgroundColor = colors[hash % colors.length];

        document.body.appendChild(this.dragGhost);
        this.updateGhostPosition(e.clientX, e.clientY);
    }

    updateGhostPosition(x, y) {
        if (this.dragGhost) {
            this.dragGhost.style.left = `${x - 20}px`;
            this.dragGhost.style.top = `${y - 20}px`;
        }
    }

    onMouseMove(e) {
        if (!this.active) return;

        // Item Drag
        if (this.draggedItem && this.dragGhost) {
            this.updateGhostPosition(e.clientX, e.clientY);
        }

        if (!this.isDragging || !this.draggedUnit) return;

        const ray = this.getRay(e.clientX, e.clientY);
        if (ray) {
            const intersection = this.intersectPlane(ray, 1.0); // y=1 plane roughly
            if (intersection) {
                this.draggedUnit.position.x = intersection.x;
                this.draggedUnit.position.z = intersection.z;
                // Sync target to prevent drift during update
                this.draggedUnit.targetPosition.x = intersection.x;
                this.draggedUnit.targetPosition.z = intersection.z;
            }
        }
    }

    onMouseUp(e) {
        if (!this.active) return;

        // --- Item Drop Logic ---
        if (this.draggedItem) {
            const ray = this.getRay(e.clientX, e.clientY);
            let droppedOnUnit = false;

            if (ray) {
                const hitPoint = this.intersectPlane(ray, 0);
                if (hitPoint) {
                    const units = [...this.game.board.grid, ...this.game.board.bench];
                    for (const unit of units) {
                        if (unit && unit.team === 'player') {
                            const dist = Math.sqrt(
                                Math.pow(unit.position.x - hitPoint.x, 2) +
                                Math.pow(unit.position.z - hitPoint.z, 2)
                            );
                            if (dist < 0.8) {
                                // Drop on Unit -> Equip
                                if (unit.addItem(this.draggedItem.itemData)) {
                                    console.log(`Equipped ${this.draggedItem.itemData.name} on ${unit.family}`);

                                    // Remove from inventory
                                    const idx = this.game.inventory.indexOf(this.draggedItem.itemData);
                                    if (idx > -1) this.game.inventory.splice(idx, 1);

                                    this.game.selectedItem = null; // Clear selection
                                    this.game.updateUI();
                                }
                                droppedOnUnit = true;
                                break;
                            }
                        }
                    }
                }
            }

            // Cleanup Ghost
            if (this.dragGhost) {
                document.body.removeChild(this.dragGhost);
                this.dragGhost = null;
            }

            // If NOT dropped on unit, Treat as Selection (Click)
            if (!droppedOnUnit) {
                // Select the item
                this.game.selectItem(this.draggedItem.itemData, 'inventory');
            }

            this.draggedItem = null;
            return;
        }

        // If clicking (not dragging)
        if (!this.isDragging) {
            const ray = this.getRay(e.clientX, e.clientY);
            if (ray) {
                const hitPoint = this.intersectPlane(ray, 0);
                if (hitPoint) {
                    const units = [...this.game.board.grid, ...this.game.board.bench];
                    for (const unit of units) {
                        if (unit && unit.team === 'player') {
                            const dist = Math.sqrt(
                                Math.pow(unit.position.x - hitPoint.x, 2) +
                                Math.pow(unit.position.z - hitPoint.z, 2)
                            );
                            if (dist < 0.8) {
                                // Unit Clicked
                                if (this.game.selectedItem) {
                                    this.equipItemOnUnit(unit);
                                } else {
                                    this.game.toggleSelection(unit);
                                }
                                return;
                            }
                        }
                    }
                }
            }
            return;
        }

        if (!this.draggedUnit) return;

        const unit = this.draggedUnit;
        this.isDragging = false;
        this.draggedUnit = null;

        // Shop Sell
        const shopRect = document.getElementById('shop-container').getBoundingClientRect();
        if (e.clientX >= shopRect.left && e.clientX <= shopRect.right &&
            e.clientY >= shopRect.top && e.clientY <= shopRect.bottom) {

            this.game.sellUnit(unit);
            this.game.updateUI();
            return;
        }

        // Find drop location
        const ray = this.getRay(e.clientX, e.clientY);
        const hitPoint = this.intersectPlane(ray, 0);

        let placed = false;
        if (hitPoint) {
            const loc = this.game.board.worldToGrid(hitPoint);
            if (loc) {
                // Check Level Limit
                let allowed = true;
                if (loc.type === 'board') {
                    const currentCount = this.game.board.grid.filter(u => u !== null).length;
                    // Check if unit was already on board
                    const originLoc = this.game.board.worldToGrid(this.originalPosition);
                    const wasOnBoard = originLoc && originLoc.type === 'board';

                    if (!wasOnBoard && currentCount >= this.game.playerLevel) {
                        console.log("Max Board Units Reached!");
                        allowed = false;
                        // Feedback?
                    }
                }

                if (allowed && this.game.board.placeUnit(unit, loc)) {
                    // Success
                    this.game.checkForMerge(unit); // Check merge on drop
                    this.game.updateUI(); // Update UI
                    placed = true;
                }
            }
        }

        // Return to bench/nearest empty if failed
        if (!placed) {
            for (let i = 0; i < 9; i++) {
                if (this.game.board.placeUnit(unit, { type: 'bench', index: i })) {
                    placed = true;
                    this.game.updateUI();
                    break;
                }
            }
        }
    }

    equipItemOnUnit(unit) {
        const { item, origin } = this.game.selectedItem;

        if (unit.addItem(item)) {
            console.log(`Equipped ${item.name} on ${unit.family}`);

            // Remove from source
            if (origin === 'inventory') {
                const idx = this.game.inventory.indexOf(item);
                if (idx > -1) this.game.inventory.splice(idx, 1);
            }

            // Clear Selection
            this.game.selectedItem = null;
            this.game.updateUI();
        } else {
            console.log("Unit Inventory Full");
        }
    }
}
