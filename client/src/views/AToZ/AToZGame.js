import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import AToZScene from "./AToZScene";

export default function AToZGame() {
    const hostRef = useRef(null);
    const gameRef = useRef(null);

    useEffect(() => {
        if (!hostRef.current || gameRef.current) return;

        const parent = hostRef.current;
        const rect = parent.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width || 900));
        const h = Math.max(1, Math.round(rect.height || 560));

        const game = new Phaser.Game({
            type: Phaser.AUTO,
            width: w,
            height: h,
            parent,
            backgroundColor: "transparent",
            audio: { noAudio: true },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: w,
                height: h,
            },
            scene: [AToZScene],
        });

        gameRef.current = game;

        const resizeToParent = () => {
            if (!gameRef.current || !parent) return;
            const next = parent.getBoundingClientRect();
            const rw = Math.max(1, Math.round(next.width || w));
            const rh = Math.max(1, Math.round(next.height || h));
            try {
                gameRef.current.scale?.resize?.(rw, rh);
                gameRef.current.scale?.setGameSize?.(rw, rh);
                gameRef.current.scale?.refresh?.();
            } catch (e) {
                // no-op
            }
        };

        let ro;
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(() => requestAnimationFrame(resizeToParent));
            ro.observe(parent);
        } else {
            window.addEventListener("resize", resizeToParent);
        }

        window.spinAToZ = () => {
            const scene =
                typeof game.scene.getScene === "function"
                    ? game.scene.getScene("AToZScene")
                    : game.scene.keys?.["AToZScene"];
            if (!scene || typeof scene.spin !== "function") return false;
            return scene.spin() === true;
        };

        return () => {
            if (window.spinAToZ) window.spinAToZ = undefined;
            if (ro) ro.disconnect();
            else window.removeEventListener("resize", resizeToParent);
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    return (
        <div
            ref={hostRef}
            style={{
                width: "100%",
                height: "100%",
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                borderRadius: "10px",
            }}
        />
    );
}

