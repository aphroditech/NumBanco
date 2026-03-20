import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import GameScene from "./GameScene"; // make sure path is correct
import { rocketShotResult } from "action/RocketActions";

export default function JavelinGame({ onWin, mode }) {
    const gameRef = useRef(null);
    const gameInstance = useRef(null);

    useEffect(() => {
        // Prevent multiple instances
        if (gameInstance.current) return;
        if (!gameRef.current) return;

        const parentEl = gameRef.current;
        const w = parentEl.clientWidth || 800;
        const h = parentEl.clientHeight || 600;

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

        // 🔗 Connect React → Phaser (fire javelin)
        // Returns whether Phaser actually started a shot (React unlocks UI if false).
        window.fireJavelin = () => {
            if (!game || !game.scene) return false;
            const scene =
                typeof game.scene.getScene === "function"
                    ? game.scene.getScene("GameScene")
                    : game.scene.keys?.["GameScene"];
            if (!scene || typeof scene.fire !== "function") return false;
            return scene.fire() === true;
        };

        // 🔗 Connect Phaser → React (win callback) only when provided (don't clobber page globals).
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
                minHeight: "600px",
                overflow: "hidden",
            }}
        />
    );
}