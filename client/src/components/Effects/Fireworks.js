import React, { useRef, useEffect } from "react";
export default function Fireworks({ width = 800, height = 400, duration = 2000, onComplete, debug = false }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    canvas.style.background = "transparent";

    const rockets = [];
    const particles = [];
    const bursts = [];
    const colors = ["#ff3b3b", "#ff9a3b", "#ffd23b", "#7cff3b", "#3bffef", "#3b7cff", "#9b3bff", "#ff6ad5", "#ffffff"];

    const rand = (min, max) => Math.random() * (max - min) + min;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

    function createColor() {
      if (Math.random() < 0.2) return "#ffffff";
      const hue = Math.floor(rand(0, 360));
      return `hsl(${hue}, 90%, 60%)`;
    }

    function spawnRocket() {
      const now = performance.now();
      rockets.push({
        x: rand(width * 0.1, width * 0.9),
        y: height + 10,
        vx: rand(-0.6, 0.6),
        vy: rand(-10.5, -14),
        color: createColor(),
        life: rand(35, 55),
        age: 0,
        targetY: rand(height * 0.1, height * 0.35),
        trail: [],
        spawnTime: now,
        explodeAfter: rand(350, 600),
      });
    }

    function spawnParticle(x, y, angle, speed, color, size, life, gravity = 0.06, drag = 0.985, sparkle = false) {
      particles.push({
        x,
        y,
        px: x,
        py: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        age: 0,
        color,
        size,
        gravity,
        drag,
        sparkle,
        alpha: 1,
      });
    }

    function explode(rocket) {
      const typeRoll = Math.random();
      const baseCount = Math.floor(rand(60, 110));
      const color = rocket.color;
      const coreSpeed = rand(3.2, 6.8);
      const ring = typeRoll < 0.25;
      const palm = typeRoll >= 0.25 && typeRoll < 0.45;
      const doubleBurst = typeRoll >= 0.45 && typeRoll < 0.6;

      for (let i = 0; i < baseCount; i++) {
        const angle = (Math.PI * 2 * i) / baseCount + rand(-0.08, 0.08);
        let speed = coreSpeed * rand(0.7, 1.15);
        if (ring) speed = coreSpeed * 1.05;
        if (palm) {
          speed = coreSpeed * rand(0.7, 1.0);
        }
        spawnParticle(
          rocket.x,
          rocket.y,
          angle,
          speed,
          color,
          rand(1.5, 2.6),
          rand(50, 85),
          0.06,
          ring ? 0.99 : 0.985,
          Math.random() < 0.12
        );
      }

      if (doubleBurst) {
        const burstColor = createColor();
        for (let i = 0; i < 32; i++) {
          const angle = (Math.PI * 2 * i) / 32 + rand(-0.12, 0.12);
          spawnParticle(rocket.x, rocket.y, angle, rand(2.2, 4.2), burstColor, rand(1.2, 2.0), rand(35, 60), 0.05, 0.985, true);
        }
      }

      // crackle sparkle
      for (let i = 0; i < 22; i++) {
        spawnParticle(rocket.x, rocket.y, rand(0, Math.PI * 2), rand(1.0, 2.6), "#ffffff", rand(0.8, 1.4), rand(18, 32), 0.02, 0.98, true);
      }

      // big visible flash so explosions are obvious
      bursts.push({
        x: rocket.x,
        y: rocket.y,
        color,
        age: 0,
        life: 18,
        radius: rand(25, 60),
      });
    }

    // initial burst
    for (let i = 0; i < 6; i++) {
      setTimeout(spawnRocket, i * 130);
    }

    let start = performance.now();
    let fadeStart = null;
    function frame(now) {
      const elapsed = now - start;
      const hasActive = rockets.length > 0 || particles.length > 0 || bursts.length > 0;
      const inShowWindow = elapsed < duration;
      if (!inShowWindow && fadeStart === null) {
        fadeStart = now;
      }
      const fadeElapsed = fadeStart ? now - fadeStart : 0;
      const fadeRatio = fadeStart ? clamp(1 - fadeElapsed / 1200, 0, 1) : 1;

      // smooth fade-out of previous frames (keeps glow)
      ctx.globalCompositeOperation = "destination-out";
      const fadeAlpha = fadeStart ? 0.04 : 0.02;
      ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      if (elapsed < duration && Math.random() < 0.18) spawnRocket();

      // rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.px = r.x;
        r.py = r.y;
        r.vy += 0.03; // gravity
        r.x += r.vx;
        r.y += r.vy;
        r.age++;

        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 6) r.trail.shift();

        ctx.beginPath();
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.9 * fadeRatio;
        for (let t = 0; t < r.trail.length - 1; t++) {
          ctx.moveTo(r.trail[t].x, r.trail[t].y);
          ctx.lineTo(r.trail[t + 1].x, r.trail[t + 1].y);
        }
        ctx.stroke();

        if (debug) {
          ctx.beginPath();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.arc(r.x, r.y, 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // explode at apex/target/life or after a time limit
        if (r.y <= r.targetY || r.vy > -1 || r.age > r.life || now - r.spawnTime > r.explodeAfter) {
          explode(r);
          rockets.splice(i, 1);
        }
      }

      // explosion flashes
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.age++;
        const t = b.age / b.life;
        if (t >= 1) {
          bursts.splice(i, 1);
          continue;
        }
        const alpha = (1 - t) * fadeRatio;
        const radius = b.radius * (0.6 + t * 1.6);
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, radius);
        g.addColorStop(0, `rgba(255,255,255,${alpha})`);
        g.addColorStop(0.4, `rgba(255,255,255,${alpha * 0.7})`);
        g.addColorStop(1, `rgba(0,0,0,0)`);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
        ctx.fill();

        if (debug) {
          ctx.beginPath();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#00ffff";
          ctx.lineWidth = 1;
          ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.px = p.x;
        p.py = p.y;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.age++;
        const lifeRatio = 1 - p.age / p.life;
        if (lifeRatio <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = clamp(lifeRatio * 1.2, 0, 1) * fadeRatio;
        ctx.globalAlpha = p.sparkle && Math.random() < 0.2 ? 0.15 * fadeRatio : alpha;
        ctx.beginPath();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 1.7;
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.arc(p.x, p.y, p.size * (1.1 + 0.8 * lifeRatio), 0, Math.PI * 2);
        ctx.fill();
      }

      if (elapsed < duration || (hasActive && fadeElapsed < 1200)) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = requestAnimationFrame(() => {
          ctx.clearRect(0, 0, width, height);
          if (onComplete) onComplete();
        });
      }
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [width, height, duration, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}