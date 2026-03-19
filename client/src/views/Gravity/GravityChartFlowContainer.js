import React, { useState, useEffect, useRef, useMemo } from "react";
import GravityUltimateChartCanvas from "./GravityUltimateChartCanvas";

const BETTING_SECONDS = 10;
const TRADING_SECONDS = 5;
const TOTAL_SECONDS = BETTING_SECONDS + TRADING_SECONDS;

const DISPLAY_STEP = 0.05;
const RENDER_FPS = 20;
/** Exponent > 1 makes the graph flow slower (reveal less early, catch up at end). */
const FLOW_EASING_EXPONENT = 1.25;
/** During trading phase only: exponent > 1 makes the last 5s of graph flow a little slower. */
const TRADING_FLOW_EASING_EXPONENT = 1.3;

function interpolateAtTime(gd, t) {
    
    if (!gd || gd.length === 0) return null;
    
    const time = (p) => p.time ?? 0;
    
    if (t <= time(gd[0])) return { time: t, price: gd[0].value };
    
    if (t >= time(gd[gd.length - 1]))
        return { time: t, price: gd[gd.length - 1].value };
    
    for (let i = 0; i < gd.length - 1; i++) {
        
        const t0 = time(gd[i]);
        const t1 = time(gd[i + 1]);
        
        if (t >= t0 && t <= t1) {
            
            const frac = (t - t0) / (t1 - t0);
            
            const price =
            gd[i].value + frac * (gd[i + 1].value - gd[i].value);
            
            return { time: t, price };
        }
    }
    
    return { time: t, price: gd[gd.length - 1].value };
}

