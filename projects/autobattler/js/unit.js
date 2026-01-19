/**
 * Unit Class
 */
import { Vec3, Mat4 } from './math.js';

export class Unit {
    constructor(typeId, id, family, cls, cost, level = 1, team = 'player', maxMana = 100) {
        this.typeId = typeId; // e.g. 'Human Soldier'
        this.id = id;
        this.family = family; // 'human', 'orc', 'beast', 'celestial'
        this.cls = cls;       // 'tank', 'combatant', 'mage', 'assassin'
        this.cost = cost;     // 1, 2, 3, 4, 5
        this.level = level;
        this.team = team;     // 'player' or 'enemy'

        // Base Stats
        this.maxHp = 100 * level; // Could vary by class/cost
        this.hp = this.maxHp;
        this.maxMana = maxMana;
        this.mana = 0; // Start with 0 mana
        this.damage = 10 * level; // Could vary by class/cost
        this.armor = 20;
        this.magicResist = 20;
        this.ap = 0;
        this.critChance = 0.0;
        this.critMultiplier = 1.5;

        // Range Setup
        if (['mage', 'ranger', 'hunter'].includes(this.cls)) {
            this.range = 6.0; // Increased range for projectiles
        } else {
            this.range = 1.5; // Melee
        }

        this.permanentItems = [];
        this.temporaryItems = [];
        this.baseStats = { hp: this.maxHp, damage: this.damage, mana: 0, atkSpeed: 1.0, armor: 20, magicResist: 20, ap: 0, critChance: 0.0 }; // Enhanced base stats
        this.hitTimer = 0;

        // Visuals
        this.color = new Vec3(1, 1, 1);
        this.position = new Vec3(0, 0, 0);
        this.targetPosition = new Vec3(0, 0, 0);
        this.transform = new Mat4();

        this.modelType = 'cube';
        this.weaponType = null;

        this.setupVisuals();
    }

    get items() {
        return [...this.permanentItems, ...this.temporaryItems];
    }

    getSellValue() {
        const totalValue = this.cost * Math.pow(3, this.level - 1);
        return this.level > 1 ? totalValue - 1 : totalValue;
    }

    addItem(item) {
        if (this.permanentItems.length >= 3) return false;
        this.permanentItems.push(item);
        this.applyItemStats(item);
        return true;
    }

    addTemporaryItem(item) {
        // Synergy items don't count towards cap, or do they? 
        // Let's assume they are unique synergy bonuses.
        this.temporaryItems.push(item);
        this.applyItemStats(item);
        console.log(`${this.family} got temporary ${item.name}`);
    }

    applyItemStats(item) {
        if (item.stats.hp) {
            this.maxHp += item.stats.hp;
            this.hp += item.stats.hp;
        }
        if (item.stats.damage) { this.damage += item.stats.damage; }
        if (item.stats.manaStart) { this.mana += item.stats.manaStart; }
        if (item.stats.atkSpeed) {
            if (!this.stats.atkSpeed) this.stats.atkSpeed = 1.0;
            this.stats.atkSpeed += item.stats.atkSpeed;
        }
        if (item.stats.armor) this.armor += item.stats.armor;
        if (item.stats.magicResist) this.magicResist += item.stats.magicResist;
        if (item.stats.ap) this.ap += item.stats.ap;
        if (item.stats.critChance) this.critChance += item.stats.critChance;
    }

    removeItem(item) {
        const idx = this.permanentItems.indexOf(item);
        if (idx > -1) {
            this.permanentItems.splice(idx, 1);
            this.reverseItemStats(item);
            return true;
        }
        return false;
    }

    reverseItemStats(item) {
        if (item.stats.hp) {
            this.maxHp -= item.stats.hp;
            this.hp -= item.stats.hp;
            if (this.hp <= 0) this.hp = 1;
        }
        if (item.stats.damage) this.damage -= item.stats.damage;
        if (item.stats.manaStart) {
            this.mana -= item.stats.manaStart;
            if (this.mana < 0) this.mana = 0;
        }
        if (item.stats.atkSpeed) this.stats.atkSpeed -= item.stats.atkSpeed;
        if (item.stats.armor) this.armor -= item.stats.armor;
        if (item.stats.magicResist) this.magicResist -= item.stats.magicResist;
        if (item.stats.ap) this.ap -= item.stats.ap;
        if (item.stats.critChance) this.critChance -= item.stats.critChance;
    }

