import { UNIT_DATABASE } from './game.js';

export class Shop {
    constructor(game) {
        this.game = game;
        this.cards = [];
        this.pool = Object.keys(UNIT_DATABASE);

        this.container = document.getElementById('shop-cards');
        this.rerollBtn = document.getElementById('btn-roll');

        this.rerollBtn.onclick = () => this.reroll();

        this.reroll();
    }

    reroll(isFree = false) {
        if (!isFree) {
            if (this.game.gold < 2) return; // Basic check, ideally Game class handles gold deduction
            this.game.gold -= 2;
            this.game.updateUI();
        }

        this.cards = [];
        this.container.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const type = this.getRandomUnitType();
            this.createCard(type, i);
        }
    }

    getRandomUnitType() {
        // 1. Get Drop Probabilities
        const rates = this.getDropRates(this.game.playerLevel);

        // 2. Roll for Cost Tier
        const rand = Math.random() * 100;
        let cumulative = 0;
        let targetCost = 1;

        for (let cost = 1; cost <= 5; cost++) {
            cumulative += rates[cost - 1]; // rates is array [%, %, %, %, %]
            if (rand < cumulative) {
                targetCost = cost;
                break;
            }
        }

        // 3. Pick unit of that Cost
        const possibleUnits = this.getUnitsByCost(targetCost);

        // Safety fallback if no units of that cost exist
        if (possibleUnits.length === 0) {
            // Fallback to Cost 1
            return this.getUnitsByCost(1)[Math.floor(Math.random() * this.getUnitsByCost(1).length)];
        }

        const idx = Math.floor(Math.random() * possibleUnits.length);
        return possibleUnits[idx];
    }

    getDropRates(level) {
        // [Cost 1, Cost 2, Cost 3, Cost 4, Cost 5]
        switch (level) {
            case 1: return [100, 0, 0, 0, 0];
            case 2: return [55, 30, 15, 0, 0];
            case 3: return [50, 35, 15, 0, 0]; // Interpolated
            case 4: return [45, 33, 20, 2, 0]; // 45+33+20+2 = 100
            case 5: return [19, 30, 40, 10, 1];
            case 6: return [10, 15, 25, 40, 10];
            default: return [10, 15, 25, 40, 10]; // Cap at 6 stats
        }
    }

    getUnitsByCost(cost) {
        // Get all units of this cost
        const candidates = Object.keys(UNIT_DATABASE).filter(name => {
            const u = UNIT_DATABASE[name];
            return u.cost === cost;
        });

        // Filter out units the player already has at Level 3
        const playerUnits = this.getAllPlayerUnits();

        return candidates.filter(type => {
            // Check if player has this unit at level 3
            const hasMaxed = playerUnits.some(u => u.typeId === type && u.level >= 3);
            return !hasMaxed;
        });
    }

    getAllPlayerUnits() {
        if (!this.game || !this.game.board) return [];
        const boardUnits = this.game.board.grid.filter(u => u !== null);
        const benchUnits = this.game.board.bench.filter(u => u !== null);
        return [...boardUnits, ...benchUnits];
    }

    createCard(type, index) {
        const cost = this.getCost(type);

        const family = UNIT_DATABASE[type] ? UNIT_DATABASE[type].family : 'human';
        const shapeClass = this.getShapeClass(family);

        const card = document.createElement('div');
        card.className = 'shop-card';
        card.innerHTML = `
            <div class="unit-icon ${shapeClass}" style="background-color: ${this.getColorCheck(type)}"></div>
            <div class="unit-name">${type}</div>
            <div class="unit-cost">${cost}g</div>
        `;

        card.onclick = () => this.buy(type, cost, card);
        this.container.appendChild(card);
    }

    buy(type, cost, cardElem) {
        if (this.game.gold >= cost) {
            const success = this.game.spawnUnit(type);
            if (success) {
                this.game.gold -= cost;
                this.game.updateUI();
                cardElem.style.visibility = 'hidden';
            }
        }
    }

    getCost(type) {
        return UNIT_DATABASE[type] ? UNIT_DATABASE[type].cost : 1;
    }

    getColorCheck(type) {
        const cost = this.getCost(type);
        switch (cost) {
            case 1: return '#777';
            case 2: return '#4c4'; // Green
            case 3: return '#44f'; // Blue
            case 4: return '#b4d'; // Purple
            case 5: return '#fd4'; // Gold
            default: return '#fff';
        }
    }
    getShapeClass(family) {
        switch (family) {
            case 'human': return 'shape-cube';
            case 'orc': return 'shape-tshape';
            case 'beast': return 'shape-pyramid';
            case 'elf': return 'shape-cylinder';
            case 'celestial': return 'shape-sphere';
            default: return 'shape-cube';
        }
    }
}
