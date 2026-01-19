/**
 * Main Game State Manager
 */
import { Renderer } from './renderer.js';
import { Board } from './board.js';
import { Unit } from './unit.js';
import { Interaction } from './interaction.js';
import { Shop } from './shop.js';
import { Vec3, Mat4 } from './math.js';
import { Projectile } from './projectile.js';
import { Item } from './item.js';

import { SynergyManager } from './synergies.js'; // Add to imports
import { SynergyUI } from './synergy_ui.js';
import { ItemUI } from './item_ui.js';

export const UNIT_DATABASE = {
    // Orcs
    'Orc Shieldbearer': { family: 'orc', cls: 'tank', cost: 4, maxMana: 100 },
    'Orc Grunt': { family: 'orc', cls: 'combatant', cost: 2, maxMana: 100 },
    'Orc Archer': { family: 'orc', cls: 'ranger', cost: 3, maxMana: 100 },

    // Elves (Elfs)
    'Elf Blade': { family: 'elf', cls: 'combatant', cost: 1, maxMana: 100 }, // "1 combatant"
    'Elf Ranger': { family: 'elf', cls: 'ranger', cost: 3, maxMana: 100 },   // "un arc"
    'Elf Mage': { family: 'elf', cls: 'mage', cost: 4, maxMana: 100 },       // "un mage"

    // Beasts
    'Beast Rat': { family: 'beast', cls: 'combatant', cost: 1, maxMana: 100 },
    'Beast Wolf': { family: 'beast', cls: 'combatant', cost: 2, maxMana: 100 },
    'Beast Tank': { family: 'beast', cls: 'tank', cost: 3, maxMana: 100 },
    'Beast Assassin': { family: 'beast', cls: 'assassin', cost: 4, maxMana: 100 },

    // Humans
    'Human Recruit': { family: 'human', cls: 'tank', cost: 1, maxMana: 100 },
    'Human Soldier': { family: 'human', cls: 'combatant', cost: 2, maxMana: 100 },
    'Human Novice': { family: 'human', cls: 'mage', cost: 1, maxMana: 100 },
    'Human Wizard': { family: 'human', cls: 'mage', cost: 3, maxMana: 100 }, // "2 mage" (1 & 3 cost)
    'Human Sniper': { family: 'human', cls: 'ranger', cost: 4, maxMana: 100 }, // "1 arc" (cost 4)
    'Human Rogue': { family: 'human', cls: 'assassin', cost: 3, maxMana: 100 }, // "1 assasin" (cost 3)

    // Special
    'Ancient One': { family: 'special', cls: 'god', cost: 5, maxMana: 100 }
};

