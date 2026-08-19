import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const modelDirectory = path.resolve(process.cwd(), 'public/assets/models');
const files = (await readdir(modelDirectory)).filter((file) => file.endsWith('.glb')).sort();

function inspectGlb(buffer) {
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546c67) throw new Error('Not a GLB file');
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) throw new Error('GLB has no JSON first chunk');
  const data = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim());
  const triangles = (data.meshes ?? []).reduce((total, mesh) => total + (mesh.primitives ?? []).reduce((primitiveTotal, primitive) => {
    const count = primitive.indices !== undefined ? data.accessors?.[primitive.indices]?.count ?? 0 : data.accessors?.[primitive.attributes?.POSITION]?.count ?? 0;
    const mode = primitive.mode ?? 4;
    return primitiveTotal + (mode === 4 ? Math.floor(count / 3) : 0);
  }, 0), 0);
  return {
    meshes: data.meshes?.length ?? 0,
    nodes: data.nodes?.length ?? 0,
    materials: data.materials?.length ?? 0,
    textures: data.textures?.length ?? 0,
    images: data.images?.length ?? 0,
    animations: data.animations?.length ?? 0,
    triangles,
  };
}

const report = [];
for (const file of files) {
  const buffer = await readFile(path.join(modelDirectory, file));
  report.push({ model: file, bytes: buffer.byteLength, ...inspectGlb(buffer) });
}
console.table(report.map(({ bytes, ...item }) => ({ ...item, kb: Math.round(bytes / 1024) })));
const total = report.reduce((sum, item) => sum + item.triangles, 0);
console.log(`Total static landmark triangles: ${total}`);
