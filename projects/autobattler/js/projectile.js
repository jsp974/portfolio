
import { Vec3, Mat4 } from './math.js';

export class Projectile {
    constructor(type, position, target, damage, owner, damageType = 'physical') {
        this.type = type; // 'arrow', 'fireball'
        this.position = position.clone();
        this.target = target; // Unit object
        this.damage = damage;
        this.owner = owner; // Unit object (source)
        this.damageType = damageType;

        this.speed = type === 'arrow' ? 15.0 : 10.0;
        this.active = true;

        this.transform = new Mat4();

        // Predict interception or just homing? Homing is easier and standard for autobattlers usually.
        // We will do homing missile logic.
    }

    update(dt) {
        if (!this.active) return;

        // If target is dead, continue to last known position? 
        // Or just fizzle? Let's fizzle for simplicity or travel to last pos.
        // For now: pure homing.

        const targetPos = this.target.position;
        // Raise target pos slightly to hit center of body (y=1.0 approx)
        const aimPos = new Vec3(targetPos.x, 1.0, targetPos.z);

        const dx = aimPos.x - this.position.x;
        const dy = aimPos.y - this.position.y;
        const dz = aimPos.z - this.position.z;

        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);

        if (dist < 0.5) {
            // Hit!
            this.hit();
            return;
        }

        const move = this.speed * dt;

        // Move towards
        this.position.x += (dx / dist) * move;
        this.position.y += (dy / dist) * move;
        this.position.z += (dz / dist) * move;

        // Update Transform
        this.transform.identity();
        this.transform.translate(this.position);

        // Rotation (look at target)
        const angleY = Math.atan2(dx, dz);
        // Pitch (simple approx)
        const angleX = -Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));

        this.transform.rotateY(angleY);
        this.transform.rotateX(angleX);

        // Scale
        if (this.type === 'arrow') {
            this.transform.scale(new Vec3(0.05, 0.05, 0.8)); // Long Z-axis stick
        } else {
            this.transform.scale(new Vec3(0.4, 0.4, 0.4)); // Ball
        }
    }

    hit() {
        this.active = false;
        if (this.target && this.target.hp > 0) {
            this.target.takeDamage(this.damage, this.damageType, this.owner);
            // On hit mana gain for attacker was usually credited on attack start or hit? 
            // Previous code: instant damage on attack start.
            // Requirement usually: Mana on attack (on cast/launch) or on hit.
            // User requested mana on attack, I put it in attack().
            // So mana is already handled. Damage is delayed now.
        }
    }

    getRenderObjects() {
        if (!this.active) return [];

        const color = this.type === 'arrow' ? new Vec3(0.6, 0.5, 0.3) : new Vec3(1.0, 0.5, 0.0);
        const shape = this.type === 'arrow' ? 'cylinder' : 'sphere';

        return [{
            type: shape,
            transform: this.transform,
            color: color
        }];
    }
}