export default function GravityChartFlowContainer({
    serverRound,
    roundPhase,
    phaseEndAtMs,
    startValue,
    formatTime,
    tradingStartTime,
    tradingEndTime,
    currentRoundId,
    lastServerTimeMsRef,
    lastClientReceiveTimeMsRef,
}) {
    
    const [flowDisplaySec, setFlowDisplaySec] = useState(0);
    const previousGraphData =
      serverRound?.previousGraphData ?? [];

    const lastRenderRef = useRef(0);
    const rafRef = useRef(null);
    const phaseEndAtMsRef = useRef(phaseEndAtMs);
    const roundPhaseRef = useRef(roundPhase);
    const roundIdRef = useRef(serverRound?.roundId);
    const fixedThresholdRef = useRef(null);

    phaseEndAtMsRef.current = phaseEndAtMs;
    roundPhaseRef.current = roundPhase;

    if (serverRound?.roundId !== roundIdRef.current) {
        roundIdRef.current = serverRound?.roundId ?? null;
        fixedThresholdRef.current = null;
    }

  /* When round changes (no key on Card), reset flow so new round starts from 0 */
  useEffect(() => {
    setFlowDisplaySec(0);
  }, [serverRound?.roundId]);

  /* When in result phase (e.g. after refresh), show full graph immediately so it remains visible */
  useEffect(() => {
    if (roundPhase === "result" && (serverRound?.graphData?.length ?? 0) > 0) {
      setFlowDisplaySec(TOTAL_SECONDS);
    }
  }, [roundPhase, serverRound?.graphData?.length]);

  /**
   * RAF LOOP
   */
  useEffect(() => {

    const tick = () => {

        const phaseEndAtMs = phaseEndAtMsRef.current;
        const roundPhase = roundPhaseRef.current;

        if (!phaseEndAtMs && roundPhase !== "result") {
            rafRef.current = requestAnimationFrame(tick);
            return;
        }

        const now = Date.now();
        const serverMs = lastServerTimeMsRef?.current;
        const clientReceiveMs = lastClientReceiveTimeMsRef?.current;
        const useServerTime = typeof serverMs === "number" && typeof clientReceiveMs === "number";
        const remainingMs = useServerTime
            ? (phaseEndAtMs - serverMs) - (now - clientReceiveMs)
            : phaseEndAtMs - now;

        let elapsed;

        if (roundPhase === "betting") {

            elapsed = (BETTING_SECONDS * 1000 - remainingMs) / 1000;

        } else if (roundPhase === "trading") {

            elapsed = BETTING_SECONDS + (TRADING_SECONDS * 1000 - remainingMs) / 1000;

        } else {

            elapsed = TOTAL_SECONDS;

        }

        const clamped =
            Math.max(0, Math.min(elapsed, TOTAL_SECONDS));

        let flowSec;
        if (roundPhase === "trading" && clamped > BETTING_SECONDS) {
            const tradingProgress = (clamped - BETTING_SECONDS) / TRADING_SECONDS;
            const easedTrading = Math.pow(tradingProgress, TRADING_FLOW_EASING_EXPONENT);
            flowSec = BETTING_SECONDS + TRADING_SECONDS * easedTrading;
        } else {
            const progress = clamped / TOTAL_SECONDS;
            const easedProgress = progress <= 0 ? 0 : Math.pow(progress, FLOW_EASING_EXPONENT);
            flowSec = TOTAL_SECONDS * easedProgress;
        }

        if (now - lastRenderRef.current > 1000 / RENDER_FPS) {

            lastRenderRef.current = now;
            setFlowDisplaySec(flowSec);

        }

        rafRef.current = requestAnimationFrame(tick);

        };

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);

  }, []);

    const gd = serverRound?.graphData ?? [];

    const chartDataDisplay = useMemo(() => {

        if (gd.length === 0) return [];

        const result = [];

        for (let t = 0; t <= flowDisplaySec; t += DISPLAY_STEP) {

        const pt = interpolateAtTime(gd, t);

        if (pt) result.push(pt);
        }

        const lastPt = interpolateAtTime(gd, flowDisplaySec);

        if (lastPt) result.push(lastPt);

        return result;

    }, [gd, flowDisplaySec]);

  const startVal = startValue ?? 100;
  const lastPointPrice = chartDataDisplay.length > 0 ? chartDataDisplay[chartDataDisplay.length - 1].price : startVal;
  let chartThreshold;
  if (roundPhase === "betting") {
    chartThreshold = lastPointPrice;
  } else {
    if (fixedThresholdRef.current == null) {
      fixedThresholdRef.current = lastPointPrice;
    }
    chartThreshold = fixedThresholdRef.current;
  }

  let lastPrice = chartThreshold;

  if (chartDataDisplay.length > 0) {
    lastPrice =
      chartDataDisplay[chartDataDisplay.length - 1].price;
  }

  const prices = chartDataDisplay.map(p => p.price);

  const chartMin =
    prices.length > 0
      ? Math.min(...prices) - 2
      : chartThreshold - 5;

  const chartMax =
    prices.length > 0
      ? Math.max(...prices) + 2
      : chartThreshold + 5;
      return (
    <GravityUltimateChartCanvas
        chartDataDisplay={chartDataDisplay}
        previousGraphData={previousGraphData}
        chartMin={chartMin}
        chartMax={chartMax}
        chartThreshold={chartThreshold}
        roundPhase={roundPhase}
        tradingStartSec={BETTING_SECONDS}
    />
    );
    // return (
    //     <GravityUltimateChartCanvas
    //         chartDataDisplay={chartDataDisplay}
    //         chartMin={chartMin}
    //         chartMax={chartMax}
    //         chartThreshold={chartThreshold}
    //         roundPhase={roundPhase}
    //     />
    // );
    // return (
    //     <GravityAAAChartCanvas
    //         chartDataDisplay={chartDataDisplay}
    //         chartMin={chartMin}
    //         chartMax={chartMax}
    //         chartThreshold={chartThreshold}
    //         roundPhase={roundPhase}
    //     />
    // );
    // return (
    //     <GravityProChartCanvas
    //         chartDataDisplay={chartDataDisplay}
    //         chartMin={chartMin}
    //         chartMax={chartMax}
    //         chartThreshold={chartThreshold}
    //     />
    // );
    // return (
    //     <GravityCanvasChart
    //         chartDataDisplay={chartDataDisplay}
    //         chartMin={chartMin}
    //         chartMax={chartMax}
    //         chartThreshold={chartThreshold}
    //     />
    // );
//   return (
//     <GravityChart
//       chartDataDisplay={chartDataDisplay}
//       lastPrice={lastPrice}
//       chartMin={chartMin}
//       chartMax={chartMax}
//       chartThreshold={chartThreshold}
//       roundPhase={roundPhase}
//       tradingStartTime={tradingStartTime}
//       tradingEndTime={tradingEndTime}
//       formatTime={formatTime}
//       currentRoundId={currentRoundId}
//     />
//   );
}