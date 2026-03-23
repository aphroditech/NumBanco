import Phaser from "phaser";

/** Reel symbols: 0–9 (10 symbols per reel strip) */
const DIGITS = "0123456789".split("");

/** Exactly 3 visible rows per column: top / middle / bottom */
const VISIBLE_ROWS = 3;

export default class AToZScene extends Phaser.Scene {
    constructor() {
        super("AToZScene");
    }

    create() {
        const { width, height } = this.scale;
        this.gameW = width;
        this.gameH = height;

        this.reelCount = 3;
        this.windowRows = VISIBLE_ROWS;
        // Large, readable reels: ~60–70% of the playfield (matches “fill the stage” layout).
        this.reelGap = Math.min(28, Math.max(12, Math.round(width * 0.022)));
        const framePadding = 28; // matches stroke box inset below
        const targetBandW = width * 0.72;
        // Never wider than the canvas; no fixed floor that breaks narrow phones.
        const innerColsW = Math.min(targetBandW - framePadding, width - 36);
        this.reelW = Math.floor((innerColsW - (this.reelCount - 1) * this.reelGap) / this.reelCount);
        this.reelW = Math.max(48, this.reelW);

        this.windowH = Math.round(height * 0.62);
        this.cellH = Math.round(this.windowH / this.windowRows);
        this.windowH = this.cellH * this.windowRows; // keep integer multiple for crisp layout

        this.centerLineY = height * 0.5;
        this.reels = [];
        this.isSpinning = false;
        this.pendingResult = null;

        // Modern dark stage
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x05080c, 0x05080c, 0x0c1219, 0x0c1219, 1);
        bg.fillRect(0, 0, width, height);
        bg.setDepth(-5);

        const gridW = this.reelCount * this.reelW + (this.reelCount - 1) * this.reelGap + 28;
        const gridH = this.windowH + 36;
        const frame = this.add.graphics();
        frame.lineStyle(2, 0x00d4ff, 0.35);
        frame.strokeRoundedRect((width - gridW) / 2, this.centerLineY - gridH / 2, gridW, gridH, 16);
        frame.fillStyle(0x0a1018, 0.92);
        frame.fillRoundedRect((width - gridW) / 2, this.centerLineY - gridH / 2, gridW, gridH, 16);
        frame.setDepth(-2);

        // Subtle inner glow on middle row (win line)
        const midGlow = this.add.graphics();
        const gx = (width - gridW) / 2 + 14;
        const gy = this.centerLineY - this.windowH / 2 + this.cellH;
        midGlow.fillStyle(0x00d4ff, 0.07);
        midGlow.fillRoundedRect(gx, gy, gridW - 28, this.cellH, 8);
        midGlow.setDepth(-1);

        // Horizontal row separators (3-row slot look)
        const sep = this.add.graphics();
        sep.lineStyle(1, 0xffffff, 0.06);
        const sepLeft = (width - gridW) / 2 + 14;
        const sepRight = sepLeft + gridW - 28;
        const winTop = this.centerLineY - this.windowH / 2;
        sep.lineBetween(sepLeft, winTop + this.cellH, sepRight, winTop + this.cellH);
        sep.lineBetween(sepLeft, winTop + this.cellH * 2, sepRight, winTop + this.cellH * 2);
        sep.setDepth(3);

        // Vertical column dividers
        const totalInnerW = this.reelCount * this.reelW + (this.reelCount - 1) * this.reelGap;
        const gridLeft = (width - totalInnerW) / 2;
        const winTop2 = this.centerLineY - this.windowH / 2;
        for (let c = 1; c < this.reelCount; c += 1) {
            const vx = gridLeft + c * this.reelW + (c - 1) * this.reelGap + this.reelGap / 2;
            sep.lineBetween(vx, winTop2, vx, winTop2 + this.windowH);
        }

        this.addCenterGuide();
        this.createReels();

