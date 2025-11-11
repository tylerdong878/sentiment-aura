import Sketch from 'react-p5';
import type p5Type from 'p5';
import useAuraStore from '../state/auraStore';
import { useRef } from 'react';

type Particle = { x: number; y: number; life: number };

export default function AuraCanvas() {
  const targetSentiment = useAuraStore((s) => s.sentimentScore);
  const targetEnergy = useAuraStore((s) => s.energy);
  const keywords = useAuraStore((s) => s.keywords);
  const vizMode = useAuraStore((s) => s.vizMode);
  const palette = useAuraStore((s) => s.palette);
  const smoothSentiment = useRef(0.5);
  const smoothEnergy = useRef(0.3);
  const particlesRef = useRef<Particle[]>([]);
  let zoff = 0;
  const prevSentRef = useRef(0.5);
  const prevEnergyRef = useRef(0.3);
  const turbulenceRef = useRef(0);

  const setup = (p5: p5Type, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.colorMode(p5.HSB, 360, 100, 100, 255);
    p5.noStroke();
    p5.noiseDetail(3, 0.55);
    // Seed particles
    const count = 1200;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * p5.width,
      y: Math.random() * p5.height,
      life: Math.random() * 1,
    }));
    p5.background(10, 10, 8, 255);
  };

  const windowResized = (p5: p5Type) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
    // Re-seed to fill new size
    const count = Math.max(800, Math.floor((p5.width * p5.height) / 1800));
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * p5.width,
      y: Math.random() * p5.height,
      life: Math.random(),
    }));
    p5.background(10, 10, 8, 255);
  };

  const draw = (p5: p5Type) => {
    // Smoothly approach targets
    smoothSentiment.current = p5.lerp(smoothSentiment.current, targetSentiment, 0.05);
    smoothEnergy.current = p5.lerp(smoothEnergy.current, targetEnergy, 0.08);
    const sentiment = smoothSentiment.current;
    const energy = smoothEnergy.current;
    // transient turbulence on sudden changes
    const sDelta = Math.abs(targetSentiment - prevSentRef.current);
    const eDelta = Math.abs(targetEnergy - prevEnergyRef.current);
    turbulenceRef.current = Math.max(turbulenceRef.current * 0.92, (sDelta + eDelta) * 0.8);
    prevSentRef.current = targetSentiment;
    prevEnergyRef.current = targetEnergy;

    // Motion blur / trail
    p5.fill(10, 10, 8, 18);
    p5.rect(0, 0, p5.width, p5.height);

    // Visual mapping
    // Palette mapping
    let hueA = p5.map(sentiment, 0, 1, 200, 24); // default cool->warm
    let sat = p5.map(energy, 0, 1, 60, 95);
    let bri = p5.map(sentiment, 0, 1, 60, 96);
    if (palette === 'warm') hueA = p5.map(sentiment, 0, 1, 35, 10);
    if (palette === 'cool') hueA = p5.map(sentiment, 0, 1, 230, 170);
    if (palette === 'pastel') { sat = 40; bri = 95; }
    if (palette === 'monochrome') { sat = 0; bri = 95; }
    if (palette === 'autumn') hueA = p5.map(sentiment, 0, 1, 30, 10); /* oranges/reds */
    const step = p5.map(energy, 0, 1, 0.006, 0.018) + turbulenceRef.current * 0.006;
    const speed = p5.map(energy, 0, 1, 0.6, 3.2) + turbulenceRef.current * 1.2;
    const size = p5.map(energy, 0, 1, 1.2, 2.6);
    const kFactor = Math.min(1, keywords.length / 6);

    const parts = particlesRef.current;
    if (vizMode === 'particles') {
      p5.blendMode(p5.ADD);
      for (let i = 0; i < parts.length; i++) {
        const pt = parts[i];
        const nx = pt.x / p5.width;
        const ny = pt.y / p5.height;
        const angle = p5.noise(nx * (2.1 + turbulenceRef.current * 1.2), ny * (2.1 + turbulenceRef.current * 1.2), zoff) * p5.TWO_PI * (1.4 + energy * 1.8 + turbulenceRef.current);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const hueVar = (hueA + (p5.noise(nx * 6, ny * 6, zoff * 2) - 0.5) * 40) % 360;
        p5.fill(hueVar, sat, bri, 60 + energy * 70 + kFactor * 50);
        p5.circle(pt.x, pt.y, size);
        pt.x += vx;
        pt.y += vy;
        pt.life += 0.002 + energy * 0.01;
        if (pt.x < -10 || pt.x > p5.width + 10 || pt.y < -10 || pt.y > p5.height + 10 || pt.life > 1) {
          pt.x = p5.width * (0.45 + Math.random() * 0.1);
          pt.y = p5.height * (0.45 + Math.random() * 0.1);
          pt.life = 0;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'ribbons') {
      // ribbons mode: draw flowing strokes following the field
      p5.noFill();
      p5.strokeWeight(1.2 + energy * 1.2);
      for (let i = 0; i < parts.length; i += 6) {
        const seed = parts[i];
        let x = seed.x, y = seed.y;
        const nx0 = x / p5.width, ny0 = y / p5.height;
        const baseHue = (hueA + (p5.noise(nx0 * 4, ny0 * 4, zoff) - 0.5) * 60) % 360;
        p5.stroke(baseHue, sat, bri, 80 + energy * 80);
        p5.beginShape();
        for (let s = 0; s < 30; s++) {
          const nx = x / p5.width;
          const ny = y / p5.height;
        const angle = p5.noise(nx * (1.6 + turbulenceRef.current), ny * (1.6 + turbulenceRef.current), zoff + s * 0.002) * p5.TWO_PI * (1.2 + energy * 1.6 + turbulenceRef.current * 0.8);
          const vx = Math.cos(angle) * (speed * 0.8);
          const vy = Math.sin(angle) * (speed * 0.8);
          p5.curveVertex(x, y);
          x += vx;
          y += vy;
          if (x < -20 || x > p5.width + 20 || y < -20 || y > p5.height + 20) break;
        }
        p5.endShape();
        // Move seed slightly to keep system evolving
        seed.x = x; seed.y = y; seed.life += 0.01 + energy * 0.02;
        if (seed.life > 1) {
          seed.x = Math.random() * p5.width;
          seed.y = Math.random() * p5.height;
          seed.life = 0;
        }
      }
    } else if (vizMode === 'nebula') {
      // Nebula: softer clouds with subtle sparks (less flashy)
      p5.blendMode(p5.SOFT_LIGHT);
      for (let i = 0; i < 300; i++) {
        const x = Math.random() * p5.width;
        const y = Math.random() * p5.height;
        const nx = x / p5.width, ny = y / p5.height;
        const n = p5.noise(nx * 1.5, ny * 1.5, zoff * 0.8);
        const hueVar = (hueA + (n - 0.5) * 80) % 360;
        const alpha = (18 + n * 50) * (0.3 + energy * 0.4);
        p5.fill(hueVar, sat, bri, alpha);
        const r = (6 + n * 24) * (0.5 + energy * 0.6);
        p5.circle(x, y, r);
      }
      // occasional star sparks (subtle)
      for (let i = 0; i < 15; i++) {
        const s = parts[(i * 37) % parts.length];
        p5.fill(0, 0, 100, 90);
        p5.circle(s.x, s.y, 1.0 + Math.random() * 1.8);
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'comets') {
      // Comets: streaks with fading tails
      p5.blendMode(p5.ADD);
      p5.strokeWeight(1);
      for (let i = 0; i < parts.length; i += 4) {
        const c = parts[i];
        let x = c.x, y = c.y;
        const nx0 = x / p5.width, ny0 = y / p5.height;
        const baseHue = (hueA + (p5.noise(nx0 * 5, ny0 * 5, zoff) - 0.5) * 80) % 360;
        for (let t = 0; t < 20; t++) {
          const nx = x / p5.width, ny = y / p5.height;
          const angle = p5.noise(nx * 2, ny * 2, zoff + t * 0.01) * p5.TWO_PI * (1.5 + energy * 1.8);
          const vx = Math.cos(angle) * (1.6 + energy * 2.2);
          const vy = Math.sin(angle) * (1.6 + energy * 2.2);
          const a = 120 - t * 5;
          p5.stroke(baseHue, sat, bri, a);
          p5.line(x, y, x - vx * 2, y - vy * 2);
          x += vx; y += vy;
          if (x < -20 || x > p5.width + 20 || y < -20 || y > p5.height + 20) break;
        }
        c.x = x; c.y = y; c.life += 0.02 + energy * 0.03;
        if (c.life > 1) { c.x = Math.random() * p5.width; c.y = Math.random() * p5.height; c.life = 0; }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'charcoal') {
      // Charcoal: square caps, textured strokes
      p5.strokeCap(p5.SQUARE);
      p5.strokeWeight(1.4 + energy * 1.4);
      p5.stroke(0, 0, 90, 60 + energy * 80);
      for (let i = 0; i < parts.length; i += 2) {
        const pt = parts[i];
        const nx = pt.x / p5.width, ny = pt.y / p5.height;
        const angle = p5.noise(nx * 2.3, ny * 2.3, zoff) * p5.TWO_PI * (1.4 + energy * 1.2);
        const vx = Math.cos(angle) * (0.8 + energy * 1.6);
        const vy = Math.sin(angle) * (0.8 + energy * 1.6);
        p5.line(pt.x, pt.y, pt.x + vx * 6, pt.y + vy * 6);
        pt.x += vx; pt.y += vy;
        if (pt.x < -10 || pt.x > p5.width + 10 || pt.y < -10 || pt.y > p5.height + 10) {
          pt.x = Math.random() * p5.width; pt.y = Math.random() * p5.height;
        }
      }
      p5.strokeCap(p5.ROUND);
    } else if (vizMode === 'flames') {
      // Flames: saturation fades with life
      p5.blendMode(p5.ADD);
      for (let i = 0; i < parts.length; i++) {
        const pt = parts[i];
        const nx = pt.x / p5.width, ny = pt.y / p5.height;
        const angle = p5.noise(nx * 1.8, ny * 1.8, zoff) * p5.TWO_PI * (1.6 + energy * 1.5);
        const vx = Math.cos(angle) * (1.2 + energy * 2.0);
        const vy = Math.sin(angle) * (1.2 + energy * 2.0);
        const lifeSat = sat * (1 - pt.life);
        p5.fill(hueA, lifeSat, bri, 70 + energy * 60);
        p5.circle(pt.x, pt.y, 1.2 + energy * 2.2);
        pt.x += vx; pt.y += vy; pt.life += 0.01 + energy * 0.02;
        if (pt.life > 1 || pt.x < -10 || pt.x > p5.width + 10 || pt.y < -10 || pt.y > p5.height + 10) {
          pt.x = p5.width * (0.45 + Math.random() * 0.1);
          pt.y = p5.height * (0.45 + Math.random() * 0.1);
          pt.life = 0;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'stars') {
      // Starfield + shooting stars
      p5.blendMode(p5.BLEND);
      p5.fill(0, 0, 100, 150);
      for (let i = 0; i < 120; i++) {
        const s = parts[(i * 29) % parts.length];
        p5.circle(s.x, s.y, Math.random() * 1.6 + 0.4);
        s.life += 0.002;
      }
      p5.blendMode(p5.ADD);
      for (let i = 0; i < 12; i++) {
        const c = parts[(i * 47) % parts.length];
        const nx = c.x / p5.width, ny = c.y / p5.height;
        const baseHue = (hueA + (p5.noise(nx * 4, ny * 4, zoff) - 0.5) * 60) % 360;
        let x = c.x, y = c.y;
        for (let t = 0; t < 16; t++) {
          const ang = p5.noise((x / p5.width) * 1.8, (y / p5.height) * 1.8, zoff + t * 0.01) * p5.TWO_PI;
          const vx = Math.cos(ang) * (1.4 + energy * 2.0);
          const vy = Math.sin(ang) * (1.4 + energy * 2.0);
          p5.stroke(baseHue, sat, bri, 120 - t * 7);
          p5.line(x, y, x - vx * 1.8, y - vy * 1.8);
          x += vx; y += vy;
        }
        c.x = x; c.y = y;
      }
      p5.blendMode(p5.BLEND);
    }
    zoff += step;
  };

  const preload = (p5: p5Type) => {
    // colorMode set in setup; keep preload minimal
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Sketch setup={setup} draw={draw} windowResized={windowResized} preload={preload} />
    </div>
  );
}

