import Phaser from "phaser";
import backgroundImg from "assets/img/Javelin/background.png";
import rocketImg from "assets/img/Javelin/rocket.png";
import launchImg from "assets/img/Javelin/launch.png";
import targetImg1 from "assets/img/Javelin/target1.png";
import targetImg2 from "assets/img/Javelin/target2.png";
import targetImg3 from "assets/img/Javelin/target3.png";
import targetImg4 from "assets/img/Javelin/target4.png";
import targetImg5 from "assets/img/Javelin/target5.png";
import targetImg6 from "assets/img/Javelin/target6.png";
import targetImg7 from "assets/img/Javelin/target7.png";
import targetImg8 from "assets/img/Javelin/target8.png";
import targetImg9 from "assets/img/Javelin/target9.png";
import targetImg10 from "assets/img/Javelin/target10.png";
import targetImg11 from "assets/img/Javelin/target11.png";
import targetImg12 from "assets/img/Javelin/target12.png";
import targetImg13 from "assets/img/Javelin/target13.png";
import targetImg14 from "assets/img/Javelin/target14.png";
import targetImg15 from "assets/img/Javelin/target15.png";

import handImg from "assets/img/Javelin/hand.png";

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    preload() {
        // Load via bundler-resolved URL (works even when not in public/)
        this.load.image("cannon", rocketImg);
        this.load.image("background", backgroundImg);
        this.load.image("launch", launchImg);
        this.load.image("target1", targetImg1);
        this.load.image("target2", targetImg2);
        this.load.image("target3", targetImg3);
        this.load.image("target4", targetImg4);
        this.load.image("target5", targetImg5);
        this.load.image("target6", targetImg6);
        this.load.image("target7", targetImg7);
        this.load.image("target8", targetImg8);
        this.load.image("target9", targetImg9);
        this.load.image("target10", targetImg10);
        this.load.image("target11", targetImg11);
        this.load.image("target12", targetImg12);
        this.load.image("target13", targetImg13);
        this.load.image("target14", targetImg14);
        this.load.image("target15", targetImg15);
        this.load.image("hand", handImg);
    }

    create() {
        const { width, height } = this.scale;
        this.gameW = width;
        this.gameH = height;

        // Background image (cover whole canvas, no stretching/borders)
        this.bg = this.add.image(width / 2, height / 2, "background").setOrigin(0.5, 0.5);
        this.bg.setDepth(-10);
        this.scaleBackground();

        // Keep background (and cannon pivot) aligned on resize
        this.scale.on("resize", (gameSize) => {
            const w = gameSize.width;
            const h = gameSize.height;
            this.gameW = w;
            this.gameH = h;

            // Update cannon pivot
            this.pivotX = w / 2;
            this.pivotY = h - 40;

            if (this.bg) {
                this.bg.setPosition(w / 2, h / 2);
                this.scaleBackground();
            }

            if (this.launchPad) {
                this.launchPad.setPosition(this.pivotX, this.pivotY);
                this.launchPad.rotation = this.angleValue + this.launchRotationOffset;
                this.barrelLen = this.launchPad.displayHeight * 0.9;
                if (this.rocketOnPad) this.syncRocketOnPadPosition();
            }

            // Keep target planets aligned with the current viewport size.
            this.relayoutTargetsForViewport();
        });

        // Fire particle texture (for cannonball trail)
        if (!this.textures.exists("fireParticle")) {
            const fg = this.make.graphics({ x: 0, y: 0, add: false });
            fg.fillStyle(0xff6a00, 1);
            fg.fillCircle(6, 6, 6);
            fg.fillStyle(0xffd000, 0.9);
            fg.fillCircle(6, 6, 3);
            fg.generateTexture("fireParticle", 12, 12);
            fg.destroy();
        }

        this.ensureExplosionTextures();

        // Cannon pivot: bottom center
        this.pivotX = width / 2;
        this.pivotY = height - 40;

        // Swing control (semicircle): left (-PI) to right (0)
        this.angleValue = -Math.PI / 2;
        this.direction = 1;
        this.isFiring = false;
        this.pendingMultiplier = null;
        /** React asked to fire while `fire()` returned false; retried once per Phaser frame (no slow setTimeout loop). */
        this._pendingExternalFire = false;
        this._pendingExternalFireFrames = 0;

        // Collision tolerance:
        // Arcade overlap can miss due to timestep + small circle sizes.
        // We treat any slight contact as a hit using a distance check in `update()`.
        this.hitContactBuffer = 16;
        this.rocketRadiusFactor = 0.30;
        this.targetRadiusFactor = 0.50;

        // Tracks if the currently fired rocket ever collided with a target.
        // Used to detect MISS when the projectile disappears.
        this.rocketWasHit = false;

        // Difficulty rotation speed:
        // RotatingSpeed(normal) = RotatingSpeed(easy) * 1.8
        // RotatingSpeed(hard) = RotatingSpeed(easy) * 2.3
        this.easyRotationSpeed = 0.01;
        this.rotationSpeedMultiplier = 1;
        this.rotationSpeed = this.easyRotationSpeed;

        // Difficulty also affects projectile (rocket) speed.
        this.easyProjectileSpeed = 1000;
        this.projectileSpeedMultiplier = 1;
        this.projectileSpeed = this.easyProjectileSpeed;

        // Launch pad sprite: rotates to aim. (Rocket is the projectile.)
        this.launchPad = this.add.image(this.pivotX, this.pivotY, "launch");
        this.launchPad.setOrigin(0.5, 1);
        this.launchPad.setScale(0.7);
        this.launchPad.setDepth(2);
        // Click/tap the launch pad to trigger the same action as the Fire button.
        this.launchPad.setInteractive({ useHandCursor: true });
        this.launchPad.on("pointerdown", () => {
            if (typeof window !== "undefined" && typeof window.onRocketShotBet === "function") {
                window.onRocketShotBet();
            }
        });

        // Rotation offset: when angleValue = -PI/2 (up), sprite rotation should be 0.
        this.launchRotationOffset = Math.PI / 2;

        // Use pad height as barrel length for muzzle calculation.
        this.barrelLen = this.launchPad.displayHeight * 0.9;

        // Rocket shown on the pad while idle. It will be detached and fired on bet.
        this.rocketOnPad = null;
        this.rocketIdleRotation = 0; // keep stable while aiming
        // Visual alignment tweak: move rocket slightly back/down on the pad.
        // (Projectile still uses the full barrelLen for consistent firing.)
        this.rocketOnPadDistanceFactor = 0.4;
        this.spawnRocketOnPad();

        // Tutorial hand: points at the idle rocket / launcher.
        this.hand = this.add.image(this.pivotX, this.pivotY, "hand");
        this.hand.setDepth(6);
        this.hand.setOrigin(0.5, 0.5);
        // Default size; if your png looks off, just tweak this number.
        this.hand.setScale(0.35);
        this.hand.setAlpha(1);
        this.handBobbingPhase = Math.random() * Math.PI * 2;
        // Align the hand image orientation with the "pointing" direction.
        // If the hand points slightly off, tweak this value.
        // Most "pointer" sprites are drawn facing one direction; `+PI` flips to match our rotation math.
        this.handPointerRotationOffset = Math.PI;
        // Only show the tutorial hand briefly after the page/scene renders.
        // We still update rotation while visible; once the window expires we force alpha=0.
        this.handVisibleUntilMs = this.time.now + 5000;

        // Rocket projectiles
        this.balls = this.physics.add.group({ allowGravity: false });

        // Targets (top area)
        this.targets = this.physics.add.staticGroup();
        this.targetCount = 15;
        this.spawnInitialTargets();
    }

    scaleBackground() {
        if (!this.bg) return;

        const tex = this.textures.get("background");
        const src = tex?.getSourceImage ? tex.getSourceImage() : null;
        const srcW = src?.width;
        const srcH = src?.height;

        if (!srcW || !srcH) {
            // Fallback: avoid showing blank area (may stretch)
            this.bg.setDisplaySize(this.gameW, this.gameH);
            return;
        }

        const scaleX = this.gameW / srcW;
        const scaleY = this.gameH / srcH;
        const scale = Math.max(scaleX, scaleY); // "cover"
        this.bg.setScale(scale);
    }

    update() {
        // Swing launch pad only when not firing (so direction is well-defined).
        if (!this.isFiring) {
            this.angleValue += this.direction * this.rotationSpeed;
            const minAngle = -Math.PI;
            const maxAngle = 0;
            if (this.angleValue >= maxAngle || this.angleValue <= minAngle) this.direction *= -1;
        }

        // Apply launch pad rotation around pivot (angleValue is world direction).
        if (this.launchPad) {
            this.launchPad.rotation = this.angleValue + this.launchRotationOffset;
        }
        if (this.rocketOnPad && !this.isFiring) this.syncRocketOnPadPosition();

        if (this.hand) this.syncHandPosition();

        // Extra tolerant collision check (slightest contact counts).
        this.checkRocketHits();

        // Clean up off-screen rockets
        this.balls.getChildren().forEach((b) => {
            if (!b.active) return;
            if (b.x < -50 || b.x > this.gameW + 50 || b.y < -50 || b.y > this.gameH + 50) {
                if (b.trailEmitter) b.trailEmitter.destroy();
                b.trailEmitter = null;
                b.destroy();
            }
        });

        // If the shot is done (no active projectiles), allow swing again.
        const anyActive = this.balls.getChildren().some((b) => b.active);
        if (!anyActive) {
            const wasFiring = this.isFiring;
            this.isFiring = false;
            this.pendingMultiplier = null;

            if (wasFiring && typeof window !== "undefined" && typeof window.onJavelinShotEnd === "function") {
                window.onJavelinShotEnd();
            }

            // If a shot ended and the rocket never hit any target => MISS.
            if (wasFiring && !this.rocketWasHit) {
                if (typeof window !== "undefined" && typeof window.onRocketShotMiss === "function") {
                    window.onRocketShotMiss();
                }
            }

            // Reset for next shot.
            this.rocketWasHit = false;

            if (!this.rocketOnPad) this.spawnRocketOnPad();
        }

        if (this._pendingExternalFire) {
            this._pendingExternalFireFrames += 1;
            if (this._pendingExternalFireFrames > 180) {
                this._pendingExternalFire = false;
                this._pendingExternalFireFrames = 0;
                console.warn("[GameScene] Cleared stuck pending rocket fire");
            } else if (this.fire()) {
                this._pendingExternalFire = false;
                this._pendingExternalFireFrames = 0;
            }
        } else {
            this._pendingExternalFireFrames = 0;
        }
    }

    syncHandPosition() {
        // Hide hand while projectile is flying (so it doesn't look wrong).
        if (this.isFiring) {
            this.hand.setAlpha(0);
            return;
        }

        // Hide tutorial hand after the initial window.
        if (typeof this.handVisibleUntilMs === "number" && this.time.now >= this.handVisibleUntilMs) {
            this.hand.setAlpha(0);
            return;
        }

        const pointingTarget = this.rocketOnPad ?? this.launchPad ?? null;
        if (!pointingTarget) return;

        // Keep hand near the launcher area in world coordinates,
        // then rotate it each frame to point at the rocket/launcher.
        // Place hand on the left side of the launcher (matches your reference screenshot).
        const handOffsetX = -Math.max(16, this.gameW * 0.04);
        const handOffsetY = Math.max(12, this.gameH * 0.06);

        // Tiny bob animation.
        const bob = Math.sin(this.time.now / 180 + this.handBobbingPhase) * 3;

        this.hand.x = this.pivotX + handOffsetX*2;
        this.hand.y = this.pivotY - handOffsetY + bob;
        this.hand.setAlpha(1);

        // Rotate so it points toward the rocket/launcher.
        const rot = Phaser.Math.Angle.Between(this.hand.x, this.hand.y, pointingTarget.x, pointingTarget.y);
        this.hand.rotation = rot + this.handPointerRotationOffset;
    }

    spawnRocketOnPad() {
        if (this.rocketOnPad) return;

        const angle = this.angleValue;
        const padLen = this.barrelLen * this.rocketOnPadDistanceFactor;
        const tipX = this.pivotX + padLen * Math.cos(angle);
        const tipY = this.pivotY + padLen * Math.sin(angle);

        this.rocketOnPad = this.add.image(tipX, tipY, "cannon");
        this.rocketOnPad.setOrigin(0.5, 1);
        this.rocketOnPad.setScale(0.8);
        this.rocketOnPad.setDepth(4);
        // Keep it aligned with the launcher while idle.
        const rocketRotationOffset = Math.PI / 2; // up-pointing sprite
        this.rocketOnPad.rotation = angle + rocketRotationOffset;

        // Click/tap the idle rocket to trigger the same action as the Fire button.
        this.rocketOnPad.setInteractive({ useHandCursor: true });
        this.rocketOnPad.on("pointerdown", () => {
            if (typeof window !== "undefined" && typeof window.onRocketShotBet === "function") {
                window.onRocketShotBet();
            }
        });
    }

    syncRocketOnPadPosition() {
        if (!this.rocketOnPad) return;
        const angle = this.angleValue;
        const padLen = this.barrelLen * this.rocketOnPadDistanceFactor;
        const tipX = this.pivotX + padLen * Math.cos(angle);
        const tipY = this.pivotY + padLen * Math.sin(angle);
        this.rocketOnPad.setPosition(tipX, tipY);
        // Keep it aligned with the launcher while idle.
        const rocketRotationOffset = Math.PI / 2; // up-pointing sprite
        this.rocketOnPad.rotation = angle + rocketRotationOffset;
    }

    /**
     * Called from React right after /rocket/bet returns. Tries `fire()` immediately;
     * if the scene is not ready (projectile still clearing, etc.), queues retry on the next frame.
     */
    kickReactFire() {
        this._pendingExternalFireFrames = 0;
        if (this.fire()) {
            this._pendingExternalFire = false;
            return true;
        }
        this._pendingExternalFire = true;
        return true;
    }

    // 🚀 FIRE rocket (the large rocket on the pad becomes the projectile)
    /** @returns {boolean} true if a shot actually started */
    fire() {
        // Use flying projectiles as source of truth — not `this.isFiring` alone.
        // React unlocks the Fire button from `onJavelinWin` / `onJavelinShotEnd` a frame before
        // Phaser’s `update()` clears `isFiring`, so the flag can falsely block the next shot.
        const anyProjectileActive = this.balls.getChildren().some((b) => b && b.active);
        if (anyProjectileActive) {
            return false;
        }
        this.isFiring = false;

        // Pad can be missing briefly after a shot (same frame as respawn) or if state desynced.
        if (!this.rocketOnPad) {
            this.spawnRocketOnPad();
        }
        if (!this.rocketOnPad) return false;

        // Capture the multiplier fetched from the server right before firing.
        // React sets `window.__rocketPendingMultiplier` in `handleRocketBet()`.
        if (typeof window !== "undefined") {
            this.pendingMultiplier = window.__rocketPendingMultiplier ?? null;
            window.__rocketPendingMultiplier = null;

            // Also capture win display mode + bet amount for this specific shot.
            // React sets these in `handleRocketBet()` before triggering `fireJavelin`.
            this.pendingWinMode = window.__rocketPendingWinMode ?? "multiplier";
            this.pendingBetAmount = window.__rocketPendingBetAmount ?? null;
            window.__rocketPendingWinMode = null;
            window.__rocketPendingBetAmount = null;
        } else {
            this.pendingMultiplier = null;
            this.pendingWinMode = "multiplier";
            this.pendingBetAmount = null;
        }

        const speed = this.projectileSpeed ?? 1000;
        const angle = this.angleValue;

        // New shot starts: reset hit tracking.
        this.rocketWasHit = false;
        if (typeof window !== "undefined") window.__rocketWasHit = false;

        const tipX = this.pivotX + this.barrelLen * Math.cos(angle);
        const tipY = this.pivotY + this.barrelLen * Math.sin(angle);

        // Remove the idle rocket from the pad (it becomes the projectile).
        this.rocketOnPad.destroy();
        this.rocketOnPad = null;

        // Create a NEW physics projectile using the same texture.
        const rocket = this.balls.create(tipX, tipY, "cannon");
        rocket.setOrigin(0.5, 1);
        rocket.setScale(0.8);
        rocket.rotation = angle + Math.PI / 2; // up-pointing sprite

        if (rocket.body) {
            rocket.body.setAllowGravity(false);
            rocket.body.moves = true;
            if (rocket.body.setCircle) {
                // Enlarge collision circle so a slight visual touch counts as contact.
                const r = Math.max(14, Math.min(44, rocket.displayWidth * 0.26));
                rocket.body.setCircle(r);
                rocket.hitRadius = r;
            }
            rocket.body.setVelocity(speed * Math.cos(angle), speed * Math.sin(angle));
        }

        // Fire trail
        rocket.trailEmitter = this.add.particles(rocket.x, rocket.y, "fireParticle", {
            lifespan: 260,
            speed: { min: 0, max: 20 },
            scale: { start: 0.7, end: 0 },
            alpha: { start: 0.75, end: 0 },
            blendMode: "ADD",
            frequency: 14,
        });
        rocket.trailEmitter.setDepth(3);
        if (typeof rocket.trailEmitter.startFollow === "function") {
            // Move the particle origin back to the bottom of the launch pad,
            // so the flame "touches" the pad while the rocket is leaving.
            const offX = this.pivotX - rocket.x;
            const offY = this.pivotY - rocket.y;
            rocket.trailEmitter.startFollow(rocket, offX, offY, false);
        }

        // Overlap rocket with targets.
        this.physics.add.overlap(rocket, this.targets, (b, t) => this.hitTarget(b, t), null, this);

        this.isFiring = true;
        return true;
    }

    spawnInitialTargets() {
        this.targets.clear(true, true);

        for (let i = 0; i < this.targetCount; i++) {
            this.spawnTarget(i);
        }
    }

    spawnTarget(index) {
        // Random positions/sizes in the top band with strong separation.
        // Use slot (final) coordinates for overlap checks — sprites may still be tweening from below.
        const minY = this.gameH * 0.10;
        const maxY = this.gameH * 0.38;
        const minX = this.gameW * 0.06;
        const maxX = this.gameW * 0.94;

        const placed = this.targets.getChildren().map((t) => {
            const sz = t.size || 50;
            return {
                x: typeof t.slotX === "number" ? t.slotX : t.x,
                y: typeof t.slotY === "number" ? t.slotY : t.y,
                r: sz / 2,
            };
        });

        const size = Phaser.Math.Between(36, 70);
        const rNew = size / 2;
        /** Minimum gap between circle edges (visual breathing room). */
        const gapBetween = (ra, rb) => 18 + 0.15 * (ra + rb);

        const separationOk = (px, py) =>
            placed.every((p) => {
                const dx = p.x - px;
                const dy = p.y - py;
                const dist = Math.hypot(dx, dy);
                const need = p.r + rNew + gapBetween(p.r, rNew);
                return dist >= need;
            });

        let x = Phaser.Math.Between(minX, maxX);
        let y = Phaser.Math.Between(minY, maxY);
        let found = false;
        const maxStrictTries = 320;
        for (let tries = 0; tries < maxStrictTries; tries++) {
            x = Phaser.Math.Between(minX, maxX);
            y = Phaser.Math.Between(minY, maxY);
            if (separationOk(x, y)) {
                found = true;
                break;
            }
        }

        // Fallback: pick the candidate with the largest clearance to the nearest neighbor (minimal overlap).
        if (!found) {
            let bestX = x;
            let bestY = y;
            let bestScore = -Infinity;
            const sampleTries = 140;
            for (let s = 0; s < sampleTries; s++) {
                const tx = Phaser.Math.Between(minX, maxX);
                const ty = Phaser.Math.Between(minY, maxY);
                let minEdgeSep = Infinity;
                for (const p of placed) {
                    const dist = Math.hypot(p.x - tx, p.y - ty);
                    const edgeSep = dist - (p.r + rNew);
                    minEdgeSep = Math.min(minEdgeSep, edgeSep);
                }
                if (placed.length === 0) minEdgeSep = 0;
                if (minEdgeSep > bestScore) {
                    bestScore = minEdgeSep;
                    bestX = tx;
                    bestY = ty;
                }
            }
            x = bestX;
            y = bestY;
        }

        // Use one of the 15 target images randomly.
        const textureKey = Phaser.Utils.Array.GetRandom([
            "target1",
            "target2",
            "target3",
            "target4",
            "target5",
            "target6",
            "target7",
            "target8",
            "target9",
            "target10",
            "target11",
            "target12",
            "target13",
            "target14",
            "target15",
        ]);

        // Spawn animation: target rises from below into its slot.
        const finalY = y;
        const spawnY = this.gameH + size;
        const target = this.add.image(x, spawnY, textureKey);
        target.setOrigin(0.5, 0.5);
        target.setDepth(1);
        target.setAlpha(0.9);

        // Scale sprite so it fits the collision circle.
        target.setScale(size / target.displayWidth);

        this.physics.add.existing(target, true);
        if (target.body && target.body.setCircle) {
            target.body.setCircle(size / 2);
        }

        target.size = size;
        target.hitRadius = size / 2;
        target.index = index;
        // Store normalized slot so targets can follow viewport resize.
        target.relX = this.gameW > 0 ? x / this.gameW : 0.5;
        target.relY = this.gameH > 0 ? finalY / this.gameH : 0.2;
        target.slotX = x;
        target.slotY = finalY;
        target.isSpawning = true;
        this.targets.add(target);

        this.tweens.add({
            targets: target,
            y: finalY,
            alpha: 1,
            duration: 420,
            ease: "Back.Out",
            onUpdate: () => {
                // Keep static physics body aligned while tweening.
                if (target.body) {
                    if (typeof target.body.updateFromGameObject === "function") target.body.updateFromGameObject();
                    else if (typeof target.body.refreshBody === "function") target.body.refreshBody();
                }
            },
            onComplete: () => {
                target.isSpawning = false;
                if (target.body) {
                    if (typeof target.body.updateFromGameObject === "function") target.body.updateFromGameObject();
                    else if (typeof target.body.refreshBody === "function") target.body.refreshBody();
                }
            },
        });
        return target;
    }

    relayoutTargetsForViewport() {
        if (!this.targets) return;
        const minXRatio = 0.06;
        const maxXRatio = 0.94;
        const minYRatio = 0.10;
        const maxYRatio = 0.38;

        this.targets.getChildren().forEach((target) => {
            if (!target || !target.active) return;

            // Normalize from current position if this target predates relX/relY.
            if (typeof target.relX !== "number") target.relX = this.gameW > 0 ? target.x / this.gameW : 0.5;
            if (typeof target.relY !== "number") target.relY = this.gameH > 0 ? target.y / this.gameH : 0.2;

            target.relX = Phaser.Math.Clamp(target.relX, minXRatio, maxXRatio);
            target.relY = Phaser.Math.Clamp(target.relY, minYRatio, maxYRatio);

            const nx = target.relX * this.gameW;
            const ny = target.relY * this.gameH;

            // If a spawn tween is running, cancel it and snap to new slot on resize.
            this.tweens.killTweensOf(target);
            target.setPosition(nx, ny);
            target.slotX = nx;
            target.slotY = ny;
            target.isSpawning = false;

            if (target.body) {
                if (typeof target.body.updateFromGameObject === "function") target.body.updateFromGameObject();
                else if (typeof target.body.refreshBody === "function") target.body.refreshBody();
            }
        });
    }

    checkRocketHits() {
        // Detect contact even if Arcade overlap misses.
        const rockets = this.balls.getChildren();
        const targets = this.targets.getChildren();

        for (const ball of rockets) {
            if (!ball.active) continue;
            if (ball.__rewardHandled) continue;

            const br = typeof ball.hitRadius === "number" ? ball.hitRadius : Math.max(10, ball.displayWidth * this.rocketRadiusFactor);

            for (const target of targets) {
                if (!target.active) continue;
                if (target.isSpawning) continue;

                const tr = typeof target.hitRadius === "number"
                    ? target.hitRadius
                    : (typeof target.size === "number" ? target.size * this.targetRadiusFactor : Math.max(10, target.displayWidth * this.targetRadiusFactor));

                const dx = target.x - ball.x;
                const dy = target.y - ball.y;
                const distSq = dx * dx + dy * dy;

                // Any slight touch counts as hit.
                const r = br + tr + this.hitContactBuffer;
                if (distSq <= r * r) {
                    this.hitTarget(ball, target);
                    return;
                }
            }
        }
    }

    ensureExplosionTextures() {
        if (this.textures.exists("explosionSpark")) return;
        const mk = (key, r, color, alpha = 1) => {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            const s = (r + 1) * 2;
            g.fillStyle(color, alpha);
            g.fillCircle(r + 1, r + 1, r);
            g.generateTexture(key, s, s);
            g.destroy();
        };
        mk("explosionSpark", 6, 0xffffff, 1);
        mk("explosionChunk", 4, 0xff7733, 1);
        mk("explosionEmber", 3, 0xffcc55, 0.95);
        mk("explosionDebris", 3, 0x6688aa, 1);
    }

    /**
     * Modern “planet explosion” FX: particle bursts, shockwave ring, camera shake + subtle flash.
     */
    playPlanetExplosion(x, y, targetRadius = 40) {
        const r = Math.max(18, Math.min(70, targetRadius));
        const intensity = Phaser.Math.Clamp(r / 42, 0.65, 1.35);

        // Screen punch (sci‑fi impact)
        this.cameras.main.shake(220, 0.0055 * intensity);
        this.cameras.main.flash(100, 255, 248, 220, false);

        const depth = 20;

        // Core flash — bright radial burst (ADD)
        const core = this.add.particles(x, y, "explosionSpark", {
            speed: { min: 180 * intensity, max: 520 * intensity },
            angle: { min: 0, max: 360 },
            rotate: { min: 0, max: 360 },
            scale: { start: 0.45 * intensity, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: { min: 380, max: 520 },
            blendMode: "ADD",
            tint: [0xffffff, 0xffee88, 0xffaa44, 0x66eeff, 0xff6622],
            gravityY: -20,
            emitting: false,
        });
        core.setDepth(depth);
        core.explode(Math.floor(42 * intensity), x, y);

        // Secondary sparks
        const sparks = this.add.particles(x, y, "explosionEmber", {
            speed: { min: 80 * intensity, max: 320 * intensity },
            angle: { min: 0, max: 360 },
            scale: { start: 0.55, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: { min: 400, max: 700 },
            blendMode: "ADD",
            tint: [0xffdd99, 0xff9944, 0x00d4ff],
            gravityY: 35,
            emitting: false,
        });
        sparks.setDepth(depth - 1);
        sparks.explode(Math.floor(28 * intensity), x, y);

        // Debris chunks (darker, slower)
        const debris = this.add.particles(x, y, "explosionChunk", {
            speed: { min: 40, max: 200 },
            angle: { min: 0, max: 360 },
            rotate: { min: -180, max: 180 },
            scale: { start: 0.7, end: 0 },
            alpha: { start: 0.95, end: 0 },
            lifespan: { min: 500, max: 900 },
            tint: [0x886644, 0x554433, 0x334455],
            gravityY: 55,
            emitting: false,
        });
        debris.setDepth(depth - 2);
        debris.explode(Math.floor(16 * intensity), x, y);

        const ice = this.add.particles(x, y, "explosionDebris", {
            speed: { min: 60, max: 220 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.55, end: 0 },
            alpha: { start: 0.75, end: 0 },
            lifespan: 600,
            blendMode: "ADD",
            tint: [0xffffff, 0xffee88, 0xffaa44, 0x00d4ff],
            gravityY: 0,
            emitting: false,
        });
        ice.setDepth(depth - 1);
        ice.explode(Math.floor(14 * intensity), x, y);

        // Expanding shockwave ring (vector-style)
        const ring = this.add.graphics();
        ring.setDepth(depth + 1);
        ring.lineStyle(3 + intensity, 0xffcc88, 0.85);
        ring.strokeCircle(0, 0, r * 0.6);
        ring.setPosition(x, y);
        this.tweens.add({
            targets: ring,
            scaleX: 1 + 4.5 * intensity,
            scaleY: 1 + 4.5 * intensity,
            alpha: 0,
            duration: 420,
            ease: "Cubic.Out",
            onComplete: () => ring.destroy(),
        });

        const ring2 = this.add.graphics();
        ring2.setDepth(depth);
        ring2.lineStyle(2, 0x00d4ff, 0.55);
        ring2.strokeCircle(0, 0, r * 0.45);
        ring2.setPosition(x, y);
        this.tweens.add({
            targets: ring2,
            scaleX: 1 + 5.5 * intensity,
            scaleY: 1 + 5.5 * intensity,
            alpha: 0,
            duration: 520,
            ease: "Quad.Out",
            onComplete: () => ring2.destroy(),
        });

        this.time.delayedCall(900, () => {
            [core, sparks, debris, ice].forEach((p) => {
                if (p && p.scene) p.destroy();
            });
        });
    }

    hitTarget(ball, target) {
        if (!ball.active || !target.active) return;
        if (target.isSpawning) return;
        if (ball.__rewardHandled) return;
        ball.__rewardHandled = true;

        // We detected at least a slight touch (hitTarget is called only on contact).
        this.rocketWasHit = true;
        if (typeof window !== "undefined") window.__rocketWasHit = true;

        const tr = typeof target.hitRadius === "number"
            ? target.hitRadius
            : (typeof target.size === "number" ? target.size * this.targetRadiusFactor : 28);
        this.playPlanetExplosion(target.x, target.y, tr);

        if (ball.trailEmitter) {
            ball.trailEmitter.destroy();
            ball.trailEmitter = null;
        }
        ball.destroy();

        const multiplier =
            this.pendingMultiplier !== null && this.pendingMultiplier !== undefined
                ? this.pendingMultiplier
                : Phaser.Math.Between(1, 10);
        this.pendingMultiplier = null;

        const winMode = this.pendingWinMode ?? "multiplier";
        const betAmount = this.pendingBetAmount ?? 0;
        this.pendingWinMode = null;
        this.pendingBetAmount = null;

        const formatNumber = (n) => {
            if (typeof n !== "number" || !Number.isFinite(n)) return "0";
            // Display up to 2 decimals, but trim trailing zeros for cleaner UI.
            const fixed = n.toFixed(2);
            return fixed.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
        };

        const displayText = winMode === "flat" ? `$${formatNumber(multiplier * betAmount)}` : `× ${formatNumber(multiplier)}`;
        this.showText(target.x, target.y, displayText);
        window.onJavelinWin && window.onJavelinWin(multiplier);

        // Remove target and respawn a new one after a short delay.
        const index = target.index ?? 0;
        target.destroy();
        this.time.delayedCall(450, () => {
            // Keep total targets constant: one destroyed, one spawned.
            this.spawnTarget(index);
        });

        // Rocket respawn is handled in update() once the projectile is gone.
    }

    showText(x, y, valueText) {
        const text = this.add.text(x, y, String(valueText), {
            fontSize: "32px",
            fontStyle: "bold",
            fontFamily: "Orbitron, Arial Black, sans-serif",
            color: "#00D4FF",
        });
        text.setOrigin(0.5, 0.5);

        this.tweens.add({
            targets: text,
            y: y - 45,
            alpha: 0,
            duration: 800,
            onComplete: () => text.destroy(),
        });
    }

    setDifficultyMode(mode) {
        const m = (mode || "easy").toLowerCase();
        if (m === "easy") this.rotationSpeedMultiplier = 1;
        else if (m === "normal") this.rotationSpeedMultiplier = 2;
        else if (m === "hard") this.rotationSpeedMultiplier = 2.8;
        else this.rotationSpeedMultiplier = 1;

        this.rotationSpeed = this.easyRotationSpeed * this.rotationSpeedMultiplier;

        // Keep projectile speed in sync with the same multipliers.
        this.projectileSpeedMultiplier = this.rotationSpeedMultiplier;
        this.projectileSpeed = this.easyProjectileSpeed * this.projectileSpeedMultiplier;
    }
}