    clearSynergies() {
        // Revert temporary items
        for (const item of this.temporaryItems) {
            if (item.stats.hp) {
                this.maxHp -= item.stats.hp;
                this.hp -= item.stats.hp;
                if (this.hp <= 0) this.hp = 1; // Safety
            }
            if (item.stats.damage) { this.damage -= item.stats.damage; }
            if (item.stats.manaStart) { this.mana -= item.stats.manaStart; if (this.mana < 0) this.mana = 0; }
            if (item.stats.atkSpeed) { this.stats.atkSpeed -= item.stats.atkSpeed; }
            if (item.stats.armor) this.armor -= item.stats.armor;
            if (item.stats.magicResist) this.magicResist -= item.stats.magicResist;
            if (item.stats.ap) this.ap -= item.stats.ap;
            if (item.stats.critChance) this.critChance -= item.stats.critChance;
        }
        this.temporaryItems = [];

        // Reset other synergy flags
        this.synergyFlags = { orcDamage: false, elfStunCooldown: 0, elfTimer: 0 };
        // Reset buffers
        if (this.currentBuffs) {
            if (this.currentBuffs.hp) {
                this.maxHp -= this.currentBuffs.hp;
                this.hp -= this.currentBuffs.hp;
            }
        }
        this.currentBuffs = { hp: 0 };

        // Ensure stats exist
        if (!this.stats) this.stats = { lifesteal: 0, atkSpeed: 1.0 };
        this.stats.lifesteal = 0; // Beast reset
    }

    setupVisuals() {
        // Family -> Shape
        switch (this.family) {
            case 'human': this.modelType = 'cube'; break;
            case 'orc': this.modelType = 'tshape'; break;
            case 'beast': this.modelType = 'pyramid'; break;
            case 'elf': this.modelType = 'cylinder'; break;
            case 'celestial': this.modelType = 'sphere'; break;
            case 'special': this.modelType = 'pyramid'; break;
            default: this.modelType = 'cube';
        }

        // Class -> Weapon
        // 'tank', 'combatant', 'mage', 'assassin'
        // Class -> Weapon
        // 'tank', 'combatant', 'mage', 'assassin'
        this.weaponType = this.cls;
        if (this.cls === 'ranger') this.weaponType = 'bow';

        // Cost -> Color (Rarity)
        switch (this.cost) {
            case 1: this.color = new Vec3(0.5, 0.5, 0.5); break; // Grey
            case 2: this.color = new Vec3(0.2, 0.8, 0.2); break; // Green
            case 3: this.color = new Vec3(0.2, 0.2, 1.0); break; // Blue
            case 4: this.color = new Vec3(0.6, 0.2, 0.8); break; // Purple
            case 5: this.color = new Vec3(1.0, 0.8, 0.2); break; // Gold
            default: this.color = new Vec3(1, 1, 1);
        }

        // Debug: Tint enemies Red -- REMOVED
        // if (this.team === 'enemy') {
        //     this.color = new Vec3(0.8, 0.2, 0.2); // Red
        // }
    }

    update(dt) {
        // Linear movement to target
        const speed = 5.0 * dt;
        const dx = this.targetPosition.x - this.position.x;
        const dz = this.targetPosition.z - this.position.z;
        const distSq = dx * dx + dz * dz;

        if (distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            if (dist < speed) {
                // Snap if close enough (or would overshoot)
                this.position.x = this.targetPosition.x;
                this.position.z = this.targetPosition.z;
            } else {
                // Move towards
                this.position.x += (dx / dist) * speed;
                this.position.z += (dz / dist) * speed;
            }
        } else {
            this.position.x = this.targetPosition.x;
            this.position.z = this.targetPosition.z;
        }

        // Update transform matrix
        this.transform.identity(); this.transform.translate(this.position);

        // Rotate if enemy
        if (this.team === 'enemy') {
            this.transform.rotateY(Math.PI);
        }

        const scale = 0.8 + (this.level * 0.2);
        this.transform.scale(new Vec3(scale, scale, scale));

        if (this.hitTimer > 0) this.hitTimer -= dt;
    }