export class Game {
    constructor() {
        this.canvas = document.getElementById('gl-canvas');
        this.renderer = new Renderer(this.canvas);

        this.board = new Board();
        this.camera = {
            position: new Vec3(0, 18, 15), // Moved back/up
            target: new Vec3(0, 0, 4)      // Look at player side (approx center of player grid)
        };

        this.gold = 50;
        // Level & XP (Init before Shop!)
        this.playerLevel = 1;
        this.currentXp = 0;
        this.xpToNextLevel = 40;

        this.stage = '1-1';

        this.interaction = new Interaction(this, this.canvas);
        this.shop = new Shop(this);
        this.synergyUI = new SynergyUI('synergy-panel', 'synergy-toggle'); // Init UI
        this.itemUI = new ItemUI('ui-layer');

        // Human Synergy Stash State
        this.humanSynergyActive = false;
        this.humanItem = null; // { name, stats }
        this.isStashItemTaken = false;

        this.selectedUnit = null;

        this.gameState = 'PREP'; // PREP, COMBAT, ENDED
        this.startCombatBtn = document.getElementById('btn-start-combat');
        if (this.startCombatBtn) {
            this.startCombatBtn.addEventListener('click', () => this.startCombat());
        }

        // Spawn Enemies
        this.spawnEnemySetup();

        this.goldDisplay = document.getElementById('gold-display');
        this.stageDisplay = document.getElementById('stage-info');

        this.lastTime = 0;
        this.lastTime = 0;
        this.projectiles = []; // List of active projectiles
        this.effects = []; // Visual Effects (Pyramids, etc.)
        this.cinematic = null; // { target, timer, duration, startCamPos }

        this.inventory = []; // General Inventory
        this.selectedItem = null; // { item, origin } for Click-to-Equip
        this.score = 0; // Or whatever tracker

        this.score = 0; // Or whatever tracker

        // UI references
        this.xpBtn = document.getElementById('btn-xp');
        if (this.xpBtn) this.xpBtn.onclick = () => this.buyXp();

        this.levelDisplay = document.getElementById('level-display');
        this.xpDisplay = document.getElementById('xp-display');

        // Synergy Reward State
        this.humanSynergyItems = []; // Track active synergy items references

        // Konami Code Logic
        this.konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        this.konamiIndex = 0;

        window.addEventListener('keydown', (e) => {
            if (e.key === this.konamiCode[this.konamiIndex]) {
                this.konamiIndex++;
                if (this.konamiIndex === this.konamiCode.length) {
                    console.log("CHEAT ENABLED: +1000 GOLD!");
                    this.gold += 1000;
                    this.updateUI();
                    this.konamiIndex = 0;
                    // Visual feedback?
                    alert("CHEAT ACTIVATED: +1000 GOLD");
                }
            } else {
                this.konamiIndex = 0; // Reset
            }
        });

        // Create Textures
        // Create Textures
        if (this.renderer) {
            // A. Default Procedural Texture
            this.godSymbolImage = this.createGodSymbolTexture();
            this.godTexture = this.renderer.createTexture(this.godSymbolImage);

            this.loadGodTexture('assets/image_ult.png');
        }

        // Initialize Audio
        this.cinematicAudio = new Audio('assets/god_ult_sound.mp3');
        this.cinematicAudio.volume = 0.5;

        this.updateUI();
    }

    start() {
        requestAnimationFrame((t) => this.loop(t));
    }

    startCombat() {
        if (this.gameState !== 'PREP') return;

        const playerUnits = this.board.grid.filter(u => u !== null);
        if (playerUnits.length === 0) {
            console.log("No units to fight!");
            return;
        }

        this.gameState = 'COMBAT';
        if (this.startCombatBtn) this.startCombatBtn.disabled = true;

        const msg = document.getElementById('combat-result');
        if (msg) msg.style.display = 'none';

        console.log("Starting Combat...");

        // 1. Reset Synergies (Clean state)
        playerUnits.forEach(u => u.clearSynergies());
        const enemyUnits = this.board.enemyGrid.filter(u => u !== null);
        enemyUnits.forEach(u => u.clearSynergies());

        // 2. Snapshot (Base Stats)
        playerUnits.forEach(u => u.snapshotStats());
        enemyUnits.forEach(u => u.snapshotStats());

        // 3. Apply Synergies (Combat Buffs)
        const playerSynergies = SynergyManager.getActiveSynergies(playerUnits);
        SynergyManager.applySynergies(playerUnits, playerSynergies);

        const enemySynergies = SynergyManager.getActiveSynergies(enemyUnits);
        SynergyManager.applySynergies(enemyUnits, enemySynergies); // Enemy Synergies? TODO: Make sure enemy has synergy logic if needed.

        // 4. Initialize Combat State
        const allUnits = [...playerUnits, ...enemyUnits];
        allUnits.forEach(u => {
            u.resetCombatState();
        });

        this.combatTimer = 0;
        this.overtimeActive = false;



        this.lastTime = performance.now();
        // this.loop(this.lastTime); // REMOVED: Preventing double loop
    }

    endCombat(victory) {
        this.gameState = 'PREP';
        this.interaction.active = true;
        this.startCombatBtn.disabled = false;

        // Reset Round Logic
        // this.hasReceivedHumanItem = false; // Legacy flag removed

        this.applyIncome();

        // Loot only on X-5 and X-10
        const stageParts = this.stage.split('-');
        const stageLevel = parseInt(stageParts[1]);
        if (stageLevel % 5 === 0) {
            this.lootDrop();
        }

        const msg = document.getElementById('combat-result');

        if (victory) {
            console.log("Victory! Next Stage.");
            if (msg) {
                msg.innerText = "VICTORY";
                msg.className = "win";
                msg.style.display = "block";
                console.log("DEBUG: Victory Message Should Be Visible");
                setTimeout(() => msg.style.display = "none", 1000);
            } else {
                console.error("DEBUG: Message Element Missing");
            }
            this.nextStage();
            if (this.shop) this.shop.reroll(true); // Auto Refresh Shop
            this.updateUI(); // Refresh synergies and other UI elements
        } else {
            console.log("Defeat. Restart Stage.");
            if (msg) {
                msg.innerText = "DEFEAT";
                msg.className = "lose";
                msg.style.display = "block";
                console.log("DEBUG: Defeat Message Should Be Visible");
                setTimeout(() => msg.style.display = "none", 1000);
            } else {
                console.error("DEBUG: Message Element Missing");
            }
            this.resetStage();
            if (this.shop) this.shop.reroll(true); // Auto Refresh Shop
            this.updateUI(); // Refresh synergies and other UI elements
        }
    }

