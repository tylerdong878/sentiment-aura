import Sketch from 'react-p5';
import type p5Type from 'p5';
import useAuraStore from '../state/auraStore';

export default function AuraCanvas() {
  const sentimentScore = useAuraStore((s) => s.sentimentScore);
  const energy = useAuraStore((s) => s.energy);

  let zoff = 0;

  const setup = (p5: p5Type, canvasParentRef: Element) => {
    const cnv = p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.noiseDetail(2, 0.5);
  };

  const windowResized = (p5: p5Type) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };

  const draw = (p5: p5Type) => {
    // Background with slight alpha to create trails
    p5.background(12, 16, 32, 20);
    const cols = 60;
    const rows = 36;
    const scale = Math.min(p5.width / cols, p5.height / rows);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = x / cols;
        const ny = y / rows;

        const angle = p5.noise(nx * 2, ny * 2, zoff) * p5.TWO_PI * 2;
        const vX = Math.cos(angle);
        const vY = Math.sin(angle);

        const px = x * scale + scale * 0.5;
        const py = y * scale + scale * 0.5;

        const hue = p5.map(sentimentScore, 0, 1, 210, 20);
        const alpha = p5.map(energy, 0, 1, 60, 180);
        p5.stroke(hue, 80, 90, alpha);
        p5.strokeWeight(p5.map(energy, 0, 1, 0.6, 1.6));
        p5.push();
        p5.translate(px, py);
        p5.line(0, 0, vX * 8, vY * 8);
        p5.pop();
      }
    }
    zoff += 0.003 + energy * 0.01;
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

