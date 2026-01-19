/**
 * Item System
 */

export class Item {
    constructor(id, type) {
        this.id = id;
        this.type = type;
        this.name = this.getName(type);
        this.stats = this.getStats(type);
    }

    getName(type) {
        switch (type) {
            case 'sword': return 'BF Sword';
            case 'rod': return 'Large Rod';
            case 'vest': return 'Chain Vest';
            case 'cloak': return 'Negatron Cloak';
            case 'gloves': return 'Sparring Gloves';
            case 'belt': return 'Giant\'s Belt';
            default: return 'Unknown Item';
        }
    }

    getStats(type) {
        switch (type) {
            case 'sword': return { damage: 15 };
            case 'rod': return { ap: 20 };
            case 'vest': return { armor: 20 };
            case 'cloak': return { magicResist: 20 };
            case 'gloves': return { critChance: 0.2 };
            case 'belt': return { hp: 200 };
            default: return {};
        }
    }
}
