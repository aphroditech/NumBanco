import React, { useRef, useEffect } from "react";

export default function GravityUltimateChartCanvas({
  chartDataDisplay,
  previousGraphData,
  chartMin,
  chartMax,
  chartThreshold,
  roundPhase,
  tradingStartSec = 10
}) {

    // console.log(chartDataDisplay)

  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  const pulseRef = useRef(0);
  const shockRef = useRef(0);

  const frozenFrame = useRef(null);
  const hasFrozen = useRef(false);

  /* latest data refs so canvas loop never restarts */

  const dataRef = useRef(chartDataDisplay);
  const prevRef = useRef(previousGraphData);
  const minRef = useRef(chartMin);
  const maxRef = useRef(chartMax);
  const thresholdRef = useRef(chartThreshold);
  const phaseRef = useRef(roundPhase);
  const tradingStartSecRef = useRef(tradingStartSec);

  useEffect(() => { dataRef.current = chartDataDisplay; }, [chartDataDisplay]);
  useEffect(() => { prevRef.current = previousGraphData; }, [previousGraphData]);
  useEffect(() => { minRef.current = chartMin; }, [chartMin]);
  useEffect(() => { maxRef.current = chartMax; }, [chartMax]);
  useEffect(() => { thresholdRef.current = chartThreshold; }, [chartThreshold]);
  useEffect(() => { phaseRef.current = roundPhase; }, [roundPhase]);
  useEffect(() => { tradingStartSecRef.current = tradingStartSec; }, [tradingStartSec]);

  useEffect(() => {

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const draw = () => {

      const chartData = dataRef.current;
      const previous = prevRef.current;
      const chartMin = minRef.current;
      const chartMax = maxRef.current;
      const chartThreshold = thresholdRef.current;
      const phase = phaseRef.current;

      const width = canvas.width;
      const height = canvas.height;

      /* show frozen frame */

      if (hasFrozen.current) {
        ctx.putImageData(frozenFrame.current,0,0);
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0,0,width,height);

      /* ---- CLIP DRAW AREA (FIXES YOUR CIRCLE BUG) ---- */

      ctx.save();
      ctx.beginPath();
      ctx.rect(0,0,width,height);
      ctx.clip();

      const range = chartMax - chartMin || 1;

      const scaleX = width / 15;
      const scaleY = height / range;

      const getX = t => t * scaleX;
      const getY = p => height - (p - chartMin) * scaleY;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      /* GRID */

      ctx.strokeStyle = "#1a1f28";
      ctx.lineWidth = 1;

      for(let i=0;i<12;i++){
        const y = (height/12)*i;

        ctx.beginPath();
        ctx.moveTo(0,y);
        ctx.lineTo(width,y);
        ctx.stroke();
      }

      /* THRESHOLD */

      ctx.setLineDash([6,6]);
      ctx.strokeStyle="#777";

      const ty=getY(chartThreshold);

      ctx.beginPath();
      ctx.moveTo(0,ty);
      ctx.lineTo(width,ty);
      ctx.stroke();

      ctx.setLineDash([]);

      /* TRADING START POSITION – vertical line at 10s when in trading or result */
      const tradingSec = tradingStartSecRef.current;
      if ((phase === "trading" || phase === "result") && tradingSec > 0) {
        const x = getX(tradingSec);
        ctx.strokeStyle = "rgba(0, 212, 255, 0.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "rgba(0, 212, 255, 0.9)";
        ctx.textAlign = "center";
        ctx.fillText("Trading start", x, 14);
      }

      /* GHOST HISTORY */

      if(previous && previous.length>1){

        ctx.beginPath();
        ctx.lineWidth=2;
        ctx.strokeStyle="rgba(200,200,200,0.25)";
        ctx.setLineDash([4,4]);

        const first=previous[0];

        ctx.moveTo(
          getX(first.time),
          getY(first.price)
        );

        for(let i=1;i<previous.length;i++){

          const p=previous[i];

          ctx.lineTo(
            getX(p.time),
            getY(p.price)
          );
        }

        ctx.stroke();
        ctx.setLineDash([]);
      }

      if(!chartData || chartData.length<2){
        ctx.restore();
        rafRef.current=requestAnimationFrame(draw);
        return;
      }

      const first=chartData[0];
      const last=chartData[chartData.length-1];

      const uptrend=last.price>=first.price;
      const lineColor=uptrend?"#00ff99":"#ff4d4d";

      const gradient=ctx.createLinearGradient(0,0,0,height);
      gradient.addColorStop(0,lineColor);
      gradient.addColorStop(1,"transparent");

      ctx.beginPath();
      ctx.lineWidth=3;
      ctx.strokeStyle=lineColor;

      ctx.shadowColor=lineColor;
      ctx.shadowBlur=15;

      ctx.moveTo(
        getX(first.time),
        getY(first.price)
      );

      for(let i=1;i<chartData.length-1;i++){

        const p0=chartData[i];
        const p1=chartData[i+1];

        const cx=(getX(p0.time)+getX(p1.time))/2;
        const cy=(getY(p0.price)+getY(p1.price))/2;

        ctx.quadraticCurveTo(
          getX(p0.time),
          getY(p0.price),
          cx,
          cy
        );
      }

      ctx.stroke();

      ctx.shadowBlur=0;

      /* AREA */

      ctx.lineTo(getX(last.time),height);
      ctx.lineTo(getX(first.time),height);
      ctx.closePath();

      ctx.globalAlpha=0.25;
      ctx.fillStyle=gradient;
      ctx.fill();
      ctx.globalAlpha=1;

      /* LIVE DOT */

      const dotX=getX(last.time);
      const dotY=getY(last.price);

      if(phase!=="result"){

        pulseRef.current+=0.05;

        const pulse=4+Math.sin(pulseRef.current)*2;

        ctx.beginPath();
        ctx.arc(dotX,dotY,pulse,0,Math.PI*2);
        ctx.fillStyle=lineColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(dotX,dotY,3,0,Math.PI*2);
        ctx.fillStyle="#fff";
        ctx.fill();
      }

      /* RESULT FREEZE */

      if(phase==="result" && !hasFrozen.current){

        frozenFrame.current = ctx.getImageData(0,0,width,height);
        hasFrozen.current = true;

        }

      ctx.restore();

      rafRef.current=requestAnimationFrame(draw);
    };

    draw();

    return ()=>cancelAnimationFrame(rafRef.current);

  },[]);

  return(
    <canvas
      ref={canvasRef}
      width={900}
      height={360}
      style={{
        width:"100%",
        height:"360px",
        background:"#0b0e13",
        borderRadius:"14px"
      }}
    />
  );
}