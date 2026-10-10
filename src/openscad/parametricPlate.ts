import { ExtrudeGeometry, Path, Shape } from "three";

// Same rectangular profile and circular cuts as 03-suporte.scad.
// Only the changing parameter is rebuilt between the exported STL keyframes.
export const createPlateGeometry = (centerDiameter: number, mountDiameter: number) => {
  const shape = new Shape();
  shape.moveTo(-32, -22);
  shape.lineTo(32, -22);
  shape.lineTo(32, 22);
  shape.lineTo(-32, 22);
  shape.closePath();
  for (const [x, diameter] of [[0, centerDiameter], [-23, mountDiameter], [23, mountDiameter]]) {
    const hole = new Path();
    hole.absarc(x, 0, diameter / 2, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geometry = new ExtrudeGeometry(shape, { depth: 10, bevelEnabled: false, curveSegments: 48, steps: 1 });
  geometry.translate(0, 0, -5);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
};