    // Synergy Stat Management
    snapshotStats() {
        this.savedStats = {
            maxHp: this.maxHp,
            damage: this.damage,
            range: this.range,
            mana: this.mana,
            armor: this.armor,
            magicResist: this.magicResist,
            ap: this.ap,
            critChance: this.critChance
        };
        // Reset Combat Flags
        this.stats = { lifesteal: 0, atkSpeed: 1.0 };
        this.synergyFlags = { orcDamage: false, elfStunCooldown: 0, elfTimer: 0 };
        this.status = { stunned: 0 };
        this.currentBuffs = { hp: 0 };
    }

    restoreStats() {
        if (this.savedStats) {
            this.maxHp = this.savedStats.maxHp;
            this.damage = this.savedStats.damage;
            this.armor = this.savedStats.armor || 20;
            this.magicResist = this.savedStats.magicResist || 20;
            this.ap = this.savedStats.ap || 0;
            this.critChance = this.savedStats.critChance || 0;
            this.range = this.savedStats.range;
            this.mana = 0; // Always reset mana
            this.savedStats = null;
        }
    }

    addTemporaryItem(item) {
        if (item.stats.hp) {
            this.maxHp += item.stats.hp;
            this.hp += item.stats.hp;
        }
        if (item.stats.damage) this.damage += item.stats.damage;
        if (item.stats.manaStart) this.mana += item.stats.manaStart;
        if (item.stats.atkSpeed) this.stats.atkSpeed += item.stats.atkSpeed;
        if (item.stats.armor) this.armor += item.stats.armor;
        if (item.stats.magicResist) this.magicResist += item.stats.magicResist;
        if (item.stats.ap) this.ap += item.stats.ap;
        if (item.stats.critChance) this.critChance += item.stats.critChance;
        console.log(`${this.family} got ${item.name}`);
    }

    resetCombatState() {
        // Just fail-safe if restore wasn't called (e.g. prep phase drag/drop)
        if (this.savedStats) this.restoreStats();

        this.hp = this.maxHp;
        this.mana = 0; // Reset mana on new round
        this.position = this.targetPosition.clone(); // Snap back to board position
        this.combatTarget = null;
        this.attackTimer = 0.0;
        this.hitTimer = 0.0;
        this.state = 'IDLE'; // IDLE, MOVE, ATTACK

        this.stats = { lifesteal: 0, atkSpeed: 1.0 };
        this.status = { stunned: 0 };
        this.synergyFlags = {};
        this.shield = 0; // Reset Shield

        // Overtime Reset
        this.moveSpeedMultiplier = 1.0;
        this.manaMultiplier = 1.0;
    }

    enableOvertime() {
        console.log(`${this.family} enters Overtime!`);
        this.moveSpeedMultiplier = 1.5;
        this.manaMultiplier = 1.5;
        // Increase Attack Speed by 50%
        if (!this.stats.atkSpeed) this.stats.atkSpeed = 1.0;
        this.stats.atkSpeed *= 1.5;
    }

    playMergeAnimation() {
        this.mergeAnimTimer = 2.0; // Slowed down from 0.6
    }

    applyStun(duration) {
        this.status.stunned = duration;
        this.state = 'STUNNED';
    }

