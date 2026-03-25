import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import GameScene from "./GameScene"; // make sure path is correct

export default function JavelinGame({ onWin, mode }) {
    const gameRef = useRef(null);
    const gameInstance = useRef(null);

    useEffect(() => {
        // Prevent multiple instances
        if (gameInstance.current) return;
        if (!gameRef.current) return;

        const parentEl = gameRef.current;
        const rect0 = parentEl.getBoundingClientRect();
        let w = rect0.width || parentEl.clientWidth || 800;
        let h = rect0.height || parentEl.clientHeight || 600;
        // Avoid invalid Phaser sizes when layout hasn't settled yet.
        w = Math.max(1, Math.round(w));
        h = Math.max(1, Math.round(h));

        const config = {
            type: Phaser.AUTO,
            width: w,
            height: h,
            parent: parentEl,
            backgroundColor: "transparent",
        
            // 🔥 ADD THIS
            audio: {
                noAudio: true
            },
        
            physics: {
                default: "arcade",
                arcade: {
                    gravity: { y: 0 },
                    debug: false,
                },
            },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: w,
                height: h,
            },
        
            scene: [GameScene],
        };

        // Create game
        const game = new Phaser.Game(config);
        gameInstance.current = game;

        // Keep canvas responsive to container size changes.
        // GameScene already listens to `this.scale.on("resize")` to reposition elements.
        let rafId = null;
        const resizeToContainer = () => {
            if (!gameInstance.current) return;
            const rect = parentEl.getBoundingClientRect();
            const nextW = Math.max(1, Math.round(rect.width));
            const nextH = Math.max(1, Math.round(rect.height));
            if (nextW === w && nextH === h) return;
            w = nextW;
            h = nextH;
            // Phaser supports multiple resize methods depending on version/config.
            // Call the common ones defensively.
            try {
                if (gameInstance.current.scale && typeof gameInstance.current.scale.resize === "function") {
                    gameInstance.current.scale.resize(nextW, nextH);
                }
            } catch (e) {
                // ignore
            }
            try {
                if (gameInstance.current.scale && typeof gameInstance.current.scale.setGameSize === "function") {
                    gameInstance.current.scale.setGameSize(nextW, nextH);
                }
            } catch (e) {
                // ignore
            }
            try {
                if (gameInstance.current.scale && typeof gameInstance.current.scale.refresh === "function") {
                    gameInstance.current.scale.refresh();
                }
            } catch (e) {
                // ignore
            }
        };

        const scheduleResize = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(resizeToContainer);
        };

        let resizeObserver;
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => scheduleResize());
            resizeObserver.observe(parentEl);
        } else {
            window.addEventListener("resize", scheduleResize);
        }

        // Do an extra resize on the next frame to catch "initial layout" timing.
        scheduleResize();

        // 🔗 Connect React → Phaser (fire rocket)
        // Returns whether Phaser actually started a shot (React unlocks UI if false).
        window.fireJavelin = () => {
            if (!game || !game.scene) return false;
            const scene =
                typeof game.scene.getScene === "function"
                    ? game.scene.getScene("GameScene")
                    : game.scene.keys?.["GameScene"];
            if (!scene || typeof scene.kickReactFire !== "function") return false;
            return scene.kickReactFire() === true;
        };

        // Win callback: only wire when parent passes onWin (RocketShot sets window.onJavelinWin in useEffect).
        let winHandler;
        if (typeof onWin === "function") {
            winHandler = (value) => onWin(value);
            window.onJavelinWin = winHandler;
        }

        // Cleanup
        return () => {
            if (typeof window !== "undefined") {
                if (window.fireJavelin) window.fireJavelin = undefined;
                if (winHandler && window.onJavelinWin === winHandler) window.onJavelinWin = undefined;
            }
            if (rafId) cancelAnimationFrame(rafId);
            if (resizeObserver) resizeObserver.disconnect();
            else window.removeEventListener("resize", scheduleResize);
            if (gameInstance.current) {
                gameInstance.current.destroy(true);
                gameInstance.current = null;
            }
        };
    }, [onWin]);

    // Push difficulty mode into the Phaser scene.
    useEffect(() => {
        if (!gameInstance.current) return;
        const scene =
            gameInstance.current.scene && typeof gameInstance.current.scene.getScene === "function"
                ? gameInstance.current.scene.getScene("GameScene")
                : gameInstance.current.scene?.keys?.["GameScene"];
        if (scene && typeof scene.setDifficultyMode === "function") {
            scene.setDifficultyMode(mode);
        }
    }, [mode]);

    return (
        <div
            ref={gameRef}
            style={{
                borderRadius: "10px",
                width: "100%",
                height: "100%",
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
            }}
        />
    );
}