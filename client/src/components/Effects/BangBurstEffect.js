import React, { useMemo } from "react";
import ReactDOM from "react-dom";

/**
 * Short impact burst when Alpha Tree (or similar) ends on a zero / bust.
 * Mirrors WinFireworksEffect: portal, optional anchorRect on main game card.
 */
function BangBurstEffect({
    isVisible,
    zIndex = 9998,
    duration = 950,
    anchorRect,
}) {
    if (!isVisible) return null;
    if (typeof document === "undefined") return null;

    const shards = useMemo(() => {
        const count = 72;
        return Array.from({ length: count }, () => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 90 + Math.random() * 280;
            const hue = Math.random() < 0.55 ? 0 + Math.random() * 35 : 20 + Math.random() * 25;
            return {
                angle,
                distance,
                size: 3 + Math.random() * 7,
                delay: Math.random() * 40,
                flyMs: 420 + Math.random() * 380,
                hue,
                rot: (Math.random() - 0.5) * 720,
            };
        });
    }, [isVisible]);

    const rings = [0, 1, 2];

    const content = (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex,
                pointerEvents: "none",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    left: anchorRect?.left ?? 0,
                    top: anchorRect?.top ?? 0,
                    width: anchorRect?.width ?? "100vw",
                    height: anchorRect?.height ?? "100vh",
                    overflow: "hidden",
                    "--bang-duration": `${duration}ms`,
                }}
            >
                <div className="bang-flash" />
                {rings.map((i) => (
                    <div key={`ring-${i}`} className={`bang-ring bang-ring-${i}`} />
                ))}
                <div className="bang-burst">
                    {shards.map((s, idx) => {
                        const tx = Math.cos(s.angle) * s.distance;
                        const ty = Math.sin(s.angle) * s.distance;
                        return (
                            <span
                                className="bang-shard"
                                key={`shard-${idx}`}
                                style={{
                                    "--tx": `${tx}px`,
                                    "--ty": `${ty}px`,
                                    "--sz": `${s.size}px`,
                                    "--delay": `${s.delay}ms`,
                                    "--fly": `${s.flyMs}ms`,
                                    "--hue": s.hue,
                                    "--rot": `${s.rot}deg`,
                                }}
                            />
                        );
                    })}
                </div>
                <div className="bang-label-wrap">
                    <div className="bang-label">BANG!</div>
                </div>
                <style>{`
                    .bang-flash {
                        position: absolute;
                        inset: 0;
                        background: radial-gradient(
                            circle at 50% 50%,
                            rgba(255, 240, 200, 0.55) 0%,
                            rgba(255, 80, 0, 0.2) 35%,
                            rgba(0, 0, 0, 0) 65%
                        );
                        animation: bangFlash var(--bang-duration) ease-out 1 forwards;
                        pointer-events: none;
                    }
                    .bang-ring {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        width: 40px;
                        height: 40px;
                        margin-left: -20px;
                        margin-top: -20px;
                        border-radius: 50%;
                        border: 3px solid rgba(255, 200, 80, 0.85);
                        box-shadow:
                            0 0 20px rgba(255, 100, 0, 0.6),
                            inset 0 0 12px rgba(255, 220, 120, 0.4);
                        opacity: 0;
                        animation: bangRingExpand var(--bang-duration) ease-out 1 forwards;
                    }
                    .bang-ring-0 { animation-delay: 0ms; }
                    .bang-ring-1 { animation-delay: 45ms; border-color: rgba(255, 140, 40, 0.7); }
                    .bang-ring-2 { animation-delay: 90ms; border-color: rgba(200, 60, 20, 0.5); }
                    .bang-burst .bang-shard {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        width: var(--sz);
                        height: calc(var(--sz) * 0.45);
                        border-radius: 2px;
                        background: linear-gradient(
                            90deg,
                            hsl(var(--hue) 95% 18%) 0%,
                            hsl(var(--hue) 90% 42%) 50%,
                            hsl(var(--hue) 85% 28%) 100%
                        );
                        box-shadow:
                            0 0 6px rgba(255, 80, 0, 0.7),
                            0 0 2px rgba(0, 0, 0, 0.9);
                        transform: translate(-50%, -50%) rotate(0deg) scale(1);
                        opacity: 0;
                        animation: bangShard var(--fly) ease-out var(--delay) 1 forwards;
                    }
                    .bang-label-wrap {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        text-align: center;
                    }
                    .bang-label {
                        font-family: Impact, "Arial Black", sans-serif;
                        font-size: clamp(52px, 14vw, 120px);
                        font-weight: 900;
                        letter-spacing: 0.06em;
                        line-height: 1;
                        color: #1a0a00;
                        text-shadow:
                            3px 3px 0 #ff6b00,
                            -1px -1px 0 #fff8e0,
                            0 0 24px rgba(255, 140, 0, 0.95),
                            0 0 48px rgba(255, 60, 0, 0.6);
                        -webkit-text-stroke: 2px rgba(40, 10, 0, 0.85);
                        transform-origin: 50% 50%;
                        animation: bangWord var(--bang-duration) cubic-bezier(0.22, 1, 0.36, 1) 1 both;
                    }
                    @keyframes bangFlash {
                        0% { opacity: 1; }
                        35% { opacity: 0.85; }
                        100% { opacity: 0; }
                    }
                    @keyframes bangRingExpand {
                        0% {
                            opacity: 0.95;
                            transform: scale(0.15);
                        }
                        100% {
                            opacity: 0;
                            transform: scale(18);
                        }
                    }
                    @keyframes bangShard {
                        0% {
                            opacity: 0;
                            transform: translate(-50%, -50%) rotate(0deg) scale(0.3);
                        }
                        12% { opacity: 1; }
                        100% {
                            opacity: 0;
                            transform: translate(
                                    calc(-50% + var(--tx)),
                                    calc(-50% + var(--ty))
                                )
                                rotate(var(--rot)) scale(0.2);
                        }
                    }
                    @keyframes bangWord {
                        0% {
                            opacity: 0;
                            transform: scale(0.2) rotate(-8deg);
                        }
                        18% {
                            opacity: 1;
                            transform: scale(1.15) rotate(4deg);
                        }
                        42% {
                            transform: scale(1) rotate(-2deg);
                        }
                        70% {
                            opacity: 1;
                            transform: scale(1.05) rotate(1deg);
                        }
                        100% {
                            opacity: 0;
                            transform: scale(1.2) rotate(0deg);
                        }
                    }
                `}</style>
            </div>
        </div>
    );

    return ReactDOM.createPortal(content, document.body);
}

export default BangBurstEffect;