    updateCombat(dt, allUnits, spawnProjectile, game) {
        if (this.hp <= 0) return;

        // Status Effects
        if (this.status.stunned > 0) {
            this.status.stunned -= dt;
            // Visual for stun? Shake?
            this.transform.rotateZ(Math.sin(Date.now() / 50) * 0.1);
            return; // Skip action
        }

        // Elf Synergy Logic (Stun proc)
        if (this.synergyFlags.elfStunCooldown > 0) {
            this.synergyFlags.elfTimer += dt;
            if (this.synergyFlags.elfTimer >= this.synergyFlags.elfStunCooldown) {
                this.synergyFlags.elfTimer = 0;
                // Stun current target or nearest enemy
                const target = this.combatTarget || this.findTarget(allUnits);
                if (target) {
                    // console.log("Elf Stun Proc!");
                    target.applyStun(0.5);
                    // Visual feedback?
                }
            }
        }
        // Cast Ability if Mana Full
        if (this.mana >= this.maxMana) {
            this.castAbility(allUnits, spawnProjectile, game);
            return;
        }
        if (!this.combatTarget || this.combatTarget.hp <= 0) {
            this.combatTarget = this.findTarget(allUnits);
        }

        if (this.combatTarget) {
            // 2. Move or Attack
            const dist = this.getDistance(this.combatTarget);

            if (dist <= this.range) {
                // Attack Range
                this.state = 'ATTACK';

                // Safety init
                if (isNaN(this.attackTimer) || this.attackTimer === undefined) {
                    // console.warn("AttackTimer was NaN, resetting");
                    this.attackTimer = 0;
                }

                // Attack Speed Mod
                const atkRate = 1.0 * (this.stats.atkSpeed || 1.0);
                this.attackTimer += (dt || 0.016) * atkRate;

                if (this.attackTimer >= 0.8) {
                    this.attackTimer = 0;
                    this.attack(this.combatTarget, spawnProjectile);
                }
            } else {
                // Move Range
                this.state = 'MOVE';
                this.moveTo(this.combatTarget.position, dt);
            }
        } else {
            this.state = 'IDLE';
        }

        // Update Transform (ALWAYS)
        this.transform.identity();

        let pos = this.position.clone();

        // Animation Logic
        if (this.state === 'ATTACK' && this.attackTimer < 0.3) {
            const lungeFactor = 1.0 * Math.sin((this.attackTimer / 0.3) * Math.PI);
            if (this.combatTarget) {
                const dx = this.combatTarget.position.x - this.position.x;
                const dz = this.combatTarget.position.z - this.position.z;
                const len = Math.sqrt(dx * dx + dz * dz) + 0.001;
                pos.x += (dx / len) * lungeFactor;
                pos.z += (dz / len) * lungeFactor;
            }
        }

        this.transform.translate(pos);

        // Look at target
        if (this.combatTarget) {
            const dx = this.combatTarget.position.x - this.position.x;
            const dz = this.combatTarget.position.z - this.position.z;
            const angle = Math.atan2(dx, dz);
            this.transform.rotateY(angle);
        } else {
            if (this.team === 'enemy') {
                this.transform.rotateY(Math.PI);
            }
        }

        // Stun visual override
        if (this.status.stunned > 0) {
            this.transform.rotateZ(0.2); // Tilted
        }

        // Animation Updates (Merge Pop)
        if (this.mergeAnimTimer > 0) {
            this.mergeAnimTimer -= dt;
            const t = 1.0 - (this.mergeAnimTimer / 2.0);
            // Slower Pulse
            this.animScale = 1.0 + Math.sin(t * Math.PI) * 0.5; // Pop up +50%
        } else {
            this.animScale = 1.0;
        }

        const baseScale = 0.8 + (this.level * 0.2);
        const finalScale = baseScale * this.animScale;
        this.transform.scale(new Vec3(finalScale, finalScale, finalScale));

        if (this.hitTimer > 0) this.hitTimer -= dt;
    }

    findTarget(allUnits) {
        let closest = null;
        let minDist = Infinity;

        for (const u of allUnits) {
            if (u.team !== this.team && u.hp > 0) {
                const d = this.getDistance(u);
                if (d < minDist) {
                    minDist = d;
                    closest = u;
                }
            }
        }
        return closest;
    }

    getDistance(other) {
        const dx = this.position.x - other.position.x;
        const dz = this.position.z - other.position.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    moveTo(targetPos, dt) {
        const speed = 2.0 * (this.moveSpeedMultiplier || 1.0) * dt; // Combat movement speed
        const dx = targetPos.x - this.position.x;
        const dz = targetPos.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > this.range - 0.5) { // Stop slightly before range
            this.position.x += (dx / dist) * speed;
            this.position.z += (dz / dist) * speed;
        }
    }

