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
    } else if (vizMode === 'aurora') {
      // Aurora: Vertical flowing bands like northern lights
      p5.blendMode(p5.ADD);
      p5.noFill();
      for (let i = 0; i < 8; i++) {
        const x = (i / 8) * p5.width + p5.noise(i, zoff * 0.3) * 100;
        p5.stroke(hueA + i * 20, sat * 0.8, bri, 40 + energy * 60);
        p5.strokeWeight(2 + energy * 3);
        p5.beginShape();
        for (let y = 0; y < p5.height; y += 4) {
          const nx = x / p5.width;
          const ny = y / p5.height;
          const offset = p5.noise(nx * 0.5, ny * 0.3 + zoff * 0.2, i) * 80 - 40;
          p5.curveVertex(x + offset, y);
        }
        p5.endShape();
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'watercolor') {
      // Watercolor: Soft, blended strokes
      p5.blendMode(p5.MULTIPLY);
      for (let i = 0; i < parts.length; i += 3) {
        const pt = parts[i];
        const nx = pt.x / p5.width, ny = pt.y / p5.height;
        const angle = p5.noise(nx * 1.5, ny * 1.5, zoff) * p5.TWO_PI * (1.3 + energy * 1.4);
        const vx = Math.cos(angle) * (0.8 + energy * 1.4);
        const vy = Math.sin(angle) * (0.8 + energy * 1.4);
        const hueVar = (hueA + (p5.noise(nx * 5, ny * 5, zoff) - 0.5) * 50) % 360;
        p5.fill(hueVar, sat * 0.6, bri * 0.9, 15 + energy * 25);
        p5.noStroke();
        p5.ellipse(pt.x, pt.y, 20 + energy * 30, 20 + energy * 30);
        pt.x += vx; pt.y += vy;
        if (pt.x < -50 || pt.x > p5.width + 50 || pt.y < -50 || pt.y > p5.height + 50) {
          pt.x = Math.random() * p5.width;
          pt.y = Math.random() * p5.height;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'ink') {
      // Ink: Organic splashes and drips
      p5.blendMode(p5.BLEND);
      p5.noFill();
      p5.strokeWeight(1.5 + energy * 2);
      for (let i = 0; i < parts.length; i += 4) {
        const pt = parts[i];
        const nx = pt.x / p5.width, ny = pt.y / p5.height;
        const angle = p5.noise(nx * 2.5, ny * 2.5, zoff) * p5.TWO_PI * (1.5 + energy * 1.6);
        const vx = Math.cos(angle) * (1.0 + energy * 2.0);
        const vy = Math.sin(angle) * (1.0 + energy * 2.0);
        const hueVar = (hueA + (p5.noise(nx * 6, ny * 6, zoff) - 0.5) * 70) % 360;
        const alpha = 80 + energy * 100;
        p5.stroke(hueVar, sat, bri, alpha);
        // Draw organic blob shape
        p5.beginShape();
        for (let a = 0; a < p5.TWO_PI; a += 0.3) {
          const r = 8 + energy * 12 + p5.noise(nx * 10, ny * 10, a) * 6;
          p5.vertex(pt.x + Math.cos(a) * r, pt.y + Math.sin(a) * r);
        }
        p5.endShape(p5.CLOSE);
        pt.x += vx; pt.y += vy;
        if (pt.x < -30 || pt.x > p5.width + 30 || pt.y < -30 || pt.y > p5.height + 30) {
          pt.x = Math.random() * p5.width;
          pt.y = Math.random() * p5.height;
        }
      }
    } else if (vizMode === 'fiber') {
      // Fiber: Woven thread-like patterns
      p5.blendMode(p5.ADD);
      p5.strokeWeight(0.8 + energy * 1.2);
      for (let i = 0; i < parts.length; i += 2) {
        const seed = parts[i];
        let x = seed.x, y = seed.y;
        const nx0 = x / p5.width, ny0 = y / p5.height;
        const baseHue = (hueA + (p5.noise(nx0 * 3, ny0 * 3, zoff) - 0.5) * 50) % 360;
        p5.stroke(baseHue, sat, bri, 60 + energy * 80);
        p5.beginShape();
        for (let s = 0; s < 40; s++) {
          const nx = x / p5.width;
          const ny = y / p5.height;
          const angle = p5.noise(nx * 2.2, ny * 2.2, zoff + s * 0.003) * p5.TWO_PI * (1.4 + energy * 1.5);
          const vx = Math.cos(angle) * (0.6 + energy * 1.2);
          const vy = Math.sin(angle) * (0.6 + energy * 1.2);
          p5.vertex(x, y);
          x += vx;
          y += vy;
          if (x < -30 || x > p5.width + 30 || y < -30 || y > p5.height + 30) break;
        }
        p5.endShape();
        seed.x = x; seed.y = y; seed.life += 0.008 + energy * 0.015;
        if (seed.life > 1) {
          seed.x = Math.random() * p5.width;
          seed.y = Math.random() * p5.height;
          seed.life = 0;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'sparkles') {
      // Sparkles: Glittery, scattered points
      p5.blendMode(p5.ADD);
      for (let i = 0; i < parts.length; i++) {
        const pt = parts[i];
        const nx = pt.x / p5.width, ny = pt.y / p5.height;
        const angle = p5.noise(nx * 1.7, ny * 1.7, zoff) * p5.TWO_PI * (1.6 + energy * 1.4);
        const vx = Math.cos(angle) * (0.5 + energy * 1.5);
        const vy = Math.sin(angle) * (0.5 + energy * 1.5);
        const hueVar = (hueA + (p5.noise(nx * 8, ny * 8, zoff) - 0.5) * 60) % 360;
        const sparkle = p5.noise(nx * 15, ny * 15, zoff);
        if (sparkle > 0.7) {
          p5.fill(hueVar, sat, 100, 150 + energy * 100);
          p5.noStroke();
          p5.circle(pt.x, pt.y, 2 + sparkle * 4);
          // Add crosshair sparkle
          p5.stroke(hueVar, sat, 100, 100 + energy * 80);
          p5.strokeWeight(1);
          p5.line(pt.x - 3, pt.y, pt.x + 3, pt.y);
          p5.line(pt.x, pt.y - 3, pt.x, pt.y + 3);
        }
        pt.x += vx; pt.y += vy;
        if (pt.x < -20 || pt.x > p5.width + 20 || pt.y < -20 || pt.y > p5.height + 20) {
          pt.x = Math.random() * p5.width;
          pt.y = Math.random() * p5.height;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'waves') {
      // Waves: Ocean-like rhythmic patterns
      p5.blendMode(p5.SCREEN);
      p5.noFill();
      p5.strokeWeight(1.5 + energy * 2);
      for (let i = 0; i < 12; i++) {
        const y = (i / 12) * p5.height;
        const waveOffset = Math.sin(zoff * 2 + i) * 30 * (1 + energy);
        p5.stroke(hueA + i * 15, sat * 0.7, bri, 50 + energy * 80);
        p5.beginShape();
        for (let x = 0; x < p5.width; x += 8) {
          const nx = x / p5.width;
          const ny = y / p5.height;
          const wave = p5.noise(nx * 0.8, ny * 0.5 + zoff * 0.3, i) * 40;
          p5.curveVertex(x, y + wave + waveOffset);
        }
        p5.endShape();
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'smoke') {
      // Smoke: Billowing, soft clouds
      p5.blendMode(p5.SOFT_LIGHT);
      for (let i = 0; i < 400; i++) {
        const pt = parts[i % parts.length];
        const nx = pt.x / p5.width, ny = pt.y / p5.height;
        const n = p5.noise(nx * 1.2, ny * 1.2, zoff * 0.5);
        const angle = p5.noise(nx * 2, ny * 2, zoff) * p5.TWO_PI;
        const vx = Math.cos(angle) * (0.4 + energy * 0.8);
        const vy = Math.sin(angle) * (0.4 + energy * 0.8) - 0.3; // Float upward
        const hueVar = (hueA + (n - 0.5) * 40) % 360;
        const alpha = (20 + n * 40) * (0.4 + energy * 0.5);
        p5.fill(hueVar, sat * 0.5, bri * 0.8, alpha);
        const r = (15 + n * 25) * (0.6 + energy * 0.7);
        p5.circle(pt.x, pt.y, r);
        pt.x += vx; pt.y += vy;
        if (pt.y < -50) {
          pt.y = p5.height + 50;
          pt.x = Math.random() * p5.width;
        }
        if (pt.x < -50 || pt.x > p5.width + 50) {
          pt.x = Math.random() * p5.width;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'plasma') {
      // Plasma: Swirling, organic blobs
      p5.blendMode(p5.ADD);
      for (let i = 0; i < 200; i++) {
        const pt = parts[i % parts.length];
        const nx = pt.x / p5.width, ny = pt.y / p5.height;
        const n1 = p5.noise(nx * 2 + zoff * 0.3, ny * 2 + zoff * 0.3);
        const n2 = p5.noise(nx * 3 - zoff * 0.2, ny * 3 - zoff * 0.2);
        const angle = n1 * p5.TWO_PI;
        const vx = Math.cos(angle) * (0.6 + energy * 1.2);
        const vy = Math.sin(angle) * (0.6 + energy * 1.2);
        const hueVar = (hueA + (n2 - 0.5) * 80) % 360;
        const alpha = (30 + n1 * 70) * (0.5 + energy * 0.6);
        p5.fill(hueVar, sat, bri, alpha);
        const r = (12 + n1 * 20) * (0.7 + energy * 0.8);
        p5.circle(pt.x, pt.y, r);
        pt.x += vx; pt.y += vy;
        if (pt.x < -40 || pt.x > p5.width + 40 || pt.y < -40 || pt.y > p5.height + 40) {
          pt.x = Math.random() * p5.width;
          pt.y = Math.random() * p5.height;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'magnetic') {
      // Magnetic: Field lines with attraction points
      p5.blendMode(p5.ADD);
      p5.strokeWeight(1 + energy * 1.5);
      for (let i = 0; i < parts.length; i += 3) {
        const seed = parts[i];
        let x = seed.x, y = seed.y;
        const nx0 = x / p5.width, ny0 = y / p5.height;
        const baseHue = (hueA + (p5.noise(nx0 * 4, ny0 * 4, zoff) - 0.5) * 60) % 360;
        p5.stroke(baseHue, sat, bri, 50 + energy * 80);
        for (let s = 0; s < 25; s++) {
          const nx = x / p5.width, ny = y / p5.height;
          const angle = p5.noise(nx * 2.5, ny * 2.5, zoff + s * 0.005) * p5.TWO_PI * (1.5 + energy * 1.7);
          const vx = Math.cos(angle) * (0.8 + energy * 1.6);
          const vy = Math.sin(angle) * (0.8 + energy * 1.6);
          p5.point(x, y);
          x += vx; y += vy;
          if (x < -20 || x > p5.width + 20 || y < -20 || y > p5.height + 20) break;
        }
        seed.x = x; seed.y = y; seed.life += 0.01 + energy * 0.02;
        if (seed.life > 1) {
          seed.x = Math.random() * p5.width;
          seed.y = Math.random() * p5.height;
          seed.life = 0;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'crystals') {
      // Crystals: Geometric, faceted shapes
      p5.blendMode(p5.ADD);
      p5.strokeWeight(1.2 + energy * 1.8);
      for (let i = 0; i < parts.length; i += 5) {
        const pt = parts[i];
        const nx = pt.x / p5.width, ny = pt.y / p5.height;
        const angle = p5.noise(nx * 2, ny * 2, zoff) * p5.TWO_PI * (1.4 + energy * 1.6);
        const vx = Math.cos(angle) * (0.7 + energy * 1.5);
        const vy = Math.sin(angle) * (0.7 + energy * 1.5);
        const hueVar = (hueA + (p5.noise(nx * 7, ny * 7, zoff) - 0.5) * 70) % 360;
        const sides = 6; // Hexagon
        const size = 8 + energy * 12;
        p5.push();
        p5.translate(pt.x, pt.y);
        p5.rotate(angle);
        p5.stroke(hueVar, sat, bri, 80 + energy * 100);
        p5.noFill();
        p5.beginShape();
        for (let a = 0; a < p5.TWO_PI; a += p5.TWO_PI / sides) {
          p5.vertex(Math.cos(a) * size, Math.sin(a) * size);
        }
        p5.endShape(p5.CLOSE);
        p5.pop();
        pt.x += vx; pt.y += vy;
        if (pt.x < -30 || pt.x > p5.width + 30 || pt.y < -30 || pt.y > p5.height + 30) {
          pt.x = Math.random() * p5.width;
          pt.y = Math.random() * p5.height;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'lava') {
      // Lava: Glowing, flowing molten patterns
      p5.blendMode(p5.ADD);
      for (let i = 0; i < parts.length; i += 2) {
        const pt = parts[i];
        const nx = pt.x / p5.width, ny = pt.y / p5.height;
        const angle = p5.noise(nx * 1.6, ny * 1.6, zoff) * p5.TWO_PI * (1.5 + energy * 1.5);
        const vx = Math.cos(angle) * (1.2 + energy * 2.0);
        const vy = Math.sin(angle) * (1.2 + energy * 2.0);
        const hueVar = (hueA + (p5.noise(nx * 5, ny * 5, zoff) - 0.5) * 40) % 360;
        const glow = p5.noise(nx * 8, ny * 8, zoff);
        p5.fill(hueVar, sat, 90 + glow * 10, 60 + energy * 80);
        p5.noStroke();
        p5.circle(pt.x, pt.y, 4 + glow * 8 + energy * 6);
        pt.x += vx; pt.y += vy;
        if (pt.x < -20 || pt.x > p5.width + 20 || pt.y < -20 || pt.y > p5.height + 20) {
          pt.x = p5.width * (0.4 + Math.random() * 0.2);
          pt.y = p5.height * (0.4 + Math.random() * 0.2);
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'tendrils') {
      // Tendrils: Branching, organic growth
      p5.blendMode(p5.ADD);
      p5.strokeWeight(1.5 + energy * 2);
      for (let i = 0; i < parts.length; i += 4) {
        const seed = parts[i];
        let x = seed.x, y = seed.y;
        const nx0 = x / p5.width, ny0 = y / p5.height;
        const baseHue = (hueA + (p5.noise(nx0 * 3, ny0 * 3, zoff) - 0.5) * 50) % 360;
        p5.stroke(baseHue, sat, bri, 70 + energy * 90);
        p5.beginShape();
        for (let s = 0; s < 35; s++) {
          const nx = x / p5.width;
          const ny = y / p5.height;
          const angle = p5.noise(nx * 2.8, ny * 2.8, zoff + s * 0.004) * p5.TWO_PI * (1.3 + energy * 1.6);
          const vx = Math.cos(angle) * (0.7 + energy * 1.4);
          const vy = Math.sin(angle) * (0.7 + energy * 1.4);
          p5.curveVertex(x, y);
          x += vx; y += vy;
          if (x < -40 || x > p5.width + 40 || y < -40 || y > p5.height + 40) break;
        }
        p5.endShape();
        seed.x = x; seed.y = y; seed.life += 0.012 + energy * 0.018;
        if (seed.life > 1) {
          seed.x = Math.random() * p5.width;
          seed.y = Math.random() * p5.height;
          seed.life = 0;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'marbling') {
      // Marbling: Swirling marble-like patterns
      p5.blendMode(p5.MULTIPLY);
      for (let i = 0; i < parts.length; i += 2) {
        const pt = parts[i];
        const nx = pt.x / p5.width, ny = pt.y / p5.height;
        const angle = p5.noise(nx * 1.3, ny * 1.3, zoff) * p5.TWO_PI * (1.2 + energy * 1.3);
        const vx = Math.cos(angle) * (0.5 + energy * 1.0);
        const vy = Math.sin(angle) * (0.5 + energy * 1.0);
        const hueVar = (hueA + (p5.noise(nx * 4, ny * 4, zoff) - 0.5) * 60) % 360;
        p5.fill(hueVar, sat * 0.7, bri * 0.85, 20 + energy * 30);
        p5.noStroke();
        p5.ellipse(pt.x, pt.y, 25 + energy * 35, 8 + energy * 12);
        pt.x += vx; pt.y += vy;
        if (pt.x < -50 || pt.x > p5.width + 50 || pt.y < -50 || pt.y > p5.height + 50) {
          pt.x = Math.random() * p5.width;
          pt.y = Math.random() * p5.height;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'silk') {
      // Silk: Smooth, flowing fabric-like patterns
      p5.blendMode(p5.SOFT_LIGHT);
      p5.strokeWeight(1.8 + energy * 2.2);
      for (let i = 0; i < parts.length; i += 3) {
        const seed = parts[i];
        let x = seed.x, y = seed.y;
        const nx0 = x / p5.width, ny0 = y / p5.height;
        const baseHue = (hueA + (p5.noise(nx0 * 3.5, ny0 * 3.5, zoff) - 0.5) * 55) % 360;
        p5.stroke(baseHue, sat * 0.8, bri, 50 + energy * 70);
        p5.beginShape();
        for (let s = 0; s < 50; s++) {
          const nx = x / p5.width;
          const ny = y / p5.height;
          const angle = p5.noise(nx * 1.8, ny * 1.8, zoff + s * 0.002) * p5.TWO_PI * (1.3 + energy * 1.4);
          const vx = Math.cos(angle) * (0.5 + energy * 1.0);
          const vy = Math.sin(angle) * (0.5 + energy * 1.0);
          p5.curveVertex(x, y);
          x += vx; y += vy;
          if (x < -40 || x > p5.width + 40 || y < -40 || y > p5.height + 40) break;
        }
        p5.endShape();
        seed.x = x; seed.y = y; seed.life += 0.006 + energy * 0.012;
        if (seed.life > 1) {
          seed.x = Math.random() * p5.width;
          seed.y = Math.random() * p5.height;
          seed.life = 0;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'bloom') {
      // Bloom: Soft, glowing blooms
      p5.blendMode(p5.ADD);
      for (let i = 0; i < parts.length; i += 4) {
        const pt = parts[i];
        const nx = pt.x / p5.width, ny = pt.y / p5.height;
        const angle = p5.noise(nx * 1.4, ny * 1.4, zoff) * p5.TWO_PI * (1.3 + energy * 1.4);
        const vx = Math.cos(angle) * (0.4 + energy * 0.9);
        const vy = Math.sin(angle) * (0.4 + energy * 0.9);
        const hueVar = (hueA + (p5.noise(nx * 6, ny * 6, zoff) - 0.5) * 50) % 360;
        const bloom = p5.noise(nx * 10, ny * 10, zoff);
        // Draw multiple concentric circles for bloom effect
        for (let layer = 0; layer < 3; layer++) {
          const size = (15 + bloom * 20 + energy * 15) * (1 - layer * 0.3);
          const alpha = (40 + bloom * 40) * (0.4 + energy * 0.5) * (1 - layer * 0.4);
          p5.fill(hueVar, sat * 0.7, bri, alpha);
          p5.noStroke();
          p5.circle(pt.x, pt.y, size);
        }
        pt.x += vx; pt.y += vy;
        if (pt.x < -40 || pt.x > p5.width + 40 || pt.y < -40 || pt.y > p5.height + 40) {
          pt.x = Math.random() * p5.width;
          pt.y = Math.random() * p5.height;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'lace') {
      // Lace: Delicate, intricate patterns
      p5.blendMode(p5.ADD);
      p5.strokeWeight(0.6 + energy * 1.0);
      for (let i = 0; i < parts.length; i += 5) {
        const seed = parts[i];
        let x = seed.x, y = seed.y;
        const nx0 = x / p5.width, ny0 = y / p5.height;
        const baseHue = (hueA + (p5.noise(nx0 * 5, ny0 * 5, zoff) - 0.5) * 50) % 360;
        p5.stroke(baseHue, sat * 0.6, bri, 40 + energy * 60);
        p5.beginShape();
        for (let s = 0; s < 60; s++) {
          const nx = x / p5.width;
          const ny = y / p5.height;
          const angle = p5.noise(nx * 3, ny * 3, zoff + s * 0.001) * p5.TWO_PI * (1.4 + energy * 1.5);
          const vx = Math.cos(angle) * (0.3 + energy * 0.7);
          const vy = Math.sin(angle) * (0.3 + energy * 0.7);
          p5.vertex(x, y);
          x += vx; y += vy;
          if (x < -50 || x > p5.width + 50 || y < -50 || y > p5.height + 50) break;
        }
        p5.endShape();
        seed.x = x; seed.y = y; seed.life += 0.005 + energy * 0.01;
        if (seed.life > 1) {
          seed.x = Math.random() * p5.width;
          seed.y = Math.random() * p5.height;
          seed.life = 0;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'fireworks') {
      // Fireworks: Explosive, radiating patterns
      p5.blendMode(p5.ADD);
      for (let i = 0; i < 20; i++) {
        const pt = parts[(i * 47) % parts.length];
        const nx = pt.x / p5.width, ny = pt.y / p5.height;
        const baseHue = (hueA + (p5.noise(nx * 4, ny * 4, zoff) - 0.5) * 70) % 360;
        const sparkCount = 12;
        for (let s = 0; s < sparkCount; s++) {
          const angle = (s / sparkCount) * p5.TWO_PI + p5.noise(nx * 2, ny * 2, zoff) * 0.5;
          const dist = 20 + energy * 40 + p5.noise(nx * 8, ny * 8, s) * 15;
          const x = pt.x + Math.cos(angle) * dist;
          const y = pt.y + Math.sin(angle) * dist;
          const alpha = 100 + energy * 100;
          p5.stroke(baseHue, sat, bri, alpha);
          p5.strokeWeight(1.5 + energy * 1.5);
          p5.line(pt.x, pt.y, x, y);
          p5.fill(baseHue, sat, 100, alpha);
          p5.circle(x, y, 2 + energy * 3);
        }
        pt.life += 0.01 + energy * 0.02;
        if (pt.life > 1) {
          pt.x = Math.random() * p5.width;
          pt.y = Math.random() * p5.height;
          pt.life = 0;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'mist') {
      // Mist: Ethereal, soft mist
      p5.blendMode(p5.SCREEN);
      for (let i = 0; i < 500; i++) {
        const pt = parts[i % parts.length];
        const nx = pt.x / p5.width, ny = pt.y / p5.height;
        const n = p5.noise(nx * 0.8, ny * 0.8, zoff * 0.4);
        const angle = p5.noise(nx * 1.5, ny * 1.5, zoff) * p5.TWO_PI;
        const vx = Math.cos(angle) * (0.3 + energy * 0.6);
        const vy = Math.sin(angle) * (0.3 + energy * 0.6) - 0.2; // Float upward
        const hueVar = (hueA + (n - 0.5) * 30) % 360;
        const alpha = (15 + n * 25) * (0.3 + energy * 0.4);
        p5.fill(hueVar, sat * 0.4, bri * 0.9, alpha);
        const r = (20 + n * 30) * (0.5 + energy * 0.6);
        p5.circle(pt.x, pt.y, r);
        pt.x += vx; pt.y += vy;
        if (pt.y < -60) {
          pt.y = p5.height + 60;
          pt.x = Math.random() * p5.width;
        }
        if (pt.x < -60 || pt.x > p5.width + 60) {
          pt.x = Math.random() * p5.width;
        }
      }
      p5.blendMode(p5.BLEND);
    } else if (vizMode === 'rivers') {
      // Rivers: Flowing river-like patterns
      p5.blendMode(p5.ADD);
      p5.strokeWeight(2 + energy * 3);
      for (let i = 0; i < 15; i++) {
        const seed = parts[(i * 53) % parts.length];
        let x = seed.x, y = seed.y;
        const nx0 = x / p5.width, ny0 = y / p5.height;
        const baseHue = (hueA + (p5.noise(nx0 * 2, ny0 * 2, zoff) - 0.5) * 40) % 360;
        p5.stroke(baseHue, sat * 0.9, bri, 70 + energy * 90);
        p5.beginShape();
        for (let s = 0; s < 80; s++) {
          const nx = x / p5.width;
          const ny = y / p5.height;
          const angle = p5.noise(nx * 1.2, ny * 1.2, zoff + s * 0.003) * p5.TWO_PI * (1.3 + energy * 1.4);
          const vx = Math.cos(angle) * (0.8 + energy * 1.4);
          const vy = Math.sin(angle) * (0.8 + energy * 1.4);
          p5.curveVertex(x, y);
          x += vx; y += vy;
          if (x < -50 || x > p5.width + 50 || y < -50 || y > p5.height + 50) break;
        }
        p5.endShape();
        seed.x = x; seed.y = y; seed.life += 0.008 + energy * 0.015;
        if (seed.life > 1) {
          seed.x = Math.random() * p5.width;
          seed.y = Math.random() * p5.height;
          seed.life = 0;
        }
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

