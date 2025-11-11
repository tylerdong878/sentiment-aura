import Sketch from 'react-p5';
import type p5Type from 'p5';
import useAuraStore from '../state/auraStore';
import { useRef } from 'react';

export default function AuraCanvas() {
  const targetSentiment = useAuraStore((s) => s.sentimentScore);
  const targetEnergy = useAuraStore((s) => s.energy);
  const smoothSentiment = useRef(0.5);
  const smoothEnergy = useRef(0.3);

  let zoff = 0;

  const setup = (p5: p5Type, canvasParentRef: Element) => {
    const cnv = p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.noiseDetail(2, 0.5);
  };

  const windowResized = (p5: p5Type) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };

  const draw = (p5: p5Type) => {
    // Smoothly approach targets
    smoothSentiment.current = p5.lerp(smoothSentiment.current, targetSentiment, 0.05);
    smoothEnergy.current = p5.lerp(smoothEnergy.current, targetEnergy, 0.08);
    const sentimentScore = smoothSentiment.current;
    const energy = smoothEnergy.current;

    // Background with slight alpha to create trails
    p5.background(12, 16, 32, 20);
    const cols = Math.floor(50 + energy * 30);
    const rows = Math.floor(30 + energy * 18);
    const scale = Math.min(p5.width / cols, p5.height / rows);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = x / cols;
        const ny = y / rows;

        const angle = p5.noise(nx * 2.2, ny * 2.2, zoff) * p5.TWO_PI * (1.5 + energy * 1.5);
        const vX = Math.cos(angle);
        const vY = Math.sin(angle);

        const px = x * scale + scale * 0.5;
        const py = y * scale + scale * 0.5;

        const hue = p5.map(sentimentScore, 0, 1, 210, 20);
        const sat = p5.map(energy, 0, 1, 60, 95);
        const bri = p5.map(sentimentScore, 0, 1, 70, 95);
        const alpha = p5.map(energy, 0, 1, 50, 200);
        p5.stroke(hue, sat, bri, alpha);
        p5.strokeWeight(p5.map(energy, 0, 1, 0.6, 1.8));
        p5.push();
        p5.translate(px, py);
        const len = p5.map(energy, 0, 1, 6, 14);
        p5.line(0, 0, vX * len, vY * len);
        p5.pop();
      }
    }
    zoff += 0.003 + energy * 0.012;
  };

  const preload = (p5: p5Type) => {
    p5.colorMode(p5.HSB, 360, 100, 100, 255);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <Sketch setup={setup} draw={draw} windowResized={windowResized} preload={preload} />
    </div>
  );
}