    castAbility(allUnits, spawnProjectile, game) {
        console.log(`${this.family} ${this.cls} casts Ability!`);
        this.mana = 0; // Consume Mana

        if (this.cls === 'tank') {
            // Shield: Gain 30% Max HP as Shield
            const shieldVal = this.maxHp * 0.3;
            // Initialize if undefined (safe check)
            if (!this.shield) this.shield = 0;
            this.shield += shieldVal;
            console.log(`Shield Activated! Current Shield: ${this.shield.toFixed(1)}`);
        }
        else if (this.cls === 'combatant') {
            // Bonus Damage on Next Attack (e.g. +100%)
            this.synergyFlags.nextAttackBonus = 2.0; // Multiplier
            console.log("Enrage: Next attack deals double damage!");
        }
        else if (this.cls === 'ranger' || this.cls === 'hunter') {
            // Arrow Rain: Fire 3 projectiles at random enemies
            const targets = allUnits.filter(u => u.team !== this.team && u.hp > 0);
            for (let i = 0; i < 3; i++) {
                if (targets.length === 0) break;
                const randTarget = targets[Math.floor(Math.random() * targets.length)];
                spawnProjectile('arrow', randTarget, this.damage * 0.8, 'physical');
            }
            console.log("Arrow Rain!");
        }
        else if (this.cls === 'mage') {
            // AoE Damage: Fireball at current target that explodes?
            // Or just instant AoE? User said "dégâts de zone".
            // Let's spawn a big fireball that does AoE on hit? 
            // Current projectile logic is single target.
            // Let's do Instant AoE around Target.
            const target = this.combatTarget || this.findTarget(allUnits);
            if (target) {
                // Visual
                spawnProjectile('fireball', target, 0, 'magical'); // Dummy projectile for visual?

                // Actual Logic (Area 2.5)
                const area = 2.5;
                const dmg = (this.damage + this.ap) * 1.5;
                allUnits.forEach(u => {
                    if (u.team !== this.team && u.hp > 0) {
                        const d = target.getDistance(u);
                        if (d <= area) {
                            u.takeDamage(dmg, 'magical', this);
                        }
                    }
                });
                console.log("Meteor Strike!");
            }
        }
        else if (this.cls === 'assassin') {
            // Jump to Furthest Enemy + Buff
            let furthest = null;
            let maxDist = -1;
            allUnits.forEach(u => {
                if (u.team !== this.team && u.hp > 0) {
                    const d = this.getDistance(u);
                    if (d > maxDist) {
                        maxDist = d;
                        furthest = u;
                    }
                }
            });

            if (furthest) {
                // Teleport behind? Or just to position?
                // Snap to their position + offset?
                const offset = new Vec3(0, 0, 1.0); // Rough offset
                // Ideally calculate vector behind.
                this.position.x = furthest.position.x;
                this.position.z = furthest.position.z - 1.0; // Behind Z?
                // Update transform immediately to prevent "sliding" visual next frame

                this.synergyFlags.nextAttackBonus = 2.0;
                this.attackTimer = 0.5; // Reset swing
                console.log("Assassin Jump!");
            }
        }
        else if (this.cls === 'god') {
            if (this.level >= 3) {
                console.log("THE ANCIENT ONE AWAKENS!");

                // Cinematic & Effect
                if (game) {
                    game.triggerCinematic(this, 3.5);
                    game.spawnVisualEffect('giant_pyramid', this.position, 3.0);
                }

                // CRUSH THE BOARD (3s Delay simulating animation)
                setTimeout(() => {
                    console.log("PYRAMID CRUSH (Enemy Wipe)!");
                    // Kill ALL ENEMIES
                    allUnits.forEach(u => {
                        if (u.team !== this.team && u.hp > 0) {
                            console.log(`The Ancient One obliterates ${u.family}!`);
                            u.takeDamage(999999, 'true', this);
                        }
                    });
                }, 3000);
            } else {
                // Simple Smite for lower levels
                const target = this.combatTarget || this.findTarget(allUnits);
                if (target) {
                    // Instant hit or projectile
                    target.takeDamage(300 * this.level, 'magical', this);
                    console.log("Solaris Smite!");
                }
            }
        }
    }