    applyIncome() {
        const base = 5;
        const interest = Math.min(5, Math.floor(this.gold / 10));
        const total = base + interest;
        this.gold += total;
        console.log(`Income: +${total}g (Base: ${base} + Interest: ${interest})`);

        // Visual feedback could go here (Floating Text)
    }

    lootDrop() {
        if (this.inventory.length >= 10) {
            console.log("Inventory Full! No loot.");
            return;
        }
        const types = ['sword', 'rod', 'vest', 'cloak', 'gloves', 'belt'];
        const type = types[Math.floor(Math.random() * types.length)];
        const item = new Item(Math.random(), type);
        this.inventory.push(item);
        console.log("Loot Drop:", item.name);
    }

    buyXp() {
        if (this.playerLevel >= 6) {
            console.log("Max Level Reached (6).");
            return;
        }
        if (this.gold >= 4) {
            this.gold -= 4;
            this.currentXp += 2; // "2 d'xp pour 4 golds"
            console.log(`Bought XP. Current: ${this.currentXp}/${this.xpToNextLevel}`);
            this.checkLevelUp();
            this.updateUI();
        } else {
            console.log("Not enough gold to buy XP");
        }
    }

    checkLevelUp() {
        if (this.playerLevel >= 6) return; // Cap at 6

        while (this.currentXp >= this.xpToNextLevel) {
            this.currentXp -= this.xpToNextLevel;
            this.playerLevel++;
            console.log(`Level Up! Now Level ${this.playerLevel}`);
            if (this.playerLevel >= 6) {
                this.playerLevel = 6;
                this.currentXp = 0; // Cap
                break;
            }
        }
    }

    getMaxBoardUnits() {
        return this.playerLevel;
    }

    nextStage() {
        // Parse "1-1" -> 1, 1
        const parts = this.stage.split('-');
        let world = parseInt(parts[0]);
        let level = parseInt(parts[1]);

        level++;
        if (level > 10) { // Allow up to X-10
            world++;
            level = 1;
        }
        this.stage = `${world}-${level}`;
        this.resetStage();
    }

    resetStage() {
        // Reset Board
        this.board.clearEnemyGrid();

        // Restore player units to full HP?
        [...this.board.grid, ...this.board.bench].forEach(u => {
            if (u) u.resetCombatState();
        });

        // Respawn Enemies
        this.spawnEnemySetup();

        this.updateUI();
    }

