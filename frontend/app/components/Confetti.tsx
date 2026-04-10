'use client';
import { useEffect, useRef } from 'react';

const COLORS = ['#3182F6', '#00C471', '#FF6B00', '#F04452', '#FFD600', '#B57BFF', '#00C8D7'];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  w: number; h: number;
  rotation: number; rotSpeed: number;
}

export default function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d')!;
    const particles: Particle[] = [];

    // Burst from multiple origins across the top
    const ORIGINS = [0.2, 0.5, 0.8];
    ORIGINS.forEach(ox => {
      for (let i = 0; i < 50; i++) {
        particles.push({
          x:        canvas.width  * ox + (Math.random() - 0.5) * 60,
          y:        canvas.height * 0.1,
          vx:       (Math.random() - 0.5) * 8,
          vy:       -(4 + Math.random() * 6),
          color:    COLORS[Math.floor(Math.random() * COLORS.length)],
          w:        6 + Math.random() * 8,
          h:        3 + Math.random() * 4,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3,
        });
      }
    });

    const start = Date.now();
    let animId: number;
    const DURATION = 1800;

    function draw() {
      const elapsed = Date.now() - start;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      if (elapsed > DURATION) return;

      const alpha = elapsed > 1200 ? 1 - (elapsed - 1200) / 600 : 1;

      particles.forEach(p => {
        p.x        += p.vx;
        p.vy       += 0.18;           // gravity
        p.y        += p.vy;
        p.rotation += p.rotSpeed;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 300, pointerEvents: 'none' }}
    />
  );
}