    attack(target, spawnProjectile) {
        // Deal damage
        console.log(`${this.family} ${this.cls} attacks ${target.family} ${target.cls}`);

        let actualDamage = this.damage;

        // Check Next Attack Bonus (Combatant/Assassin Ability)
        if (this.synergyFlags.nextAttackBonus) {
            actualDamage *= this.synergyFlags.nextAttackBonus;
            this.synergyFlags.nextAttackBonus = null; // Consume
            console.log("Bonus Damage Proc!");
        }

        // Orc Synergy: Damage based on Max HP (e.g. 5%)
        if (this.synergyFlags.orcDamage) {
            actualDamage += this.maxHp * 0.05;
        }

        if (this.cls === 'mage' && spawnProjectile) {
            // Mage uses AP? Or Base Damage + AP? Let's say Base Damage + AP for spells?
            // Actually usually mages cast spells when mana full. Basic attacks are physical.
            // But here logic is simplified. Let's make fireball Magical and use AP.
            const magicDmg = actualDamage + this.ap;
            spawnProjectile('fireball', target, magicDmg, 'magical');
        } else if ((this.cls === 'ranger' || this.cls === 'hunter') && spawnProjectile) {
            spawnProjectile('arrow', target, actualDamage, 'physical');
        } else {
            // Melee/Ranged Basic Attack - Physical
            let isCrit = false;
            if (Math.random() < this.critChance) {
                actualDamage *= this.critMultiplier;
                isCrit = true;
                console.log("CRIT!");
            }

            const dealt = target.takeDamage(actualDamage, 'physical', this);

            if (this.stats.lifesteal > 0) {
                // Heals on melee
                // Calculate dmg? target.takeDamage returns amount? 
                // Let's assume takeDamage returns damage taken (implied below)
                // Actually need to check takeDamage return.
                const heal = actualDamage * this.stats.lifesteal;
                this.heal(heal);
            }
        }

        this.gainMana(10);
    }

    heal(amount) {
        this.hp += amount;
        if (this.hp > this.maxHp) this.hp = this.maxHp;
    }

    gainMana(amount) {
        // Tanks cannot gain mana while shielded
        if (this.shield > 0 && this.cls === 'tank') return;

        if (this.mana >= this.maxMana) return;
        this.mana += amount * (this.manaMultiplier || 1.0);
        if (this.mana > this.maxMana) this.mana = this.maxMana;
        // console.log(`${this.family} mana: ${this.mana}/${this.maxMana}`);
    }

    takeDamage(amount, type = 'physical', source = null) {
        let mitigation = 0; // 0 to 1

        if (type === 'physical') {
            const arm = this.armor;
            mitigation = arm / (100 + arm);
        } else if (type === 'magical') {
            const mr = this.magicResist;
            mitigation = mr / (100 + mr);
        } else if (type === 'true') {
            mitigation = 0;
        }

        const took = amount * (1.0 - mitigation);

        // Shield Absorption
        let damageToHp = took;
        if (this.shield > 0) {
            if (this.shield >= took) {
                this.shield -= took;
                damageToHp = 0;
            } else {
                damageToHp = took - this.shield;
                this.shield = 0;
            }
        }

        console.log(`${this.family} takes ${damageToHp.toFixed(1)} HP damage (+ ${(took - damageToHp).toFixed(1)} Shield). HP: ${this.hp.toFixed(1)} -> ${(this.hp - damageToHp).toFixed(1)}`);
        this.hp -= damageToHp;
        this.hitTimer = 0.2; // Flash for 0.2s
        this.gainMana(10);
        return took;
    }

    canMerge(other) {
        // Must match everything
        return this.typeId === other.typeId &&
            this.family === other.family &&
            this.cls === other.cls &&
            this.level === other.level &&
            this.level < 3;
    }