        this.scale.on("resize", (size) => {
            this.gameW = size.width;
            this.gameH = size.height;
        });
    }

    addCenterGuide() {
        const totalInnerW = this.reelCount * this.reelW + (this.reelCount - 1) * this.reelGap;
        const left = (this.gameW - totalInnerW) / 2;
        const y = this.centerLineY - this.windowH / 2 + this.cellH + this.cellH / 2;
        const g = this.add.graphics();
        g.lineStyle(2, 0x00d4ff, 0.55);
        g.lineBetween(left - 6, y, left + totalInnerW + 6, y);
        g.setDepth(4);
    }

    /**
     * Digit centers at (i + 0.5) * cellH in container space.
     * Middle visible row center = topY + 1.5 * cellH (row index 1).
     */
    createReels() {
        const totalW = this.reelCount * this.reelW + (this.reelCount - 1) * this.reelGap;
        const startX = (this.gameW - totalW) / 2 + this.reelW / 2;
        const topY = this.centerLineY - this.windowH / 2;
        const loopLen = DIGITS.length * this.cellH;

        for (let r = 0; r < this.reelCount; r += 1) {
            const x = startX + r * (this.reelW + this.reelGap);

            const panel = this.add.rectangle(x, this.centerLineY, this.reelW, this.windowH, 0x000000, 0.25)
                .setStrokeStyle(1, 0x1e2a33, 0.9)
                .setDepth(0);

            const maskRect = this.add.rectangle(x, this.centerLineY, this.reelW, this.windowH, 0xffffff, 1).setVisible(false);
            const mask = maskRect.createGeometryMask();

            const container = this.add.container(x - this.reelW / 2, topY);
            container.setMask(mask);
            container.setDepth(2);

            const digitTexts = [];
            const totalCells = DIGITS.length * 3;
            for (let i = 0; i < totalCells; i += 1) {
                const digit = DIGITS[i % DIGITS.length];
                const cy = (i + 0.5) * this.cellH;
                const t = this.add.text(this.reelW / 2, cy, digit, {
                    fontFamily: "Orbitron, system-ui, Arial Black, sans-serif",
                    fontSize: `${Math.round(this.cellH * 0.62)}px`,
                    color: "#EAF7FF",
                    fontStyle: "bold",
                    stroke: "#061018",
                    strokeThickness: 5,
                }).setOrigin(0.5, 0.5);
                container.add(t);
                digitTexts.push(t);
            }

            container.y = topY - loopLen;

            this.reels.push({
                panel,
                container,
                letterTexts: digitTexts,
                topY,
                loopLen,
                speed: 0,
                spinning: false,
                stopTween: null,
            });
        }
    }

    /** Fade top/bottom row digits; emphasize middle row (slot-machine clarity). */
    updateLetterStyles(reel) {
        const { container, topY, letterTexts: digitTexts } = reel;
        const midCenterWorld = topY + 1.5 * this.cellH;

        for (let i = 0; i < digitTexts.length; i += 1) {
            const t = digitTexts[i];
            const worldY = container.y + (i + 0.5) * this.cellH;
            const dist = Math.abs(worldY - midCenterWorld);

            if (dist < this.cellH * 0.38) {
                t.setAlpha(1);
                t.setScale(1.06);
                t.setStyle({
                    color: "#ffffff",
                    stroke: "#00d4ff",
                    strokeThickness: 4,
                });
            } else if (dist < this.cellH * 1.15) {
                t.setAlpha(0.38);
                t.setScale(0.74);
                t.setStyle({
                    color: "#8aa0b4",
                    stroke: "#0a1218",
                    strokeThickness: 3,
                });
            } else {
                t.setAlpha(0.22);
                t.setScale(0.68);
                t.setStyle({
                    color: "#5c6b7a",
                    stroke: "#0a1218",
                    strokeThickness: 2,
                });
            }
        }
    }

    update(_, delta) {
        for (const reel of this.reels) {
            if (reel.spinning) {
                reel.container.y += reel.speed * (delta / 1000);
                while (reel.container.y >= reel.topY) reel.container.y -= reel.loopLen;
                while (reel.container.y < reel.topY - reel.loopLen) reel.container.y += reel.loopLen;
            }
            this.updateLetterStyles(reel);
        }
    }

    spin() {
        if (this.isSpinning) return false;
        this.isSpinning = true;

        let targetIndexes;
        const reelStr =
            typeof window !== "undefined" &&
            typeof window.__atozReelResult === "string" &&
            /^[0-9]{3}$/.test(window.__atozReelResult)
                ? window.__atozReelResult
                : null;
        if (typeof window !== "undefined") window.__atozReelResult = null;

        if (reelStr) {
            targetIndexes = reelStr.split("").map((c) => parseInt(c, 10));
        } else {
            targetIndexes = Array.from({ length: this.reelCount }, () => Phaser.Math.Between(0, 9));
        }
        const resultLetters = targetIndexes.map((i) => DIGITS[i]);

        this.reels.forEach((reel, i) => {
            reel.spinning = true;
            reel.speed = 2200 + i * 220;
            if (reel.stopTween) reel.stopTween.stop();
        });

        this.time.delayedCall(850, () => this.stopReel(0, targetIndexes[0]));
        this.time.delayedCall(1280, () => this.stopReel(1, targetIndexes[1]));
        this.time.delayedCall(1720, () => {
            this.stopReel(2, targetIndexes[2], () => {
                this.isSpinning = false;
                const bet = Number(window.__atozBetAmount || 0);
                const word = resultLetters.join("");

                const pickStr =
                    typeof window.__atozPick === "string" ? window.__atozPick : "000";
                const pickNum =
                    typeof window.__atozPickNumber === "number" && Number.isFinite(window.__atozPickNumber)
                        ? window.__atozPickNumber
                        : 0;
                const pickDigitsArr = Array.isArray(window.__atozPickDigits)
                    ? [...window.__atozPickDigits]
                    : [0, 0, 0];

                // Win/loss and multiplier are computed on the backend; UI sends bet, user pick, and reel draw.
                this.pendingResult = {
                    betAmount: bet,
                    word,
                    letters: resultLetters,
                    pick: pickStr,
                    pickNumber: pickNum,
                    pickDigits: pickDigitsArr,
                };

                if (typeof window.onAToZSpinComplete === "function") {
                    window.onAToZSpinComplete(this.pendingResult);
                }
            });
        });

        return true;
    }

    stopReel(reelIndex, targetIndex, onDone) {
        const reel = this.reels[reelIndex];
        if (!reel) return;

        const midCycleIndex = DIGITS.length + targetIndex;
        const targetYBase = reel.topY + 1.5 * this.cellH - (midCycleIndex + 0.5) * this.cellH;

        const candidates = [
            targetYBase - reel.loopLen,
            targetYBase,
            targetYBase + reel.loopLen,
        ];
        let targetY = candidates[0];
        let bestDist = Math.abs(reel.container.y - targetY);
        for (const c of candidates) {
            const d = Math.abs(reel.container.y - c);
            if (d < bestDist) {
                bestDist = d;
                targetY = c;
            }
        }

        reel.stopTween = this.tweens.add({
            targets: reel.container,
            y: targetY,
            duration: 620,
            ease: "Back.Out",
            easeParams: [1.05],
            onComplete: () => {
                reel.spinning = false;
                reel.speed = 0;
                reel.container.y = targetY;
                if (onDone) onDone();
            },
        });
    }
}
