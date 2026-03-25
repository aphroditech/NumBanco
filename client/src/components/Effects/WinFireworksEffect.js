import React, { useEffect, useMemo, useState, useRef } from "react";
import ReactDOM from "react-dom";

function WinFireworksEffect({
    isVisible,
    totalEarn,
    width,
    height,
    duration = 1200,
    zIndex = 9999,
    /** Optional line under the main amount (e.g. total multiplier). */
    subtitle,
    /** Optional viewport-space anchor rect: effect centers within this box. */
    anchorRect
}) {
    if (!isVisible) return null;
    if (typeof document === "undefined") return null;

    const [viewport, setViewport] = useState({
        w: window.innerWidth,
        h: window.innerHeight
    });
    const isMountedRef = useRef(true);
    const isVisibleRef = useRef(isVisible);

    // Keep isVisibleRef in sync with isVisible prop
    useEffect(() => {
        isVisibleRef.current = isVisible;
    }, [isVisible]);

    useEffect(() => {
        isMountedRef.current = true;
        
        const onResize = () => {
            // Only update state if component is still mounted and visible
            if (isMountedRef.current && isVisibleRef.current) {
                setViewport({ w: window.innerWidth, h: window.innerHeight });
            }
        };
        window.addEventListener("resize", onResize);
        
        return () => {
            isMountedRef.current = false;
            window.removeEventListener("resize", onResize);
        };
    }, []);

    const fwWidth = width || viewport.w;
    const fwHeight = height || viewport.h;
    const burstSparks = useMemo(() => {
        const count = 140;
        return Array.from({ length: count }, () => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 180 + Math.random() * 220;
            const hue = 175 + Math.random() * 70;
            return {
                angle,
                distance,
                size: 2.2 + Math.random() * 3,
                delay: Math.random() * 80,
                duration: 900 + Math.random() * 600,
                hue
            };
        });
    }, [isVisible]);

    const burstSparksSecond = useMemo(() => {
        const count = 95;
        return Array.from({ length: count }, () => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 120 + Math.random() * 160;
            const hue = 175 + Math.random() * 70;
            return {
                angle,
                distance,
                size: 1.6 + Math.random() * 2.4,
                delay: 160 + Math.random() * 120,
                duration: 700 + Math.random() * 500,
                hue
            };
        });
    }, [isVisible]);

    const microSparks = useMemo(() => {
        const count = 180;
        return Array.from({ length: count }, () => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 80 + Math.random() * 120;
            const hue = 175 + Math.random() * 70;
            return {
                angle,
                distance,
                size: 1 + Math.random() * 1.8,
                delay: 60 + Math.random() * 120,
                duration: 500 + Math.random() * 350,
                hue
            };
        });
    }, [isVisible]);

    const content = (
        <div style={{
            position: "fixed",
            inset: 0,
            zIndex,
            pointerEvents: "none",
        }}>
            <div style={{
                position: "absolute",
                left: anchorRect?.left ?? 0,
                top: anchorRect?.top ?? 0,
                width: anchorRect?.width ?? "100vw",
                height: anchorRect?.height ?? "100vh",
                "--effect-duration": `${duration}ms`
            }}>
                <div className="win-glow" />
                <div className="win-burst">
                    {burstSparks.map((spark, idx) => {
                        const tx = Math.cos(spark.angle) * spark.distance;
                        const ty = Math.sin(spark.angle) * spark.distance;
                        return (
                            <span
                                className="spark"
                                key={`burst-${idx}`}
                                style={{
                                    "--tx": `${tx}px`,
                                    "--ty": `${ty}px`,
                                    "--spark-size": `${spark.size}px`,
                                    "--spark-delay": `${spark.delay}ms`,
                                    "--spark-duration": `${spark.duration}ms`,
                                    "--spark-hue": spark.hue
                                }}
                            />
                        );
                    })}
                    {burstSparksSecond.map((spark, idx) => {
                        const tx = Math.cos(spark.angle) * spark.distance;
                        const ty = Math.sin(spark.angle) * spark.distance;
                        return (
                            <span
                                className="spark spark-secondary"
                                key={`burst2-${idx}`}
                                style={{
                                    "--tx": `${tx}px`,
                                    "--ty": `${ty}px`,
                                    "--spark-size": `${spark.size}px`,
                                    "--spark-delay": `${spark.delay}ms`,
                                    "--spark-duration": `${spark.duration}ms`,
                                    "--spark-hue": spark.hue
                                }}
                            />
                        );
                    })}
                    {microSparks.map((spark, idx) => {
                        const tx = Math.cos(spark.angle) * spark.distance;
                        const ty = Math.sin(spark.angle) * spark.distance;
                        return (
                            <span
                                className="spark spark-micro"
                                key={`micro-${idx}`}
                                style={{
                                    "--tx": `${tx}px`,
                                    "--ty": `${ty}px`,
                                    "--spark-size": `${spark.size}px`,
                                    "--spark-delay": `${spark.delay}ms`,
                                    "--spark-duration": `${spark.duration}ms`,
                                    "--spark-hue": spark.hue
                                }}
                            />
                        );
                    })}
                </div>
                <div style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    pointerEvents: "none"
                }}>
                    <div className="earn-neon">
                        ${totalEarn}
                    </div>
                    {subtitle ? (
                        <div className="earn-subtitle">{subtitle}</div>
                    ) : null}
                </div>
                <style>{`
                // .win-glow {
                //     position: absolute;
                //     left: 50%;
                //     top: 50%;
                //     width: 420px;
                //     height: 420px;
                //     transform: translate(-50%, -50%);
                //     background: radial-gradient(circle, rgba(0,212,255,0.35) 0%, rgba(0,212,255,0.08) 45%, rgba(0,0,0,0) 70%);
                //     filter: blur(2px);
                //     animation: glowBurst var(--effect-duration) ease-out 1;
                // }

                .win-burst .spark {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: var(--spark-size);
                    height: var(--spark-size);
                    border-radius: 50%;
                    background: hsl(var(--spark-hue) 100% 70%);
                    box-shadow:
                        0 0 6px rgba(255,255,255,0.9),
                        0 0 12px rgba(0,212,255,0.7);
                    transform: translate(-50%, -50%) translate(0, 0) scale(0.5);
                    opacity: 0;
                    animation: sparkFly var(--spark-duration) ease-out var(--spark-delay) 1 forwards;
                }

                .win-burst .spark-secondary {
                    filter: blur(0.5px);
                    opacity: 0;
                }

                .win-burst .spark-micro {
                    box-shadow: 0 0 6px rgba(0,212,255,0.8);
                }

                .earn-neon {
                    /* beautiful: hot-pink / magenta gradient */
                    color: #ffd6f2; /* fallback */
                    background: linear-gradient(180deg, #ffe6f7 0%, #ff8fd6 30%, #ff2db2 55%, #c500ff 80%, #ffe6f7 100%);
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-weight: 800;
                    font-size: 88px;
                    letter-spacing: 0.4px;
                    text-transform: none;
                    text-shadow:
                        0 0 10px rgba(255,255,255,0.35),
                        0 0 18px rgba(255,45,178,0.85),
                        0 0 42px rgba(197,0,255,0.55),
                        0 0 90px rgba(255,45,178,0.38);
                    -webkit-text-stroke: 0.55px rgba(255,220,245,0.45);
                    filter: drop-shadow(0 0 18px rgba(255,45,178,0.45));
                    transform-origin: 50% 50%;
                    animation: earnPop 1.6s ease-out both;
                    will-change: transform, opacity;
                }

                .earn-subtitle {
                    margin-top: 14px;
                    font-size: clamp(16px, 3.5vw, 24px);
                    font-weight: 700;
                    color: rgba(0, 212, 255, 0.98);
                    text-shadow:
                        0 0 10px rgba(0, 212, 255, 0.55),
                        0 0 22px rgba(0, 212, 255, 0.35);
                    letter-spacing: 0.04em;
                    animation: subtitleIn 0.85s ease-out 0.15s both;
                }

                @keyframes subtitleIn {
                    0% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }

                @keyframes earnPop {
                    0% { opacity: 0; transform: scale(0.7) translateY(12px); }
                    80% { opacity: 1; transform: scale(1.08) translateY(-6px); }
                    100% { opacity: 0; transform: scale(1.12) translateY(-6px); }
                }

                @keyframes sparkFly {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
                    20% { opacity: 1; }
                    65% { opacity: 0.9; }
                    100% { opacity: 0; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1); }
                }

            `}</style>
            </div>
        </div>
    );

    return ReactDOM.createPortal(content, document.body);
}

export default WinFireworksEffect;
