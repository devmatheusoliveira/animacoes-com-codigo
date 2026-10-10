import http from 'node:http';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const cache = path.join(root, 'out/openscad-live');
const candidates = [process.env.OPENSCAD_BINARY, 'C:/Program Files (x86)/OpenSCAD/openscad.com', 'C:/Program Files/OpenSCAD/openscad.com'].filter(Boolean);
const binary = candidates.find((candidate) => existsSync(candidate)) ?? 'openscad';
const names = ['01-bloco', '02-furo', '03-suporte'];
const pending = new Map();
let queue = Promise.resolve();

function compile(source, target) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, ['--hardwarnings', '--export-format', 'binstl', '-o', target, source], { windowsHide: true });
    let error = '';
    child.stderr.on('data', (data) => { error += data; });
    const timeout = setTimeout(() => { child.kill(); reject(new Error('OpenSCAD excedeu 20 segundos.')); }, 20000);
    child.on('error', (err) => { clearTimeout(timeout); reject(err); });
    child.on('close', (code) => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error(error || 'Falha ao compilar OpenSCAD.')); });
  });
}

async function render(name, center, mount) {
  const original = await readFile(path.join(root, 'public/models/openscad', `${name}.scad`), 'utf8');
  const code = original.replace(/d = 18\b/g, `d = ${center}`).replace(/d = 6\b/g, `d = ${mount}`).trimEnd();
  const key = createHash('sha256').update(code).digest('hex').slice(0, 24);
  const directory = path.join(cache, key);
  const source = path.join(directory, `${name}.scad`);
  const target = path.join(directory, `${name}.stl`);
  if (!existsSync(target)) {
    if (!pending.has(key)) {
      const job = queue.catch(() => {}).then(async () => {
        await mkdir(directory, { recursive: true });
        await writeFile(source, `${code}\n`);
        await compile(source, target);
        const data = await readFile(target);
        if (data.length < 84 || data.length !== 84 + data.readUInt32LE(80) * 50) throw new Error('STL inválido.');
      });
      queue = job;
      pending.set(key, job);
      job.then(() => pending.delete(key), () => pending.delete(key));
    }
    await pending.get(key);
  }
  return { code, centerDiameter: center, mountDiameter: mount, model: `http://127.0.0.1:3031/models/${key}/${name}.stl` };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) { res.writeHead(403).end(); return; }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  try {
    const url = new URL(req.url, 'http://127.0.0.1:3031');
    if (url.pathname === '/health') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ status: 'ok', engine: 'OpenSCAD' })); return; }
    if (url.pathname === '/render') {
      const name = url.searchParams.get('stage');
      const center = Number(url.searchParams.get('center'));
      const mount = Number(url.searchParams.get('mount'));
      if (!names.includes(name) || !Number.isFinite(center) || center < 4 || center > 28 || !Number.isFinite(mount) || mount < 2 || mount > 10) {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Use furo central entre 4 e 28 mm e fixação entre 2 e 10 mm.' })); return;
      }
      const result = await render(name, Math.round(center * 10) / 10, Math.round(mount * 10) / 10);
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(result)); return;
    }
    const match = url.pathname.match(/^\/models\/([a-f0-9]{24})\/(01-bloco|02-furo|03-suporte)\.stl$/);
    if (match) {
      const data = await readFile(path.join(cache, match[1], `${match[2]}.stl`));
      res.writeHead(200, { 'Content-Type': 'model/stl', 'Cache-Control': 'public, max-age=31536000, immutable' }); res.end(data); return;
    }
    res.writeHead(404).end();
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message }));
  }
});
server.listen(3031, '127.0.0.1', () => console.log('OpenSCAD live: http://127.0.0.1:3031 · altere os diâmetros no painel Props do Studio.'));