    getRenderObjects() {
        const objs = [];

        // Body
        objs.push({
            type: this.modelType, // 'cube', 'pyramid', 'sphere'
            transform: this.transform, // Already updated in update()
            color: this.hitTimer > 0 ? new Vec3(1, 1, 1) : this.color // Flash White
        });

        // Health Bar (Background - Dark Grey)
        const barBg = new Mat4();
        // Position above head
        barBg.translate(new Vec3(this.position.x, 2.5, this.position.z));
        // Scale flat
        barBg.scale(new Vec3(0.8, 0.1, 0.1));

        objs.push({
            type: 'cube',
            transform: barBg,
            color: new Vec3(0.2, 0.2, 0.2) // Dark Grey background
        });

        // Health Bar (Foreground - Green for player, Red for enemy)
        if (this.hp > 0) {
            const pct = Math.max(0, this.hp / this.maxHp);
            const barFg = new Mat4();

            barFg.translate(new Vec3(this.position.x, 2.5, this.position.z + 0.05)); // Slight Z offset
            barFg.scale(new Vec3(0.8 * pct, 0.08, 0.08));

            let hpColor = new Vec3(0.0, 1.0, 0.0); // Bright Green
            if (this.team === 'enemy') {
                hpColor = new Vec3(1.0, 0.0, 0.0); // Red
            }

            objs.push({
                type: 'cube',
                transform: barFg,
                color: hpColor
            });
        }

        // Shield Bar (Light Grey - Above HP)
        if (this.shield > 0) {
            const shieldPct = Math.min(1.0, this.shield / this.maxHp);
            const shieldBar = new Mat4();
            shieldBar.translate(new Vec3(this.position.x, 2.65, this.position.z)); // Above HP
            shieldBar.scale(new Vec3(0.8 * shieldPct, 0.08, 0.08));

            objs.push({
                type: 'cube',
                transform: shieldBar,
                color: new Vec3(0.8, 0.8, 0.8) // Light Grey
            });
        }

        // Mana Bar (Background - Dark Blue)
        const manaBg = new Mat4();
        manaBg.translate(new Vec3(this.position.x, 2.35, this.position.z)); // Below HP
        manaBg.scale(new Vec3(0.8, 0.08, 0.08));

        objs.push({
            type: 'cube',
            transform: manaBg,
            color: new Vec3(0.0, 0.0, 0.3) // Dark Blue
        });

        // Mana Bar (Foreground - Blue)
        if (this.mana > 0) {
            const manaPct = Math.max(0, this.mana / this.maxMana);
            const manaFg = new Mat4();
            manaFg.translate(new Vec3(this.position.x, 2.35, this.position.z + 0.05));
            manaFg.scale(new Vec3(0.8 * manaPct, 0.06, 0.06));

            objs.push({
                type: 'cube',
                transform: manaFg,
                color: new Vec3(0.2, 0.2, 1.0) // Bright Blue
            });
        }

        // Weapon
        if (this.weaponType) {
            const weaponTransform = new Mat4();
            // Start with body transform
            // Copy raw data (hacky clone)
            for (let i = 0; i < 16; i++) weaponTransform.data[i] = this.transform.data[i];

            // Offset weapon to side
            weaponTransform.translate(new Vec3(0.6, 0.2, 0.3));

            if (this.weaponType === 'combatant') { // Sword (previously warrior)
                // Handle
                weaponTransform.scale(new Vec3(0.1, 0.8, 0.1));
                objs.push({ type: 'cylinder', transform: weaponTransform, color: new Vec3(0.8, 0.8, 0.8) });
            } else if (this.weaponType === 'mage') { // Staff
                weaponTransform.scale(new Vec3(0.1, 1.2, 0.1));
                objs.push({ type: 'cylinder', transform: weaponTransform, color: new Vec3(0.6, 0.4, 0.2) });
            } else if (this.weaponType === 'tank') { // Shield (previously defender)
                // Flat box
                weaponTransform.scale(new Vec3(0.1, 0.6, 0.6));
                objs.push({ type: 'cube', transform: weaponTransform, color: new Vec3(0.4, 0.4, 0.6) });
            } else if (this.weaponType === 'assassin') { // Dagger
                // Short reverse blade?
                weaponTransform.translate(new Vec3(0, -0.2, 0)); // Lower it
                weaponTransform.scale(new Vec3(0.08, 0.4, 0.08)); // Smaller
                objs.push({ type: 'cylinder', transform: weaponTransform, color: new Vec3(0.3, 0.3, 0.4) });
            } else if (this.weaponType === 'bow') {
                // Bow - Brown Curved? Just vertical stick for now
                weaponTransform.scale(new Vec3(0.1, 1.4, 0.1));
                objs.push({ type: 'cylinder', transform: weaponTransform, color: new Vec3(0.6, 0.4, 0.2) });
            }
        }

        return objs;
    }
}
