
import { Unit } from './unit.js';

export const SYNERGIES = {
    orc: {
        thresholds: [2, 3],
        name: "Orc",
        description: "Des guerriers brutaux dont la vitalité alimente la rage.<br><br>2: +20% PV Max<br>3: Dégâts bonus basés sur les PV Max."
    },
    elf: {
        thresholds: [2, 3],
        name: "Elf",
        description: "Maîtres des arcanes capables de figer le temps.<br><br>2: Étourdissement tous les 8s<br>3: Étourdissement tous les 5s"
    },
    human: {
        thresholds: [2, 4, 5],
        name: "Human",
        description: "Les humains en groupe se prennent d'une frénésie de création d'artefacts.<br><br>2: 1 Objet aléatoire<br>4: 2 Objets aléatoires<br>5: Objets Renforcés (x2.5)"
    },
    beast: {
        thresholds: [2, 4],
        name: "Beast",
        description: "Des prédateurs sauvages qui se nourrissent de leurs proies.<br><br>2: +25% Vol de Vie<br>4: +50% Vol de Vie"
    }
};

const HUMAN_ITEMS = [
    { name: "Sword of Valor", stats: { damage: 20 }, type: 'synergy' },
    { name: "Shield of Hope", stats: { hp: 200 }, type: 'synergy' },
    { name: "Amulet of Mana", stats: { manaStart: 50 }, type: 'synergy' }, // Need to handle manaStart
    { name: "Boots of Speed", stats: { atkSpeed: 0.2 }, type: 'synergy' }, // Need to handle atkSpeed
    { name: "Ring of Life", stats: { hp: 100, damage: 10 }, type: 'synergy' }
];

export class SynergyManager {
    static getActiveSynergies(boardUnits) {
        const counts = {};
        const uniqueUnits = new Set();

        // Count UNIQUE units (by family)
        for (const unit of boardUnits) {
            // Uniqueness based on typeId (Unit Name)
            // If typeId is missing (legacy?), fallback to family+cls
            const key = unit.typeId || `${unit.family}_${unit.cls}`;
            if (!uniqueUnits.has(key)) {
                uniqueUnits.add(key);
                if (!counts[unit.family]) counts[unit.family] = 0;
                counts[unit.family]++;
            }
        }

        const active = {};
        for (const [fam, count] of Object.entries(counts)) {
            const data = SYNERGIES[fam];
            if (!data) continue;

            let tier = 0;
            for (let i = 0; i < data.thresholds.length; i++) {
                if (count >= data.thresholds[i]) {
                    tier = i + 1;
                }
            }
            if (tier > 0) {
                active[fam] = tier;
            }
        }
        return active;
    }

    static getSynergyStatus(boardUnits) {
        const counts = {};
        const uniqueUnits = new Set();

        for (const unit of boardUnits) {
            const key = unit.typeId || `${unit.family}_${unit.cls}`;
            if (!uniqueUnits.has(key)) {
                uniqueUnits.add(key);
                if (!counts[unit.family]) counts[unit.family] = 0;
                counts[unit.family]++;
            }
        }

        const status = [];
        for (const [key, data] of Object.entries(SYNERGIES)) {
            const count = counts[key] || 0;
            // Determine active tier
            let activeTier = 0;
            for (let i = 0; i < data.thresholds.length; i++) {
                if (count >= data.thresholds[i]) {
                    activeTier = i + 1;
                }
            }

            if (count > 0) {
                status.push({
                    key: key,
                    name: data.name,
                    count: count,
                    thresholds: data.thresholds,
                    activeTier: activeTier,
                    description: data.description
                });
            }
        }

        // Sort by active tier desc, then count desc
        status.sort((a, b) => {
            if (b.activeTier !== a.activeTier) return b.activeTier - a.activeTier;
            return b.count - a.count;
        });

        return status;
    }

    static applySynergies(units, activeSynergies) {
        for (const unit of units) {
            const fam = unit.family;
            const tier = activeSynergies[fam];

            if (!tier) continue;

            if (fam === 'orc') {
                // Tier 1 (2 units): +20% HP
                if (tier >= 1) {
                    const bonus = unit.maxHp * 0.20;
                    unit.currentBuffs.hp += bonus;
                    unit.hp += bonus;
                    unit.maxHp += bonus;
                }
                // Tier 2 (3 units): Damage based on Max HP
                if (tier >= 2) {
                    unit.synergyFlags.orcDamage = true;
                }
            }

            else if (fam === 'beast') {
                // Tier 1 (2 units) -> maybe 25%? User said "2 de chaque 1synergie et si 4 renforcement".
                // User said: "les betes du vol de vie (50% des degats qu'ils inflige)" at level 4 presumably? Or base?
                // Let's do: Tier 1 = 25%, Tier 2 = 50%
                if (tier >= 1) unit.stats.lifesteal += 0.25;
                if (tier >= 2) unit.stats.lifesteal += 0.25; // Total 0.5
            }

            else if (fam === 'human') {
                // Logic moved to Game.js (Stash System)
                // Tier 1 (2 units): Grants a Stash Item (handled externally)
                if (tier >= 1) {
                    // No direct stats application here
                }
            }

            else if (fam === 'elf') {
                // Stun logic
                // Tier 1: Stun 0.5s every 8s? 
                // Tier 2: Stun 0.5s every 5s?
                // User said "stunt ... pendant 0.5 sec toute les 5 sec".
                // Let's apply default at Tier 2. Weaker at Tier 1?

                if (tier >= 1) {
                    unit.synergyFlags.elfStunCooldown = 8.0;
                    if (tier >= 2) unit.synergyFlags.elfStunCooldown = 5.0;
                    unit.synergyFlags.elfTimer = 0;
                }
            }
        }
    }
}