    loop(t) {
        const dt = (t - this.lastTime) / 1000;
        this.lastTime = t;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Cinematic Camera Logic
        if (this.cinematic) {
            this.cinematic.timer += dt;
            if (this.cinematic.timer >= this.cinematic.duration) {
                this.cinematic = null;
                // Reset Camera? Or leave it? Standard update will likely snap it back if I don't set it.
                // Resetting to default view:
                this.camera.position = new Vec3(0, 18, 15);
                this.camera.target = new Vec3(0, 0, 4);
            } else {
                // Orbit
                const target = this.cinematic.target.position;
                const angle = this.cinematic.timer * 2.0; // Rotation speed
                const radius = 8.0;
                const height = 10.0;
                this.camera.position.x = target.x + Math.cos(angle) * radius;
                this.camera.position.z = target.z + Math.sin(angle) * radius;
                this.camera.position.y = target.y + height;
                this.camera.target = target;
            }
        }

        const allUnits = [...this.board.grid, ...this.board.bench, ...this.board.enemyGrid].filter(u => u !== null);

        // Update all units
        for (const unit of allUnits) {
            // Skip update if unit is being dragged (prevents fighting mouse position)
            if (this.interaction && this.interaction.draggedUnit === unit) continue;

            if (this.gameState === 'COMBAT' && (unit.team === 'player' ? this.board.grid.includes(unit) : true)) {
                unit.updateCombat(dt, allUnits, (type, target, dmg) => this.spawnProjectile(unit, type, target, dmg), this);
            } else {
                unit.update(dt);
            }
        }

        // Update Projectiles
        // Update Projectiles
        this.projectiles.forEach(p => p.update(dt));
        this.projectiles = this.projectiles.filter(p => p.active);

        // Update Effects
        this.effects.forEach(e => e.update(dt));
        this.effects = this.effects.filter(e => e.active);

        // Check Win/Loss
        if (this.gameState === 'COMBAT') {
            this.combatTimer += dt;
            if (!this.overtimeActive && this.combatTimer > 15.0) {
                this.overtimeActive = true;
                console.log("OVERTIME ACTIVATED!");
                allUnits.forEach(u => {
                    if (u.hp > 0 && (u.team === 'enemy' || this.board.grid.includes(u))) {
                        u.enableOvertime();
                    }
                });
                // Optional: Show UI text "OVERTIME!"
            }

            const livingPlayerUnits = allUnits.filter(u => u.team === 'player' && u.hp > 0 && this.board.grid.includes(u));
            const livingEnemyUnits = allUnits.filter(u => u.team === 'enemy' && u.hp > 0);

            if (livingPlayerUnits.length === 0) {
                this.endCombat(false); // Loss
            } else if (livingEnemyUnits.length === 0) {
                this.endCombat(true); // Win
            }
        }

        // Update dragged unit
        if (this.interaction.draggedUnit) {
            this.interaction.draggedUnit.update(dt);
        }
    }

    render() {
        const scene = [];
        scene.push(...this.board.getRenderObjects());

        const units = [...this.board.grid, ...this.board.bench, ...this.board.enemyGrid];
        for (const unit of units) {
            if (unit && unit.hp > 0) {
                scene.push(...unit.getRenderObjects());
            }
        }

        for (const p of this.projectiles) {
            scene.push(...p.getRenderObjects());
        }

        for (const e of this.effects) {
            if (e.getRenderObjects) scene.push(...e.getRenderObjects());
        }

        if (this.interaction.draggedUnit) {
            scene.push(...this.interaction.draggedUnit.getRenderObjects());
        }

        this.renderer.render(scene, this.camera);
    }

