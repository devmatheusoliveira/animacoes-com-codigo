import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const candidates = [process.env.OPENSCAD_BINARY, 'C:/Program Files (x86)/OpenSCAD/openscad.com', 'C:/Program Files/OpenSCAD/openscad.com'].filter(Boolean);
const binary = candidates.find((candidate) => existsSync(candidate)) ?? 'openscad';
const names = ['01-bloco', '02-furo', '03-suporte'];
const expectedVolumes = [64 * 44 * 10, 64 * 44 * 10 - Math.PI * 9 ** 2 * 10, 64 * 44 * 10 - Math.PI * (9 ** 2 + 2 * 3 ** 2) * 10];

for (const [index, name] of names.entries()) {
  const source = path.join(root, 'public/models/openscad', `${name}.scad`);
  const target = path.join(root, 'public/models/openscad', `${name}.stl`);
  const result = spawnSync(binary, ['--hardwarnings', '--export-format', 'binstl', '-o', target, source], { encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) throw result.error ?? new Error(result.stderr || `OpenSCAD failed for ${name}`);
  const data = readFileSync(target);
  const triangles = data.readUInt32LE(80);
  if (data.length !== 84 + triangles * 50 || !triangles) throw new Error(`Invalid STL: ${target}`);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let volume = 0;
  for (let face = 0; face < triangles; face++) {
    const vertices = [0, 1, 2].map((vertex) => [0, 1, 2].map((axis) => data.readFloatLE(84 + face * 50 + 12 + vertex * 12 + axis * 4)));
    for (const vertex of vertices) for (let axis = 0; axis < 3; axis++) {
      if (!Number.isFinite(vertex[axis])) throw new Error(`Non-finite vertex: ${name}`);
      min[axis] = Math.min(min[axis], vertex[axis]);
      max[axis] = Math.max(max[axis], vertex[axis]);
    }
    const [a, b, c] = vertices;
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  const size = max.map((value, axis) => value - min[axis]);
  if (size.some((value, axis) => Math.abs(value - [64, 44, 10][axis]) > 0.01)) throw new Error(`Unexpected dimensions: ${name}`);
  if (Math.abs(Math.abs(volume) - expectedVolumes[index]) / expectedVolumes[index] > 0.01) throw new Error(`Unexpected volume: ${name}`);
  console.log(`${name}.stl: ${triangles} triangles, ${size.join(' × ')} mm, ${Math.abs(volume).toFixed(1)} mm³`);
}