    spawnEnemySetup() {
        const parts = this.stage.split('-');
        const world = parseInt(parts[0]);
        const level = parseInt(parts[1]);

        const count = 2 + Math.floor(level / 3);
        const enemyLevel = world;

        const types = ['Orc Grunt', 'Human Recruit', 'Elf Blade', 'Beast Rat', 'Human Novice'];
        this.board.clearEnemyGrid();

        for (let i = 0; i < count; i++) {
            const typeKey = types[Math.floor(Math.random() * types.length)];
            const data = UNIT_DATABASE[typeKey];
            const unit = new Unit(typeKey, Math.random(), data.family, data.cls, data.cost, enemyLevel, 'enemy', data.maxMana);

            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 20) {
                const rx = Math.floor(Math.random() * this.board.width);
                const rz = Math.floor(Math.random() * this.board.height);
                if (this.board.placeUnit(unit, { type: 'board', x: rx, z: rz, team: 'enemy' })) {
                    placed = true;
                }
                attempts++;
            }
        }
    }

    spawnUnit(typeId) {
        const data = UNIT_DATABASE[typeId] || UNIT_DATABASE['Human Recruit'];
        for (let i = 0; i < 9; i++) {
            if (!this.board.bench[i]) {
                const unit = new Unit(typeId, Math.random(), data.family, data.cls, data.cost, 1, 'player', data.maxMana);
                this.board.placeUnit(unit, { type: 'bench', index: i });
                this.checkForMerge(unit);
                return true;
            }
        }
        return false;
    }

    checkForMerge(unit) {
        const allUnits = [...this.board.grid, ...this.board.bench].filter(u => u !== null);
        const siblings = allUnits.filter(u => u.typeId === unit.typeId && u.family === unit.family && u.cls === unit.cls && u.level === unit.level);

        if (siblings.length >= 3) {
            const toMerge = siblings.slice(0, 3);

            // Collect items before removing units
            const mergedItems = [];
            toMerge.forEach(u => {
                if (u.items && u.items.length > 0) {
                    mergedItems.push(...u.items);
                }
            });

            toMerge.forEach(u => this.board.removeUnit(u));

            const newLevel = unit.level + 1;
            const newUnit = new Unit(unit.typeId, Math.random(), unit.family, unit.cls, unit.cost, newLevel, unit.team, unit.maxMana);

            // Distribute items to new unit
            mergedItems.forEach(item => {
                if (!newUnit.addItem(item)) {
                    // If unit full, return to inventory
                    this.inventory.push(item);
                    console.log("Merge overflow: Item returned to inventory", item);
                }
            });

            this.spawnUnitOnBenchOrBoard(newUnit);

            // Play Animation if 3-star
            if (newUnit.level >= 3) {
                newUnit.playMergeAnimation();
                console.log("3-Star Unit Animation Triggered!");
            }

            this.checkForMerge(newUnit);
        }
    }

    spawnUnitOnBenchOrBoard(unit) {
        for (let i = 0; i < 9; i++) {
            if (!this.board.bench[i]) {
                this.board.placeUnit(unit, { type: 'bench', index: i });
                return;
            }
        }
        for (let i = 0; i < this.board.grid.length; i++) {
            if (!this.board.grid[i]) {
                const x = i % this.board.width;
                const z = Math.floor(i / this.board.width);
                this.board.placeUnit(unit, { type: 'board', x, z });
                return;
            }
        }
    }

    updateShopRatesUI() {
        if (!this.shop) return;
        const rates = this.shop.getDropRates(this.playerLevel);
        for (let i = 1; i <= 5; i++) {
            const el = document.getElementById(`rate-${i}`);
            if (el) {
                el.innerText = `${rates[i - 1]}%`;
                el.style.opacity = rates[i - 1] > 0 ? '1' : '0.3';
            }
        }
    }

    sellUnit(unit) {
        const value = unit.getSellValue();
        this.gold += value;
        this.updateUI();
    }

    setSelectedUnit(unit) {
        this.selectedUnit = unit;
        this.updateUI();
    }

    toggleSelection(unit) {
        if (this.selectedUnit === unit) {
            this.setSelectedUnit(null);
        } else {
            this.setSelectedUnit(unit);
        }
    }

    updateUI() {
        if (this.goldDisplay) this.goldDisplay.innerText = `Gold: ${this.gold}`;
        if (this.stageDisplay) this.stageDisplay.innerText = `Stage: ${this.stage}`;

        // Level & XP Updates
        if (this.levelDisplay) this.levelDisplay.innerText = `Niv. ${this.playerLevel}`;
        if (this.xpDisplay) this.xpDisplay.innerText = `${this.currentXp}/${this.xpToNextLevel}`;
        if (this.xpBtn) this.xpBtn.disabled = this.gold < 4 || this.playerLevel >= 6;

        const rollBtn = document.getElementById('btn-roll');
        if (rollBtn) rollBtn.disabled = this.gold < 2;

        this.updateShopRatesUI();

        const playerUnits = this.board.grid.filter(u => u !== null);

        // Prep Phase Synergy Update (so they appear active)
        if (this.gameState === 'PREP') {
            // Apply synergies temporarily for visuals
            playerUnits.forEach(u => u.clearSynergies());
            const active = SynergyManager.getActiveSynergies(playerUnits);
            SynergyManager.applySynergies(playerUnits, active);
        }

        // Update Synergy Panel
        let isSynergyOpen = true;
        if (this.synergyUI) {
            const status = SynergyManager.getSynergyStatus(playerUnits);
            this.synergyUI.update(status);
            isSynergyOpen = this.synergyUI.visible;
        }

        // Check Human Synergy Reward
        this.manageHumanSynergyItems(playerUnits);

        // Update Item UI
        if (this.itemUI) {
            this.itemUI.update(this.selectedUnit, isSynergyOpen);
            this.itemUI.renderInventory(
                this.inventory,
                this.selectedItem,
                (item) => this.selectItem(item, 'inventory'),
                (item, e) => this.interaction.startItemDrag(item, e)
            );
        }

        // Remove old stash container if exists
        const oldStash = document.getElementById('item-stash');
        if (oldStash) oldStash.style.display = 'none';
    }

    manageHumanSynergyItems(units) {
        if (this.gameState !== 'PREP') return;

        // 1. Calculate Human Count
        // SynergyManager returns TIERS, but we track raw count for granularity if needed?
        // Actually, let's assume SynergyManager is the source of truth for "Active Synergies".
        // BUT, SynergyManager logic might be: 2 humans -> Tier 1. 4 humans -> Tier 2.
        // We know: 2 Humans = Tier 1. 4 Humans = Tier 2.
        // We need: 2 Humans (1 Item), 4 Humans (2 Items), 5 Humans (Empowered).
        // Since SynergyManager might not distinguish 4 vs 5 if they are both "Tier 2", 
        // we MUST count manually here to be precise about "5".
        const humanUnits = units.filter(u => u.family === 'human');
        const uniqueHumans = new Set(humanUnits.map(u => u.typeId));
        const humanCount = uniqueHumans.size;

        // 2. Determine Targets
        let targetItemCount = 0;
        let isEmpowered = false;

        if (humanCount >= 2) targetItemCount = 1;
        if (humanCount >= 4) targetItemCount = 2;
        if (humanCount >= 5) isEmpowered = true;

        // 3. Add Items if needed
        const HUMAN_ITEMS_POOL = [
            { name: "Sword of Valor", baseStats: { damage: 20 }, type: 'synergy' },
            { name: "Shield of Hope", baseStats: { hp: 200 }, type: 'synergy' },
            { name: "Amulet of Mana", baseStats: { manaStart: 50 }, type: 'synergy' },
            { name: "Boots of Speed", baseStats: { atkSpeed: 0.2 }, type: 'synergy' },
            { name: "Ring of Life", baseStats: { hp: 100, damage: 10 }, type: 'synergy' }
        ];

        while (this.humanSynergyItems.length < targetItemCount) {
            const data = HUMAN_ITEMS_POOL[Math.floor(Math.random() * HUMAN_ITEMS_POOL.length)];
            // Create unique instance
            const newItem = {
                id: Date.now() + Math.random(),
                name: data.name,
                baseStats: { ...data.baseStats }, // Copy
                stats: { ...data.baseStats },     // Current stats
                type: 'synergy',
                isEmpowered: false
            };

            this.humanSynergyItems.push(newItem);
            this.inventory.push(newItem);
            console.log("Human Synergy Item Granted:", newItem.name);
        }

        // 4. Remove Items if needed (LIFO)
        while (this.humanSynergyItems.length > targetItemCount) {
            const itemToRemove = this.humanSynergyItems.pop();
            this.removeItemFromGame(itemToRemove);
            console.log("Human Synergy Item Removed:", itemToRemove.name);
        }

        // 5. Update Empower State
        this.humanSynergyItems.forEach(item => {
            if (item.isEmpowered !== isEmpowered) {
                // Update stats
                item.isEmpowered = isEmpowered;
                const multiplier = isEmpowered ? 2.5 : 1.0;

                // Recalculate stats based on baseStats
                const newStats = {};
                for (const [k, v] of Object.entries(item.baseStats)) {
                    newStats[k] = v * multiplier;
                }

                // If on Unit, existing stats must be reversed first
                const holder = this.findUnitHoldingItem(item);
                if (holder) {
                    holder.reverseItemStats(item);
                    item.stats = newStats;
                    holder.applyItemStats(item);
                    console.log(`Updated ${item.name} stats (Empowered: ${isEmpowered}) on ${holder.family}`);
                } else {
                    item.stats = newStats;
                }
            }
        });
    }

    removeItemFromGame(item) {
        // 1. Inventory
        const invIdx = this.inventory.indexOf(item);
        if (invIdx > -1) {
            this.inventory.splice(invIdx, 1);
            return;
        }

        // 2. Units (Board + Bench)
        const allUnits = [...this.board.grid, ...this.board.bench];
        for (const unit of allUnits) {
            if (unit && unit.removeItem(item)) {
                return; // Removed
            }
        }
    }

    findUnitHoldingItem(item) {
        const allUnits = [...this.board.grid, ...this.board.bench];
        for (const unit of allUnits) {
            if (unit && unit.items.includes(item)) return unit;
        }
        return null;
    }

    selectItem(item, origin) {
        // Toggle if same
        if (this.selectedItem && this.selectedItem.item === item) {
            this.selectedItem = null;
        } else {
            this.selectedItem = { item, origin };
        }
        console.log("Selected Item:", this.selectedItem);
        this.updateUI();
    }

    spawnProjectile(sourceUnit, type, target, damage, damageType = 'physical') {
        // Source position usually a bit higher than feet
        const startPos = sourceUnit.position.clone();
        startPos.y += 1.5;

        const proj = new Projectile(type, startPos, target, damage, sourceUnit, damageType);
        this.projectiles.push(proj);
    }

    triggerCinematic(targetUnit, duration) {
        this.cinematic = {
            target: targetUnit,
            duration: duration,
            timer: 0
        };

        // Play Sound
        if (this.cinematicAudio) {
            this.cinematicAudio.currentTime = 0;
            this.cinematicAudio.play().catch(e => console.warn("Audio play blocked/missing:", e));

            // Limit Duration to Cinematic Length
            setTimeout(() => {
                if (this.cinematicAudio) {
                    this.cinematicAudio.pause();
                    this.cinematicAudio.currentTime = 0;
                }
            }, duration * 1600);
        }
    }

    loadGodTexture(url) {
        const img = new Image();
        img.onload = () => {
            if (this.renderer) {
                // Create new texture
                const newTex = this.renderer.createTexture(img);
                // Replace
                this.godTexture = newTex;
                console.log("God Texture loaded from:", url);
            }
        };
        img.onerror = () => {
            console.warn("Failed to load God Texture:", url);
        };
        img.src = url;
    }

    spawnVisualEffect(type, position, duration) {
        // Simple Effect Object
        const game = this;
        const effect = {
            type: type, // 'giant_pyramid'
            position: position.clone(),
            timer: 0,
            duration: duration,
            active: true,

            update: function (dt) {
                this.timer += dt;
                if (this.timer >= this.duration) this.active = false;

                if (this.type === 'giant_pyramid') {
                    // Fall from sky
                    // Start Y = 20. End Y = 0.
                    const progress = Math.min(1.0, this.timer / (this.duration * 0.8)); // Land a bit early
                    // Cubic ease in
                    const fall = progress * progress * 20.0;
                    this.position.y = 20.0 - fall;
                    if (this.position.y < 0) this.position.y = 0;
                }
            },

            getRenderObjects: function () {
                if (this.type === 'giant_pyramid') {
                    const mat = new Mat4();
                    mat.translate(this.position);
                    mat.scale(new Vec3(10, 10, 10));
                    mat.rotateY(this.timer * 2.0); // Spin

                    return [{
                        type: 'decagon', // Flattened Decagon
                        transform: mat,
                        texture: game.godTexture,
                        color: new Vec3(1, 1, 1) // Full brightness
                    }];
                }
                return [];
            }
        };
        this.effects.push(effect);
    }

    createGodSymbolTexture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Background (Gold Sandstone)
        ctx.fillStyle = '#DAA520'; // GoldenRod
        ctx.fillRect(0, 0, size, size);

        // Texture Noise
        for (let i = 0; i < 5000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#B8860B' : '#FFD700';
            ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
        }

        // Circular Border
        const cx = size / 2;
        const cy = size / 2;
        const radius = size * 0.45;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.lineWidth = 20;
        ctx.strokeStyle = '#8B4513'; // SaddleBrown
        ctx.stroke();

        // Eye of Providence / Horusish Symbol
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(0.8, 0.8);

        // Triangle
        ctx.beginPath();
        ctx.moveTo(0, -150);
        ctx.lineTo(130, 100);
        ctx.lineTo(-130, 100);
        ctx.closePath();
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#8B4513';
        ctx.stroke();
        ctx.fillStyle = '#F0E68C'; // Khaki
        ctx.fill();

        // Eye
        ctx.beginPath();
        ctx.ellipse(0, 20, 60, 30, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 20, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        ctx.restore();

        return canvas;
    }
}
