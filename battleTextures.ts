import * as THREE from 'three';

let cachedHexTileRunicTexture: THREE.CanvasTexture | null = null;
let cachedArenaFloorTexture: THREE.CanvasTexture | null = null;
let cachedBrushedMetalRoughnessMap: THREE.CanvasTexture | null = null;
let cachedClothWeaveBumpMap: THREE.CanvasTexture | null = null;
let cachedClothLeatherRoughnessMap: THREE.CanvasTexture | null = null;
let cachedStoneGrainBumpMap: THREE.CanvasTexture | null = null;
let cachedContactShadowTexture: THREE.CanvasTexture | null = null;

/**
 * Textura PBR procedural compartida de metal cepillado (roughnessMap lineal)
 * para realzar los reflejos IBL en armaduras, yelmos, coronas y hojas de armas.
 */
export function getBrushedMetalRoughnessMap(): THREE.CanvasTexture {
  if (cachedBrushedMetalRoughnessMap) {
    return cachedBrushedMetalRoughnessMap;
  }
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(0, 0, size, size);

  // Líneas de cepillado fino horizontal/diagonal
  for (let y = 0; y < size; y++) {
    const band = 175 + Math.floor((Math.sin(y * 0.7) * 0.5 + (Math.random() - 0.5)) * 45);
    const v = Math.min(245, Math.max(120, band));
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, size, 1);
  }

  for (let i = 0; i < 420; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 18 + Math.random() * 52;
    const shade = Math.random() > 0.5 ? 238 : 132;
    ctx.strokeStyle = `rgba(${shade},${shade},${shade},0.35)`;
    ctx.lineWidth = Math.random() > 0.7 ? 1.4 : 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.NoColorSpace;
  texture.userData = texture.userData || {};
  texture.userData.sharedAsset = true;
  cachedBrushedMetalRoughnessMap = texture;
  return texture;
}

/**
 * Textura PBR procedural compartida de tejido entramado (bumpMap lineal)
 * para túnicas, capas, capuchas y alas textiles.
 */
export function getClothWeaveBumpMap(): THREE.CanvasTexture {
  if (cachedClothWeaveBumpMap) {
    return cachedClothWeaveBumpMap;
  }
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  const step = 4;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const checker = ((x / step) + (y / step)) % 2 === 0;
      const base = checker ? 168 : 96;
      const jitter = Math.floor((Math.random() - 0.5) * 20);
      const v = Math.min(240, Math.max(40, base + jitter));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, step - 1, step - 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.NoColorSpace;
  texture.userData = texture.userData || {};
  texture.userData.sharedAsset = true;
  cachedClothWeaveBumpMap = texture;
  return texture;
}

/**
 * Textura PBR procedural compartida de rugosidad para tela y cuero (roughnessMap lineal)
 * que aporta micro-variación mate/satinada a túnicas, pantalones, delantales y botas.
 */
export function getClothLeatherRoughnessMap(): THREE.CanvasTexture {
  if (cachedClothLeatherRoughnessMap) {
    return cachedClothLeatherRoughnessMap;
  }
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c4c4c4';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const weave = Math.sin(x * 0.85) * 14 + Math.cos(y * 0.85) * 14;
      const grain = (Math.random() - 0.5) * 34;
      const v = Math.min(250, Math.max(140, 198 + weave + grain));
      d[idx] = v;
      d[idx + 1] = v;
      d[idx + 2] = v;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.NoColorSpace;
  texture.userData = texture.userData || {};
  texture.userData.sharedAsset = true;
  cachedClothLeatherRoughnessMap = texture;
  return texture;
}

/**
 * Textura PBR procedural compartida de grano mineral/cuero (bumpMap lineal)
 * para armaduras de roca, gólems, arcos de madera y grebas.
 */
export function getStoneGrainBumpMap(): THREE.CanvasTexture {
  if (cachedStoneGrainBumpMap) {
    return cachedStoneGrainBumpMap;
  }
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = 128 + (Math.random() - 0.5) * 90;
    const v = Math.min(255, Math.max(0, n));
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  for (let i = 0; i < 65; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 10 + Math.random() * 28;
    const ang = Math.random() * Math.PI * 2;
    ctx.strokeStyle = Math.random() > 0.4 ? 'rgba(30,30,30,0.45)' : 'rgba(220,220,220,0.3)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.NoColorSpace;
  texture.userData = texture.userData || {};
  texture.userData.sharedAsset = true;
  cachedStoneGrainBumpMap = texture;
  return texture;
}

/**
 * Textura radial suave compartida para sombra de contacto bajo cada pedestal
 * (especialmente útil en móvil donde el shadowMap está desactivado).
 */
export function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedContactShadowTexture) {
    return cachedContactShadowTexture;
  }
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, size * 0.08, c, c, size * 0.48);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.72)');
  grad.addColorStop(0.5, 'rgba(2, 6, 23, 0.42)');
  grad.addColorStop(0.82, 'rgba(2, 6, 23, 0.12)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.userData = texture.userData || {};
  texture.userData.sharedAsset = true;
  cachedContactShadowTexture = texture;
  return texture;
}

/**
 * Textura procedural de Hexágono Rúnico de Piedra Antigua.
 * Genera bisel exterior, relieve de cantería y runas arcanas concéntricas.
 */
export function getHexTileRunicTexture(): THREE.CanvasTexture {
  if (cachedHexTileRunicTexture) {
    return cachedHexTileRunicTexture;
  }
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Base de Granito Oscuro
  ctx.fillStyle = '#1e2532';
  ctx.fillRect(0, 0, size, size);

  // 2. Grano y ruido mineral
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 26;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise + 2));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise + 6));
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Bisel Hexagonal Interior
  const cx = size / 2;
  const cy = size / 2;
  const rad = size * 0.44;

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const x = cx + rad * Math.cos(angle);
    const y = cy + rad * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#0f141d';
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#38bdf8';
  ctx.shadowColor = '#0284c7';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.restore();

  // 4. Glifo Rúnico Central y Círculos de Canalización
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.24, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Estrella rúnica interna de 6 puntas
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a1 = (Math.PI / 3) * i;
    const a2 = (Math.PI / 3) * ((i + 2) % 6);
    ctx.moveTo(cx + Math.cos(a1) * size * 0.22, cy + Math.sin(a1) * size * 0.22);
    ctx.lineTo(cx + Math.cos(a2) * size * 0.22, cy + Math.sin(a2) * size * 0.22);
  }
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.userData = texture.userData || {};
  texture.userData.sharedAsset = true;
  cachedHexTileRunicTexture = texture;
  return texture;
}

/**
 * Textura procedural de la Fosa del Coliseo y Arena de Combate.
 * Genera losas circulares de cantería y arena compactada.
 */
export function getArenaFloorTexture(): THREE.CanvasTexture {
  if (cachedArenaFloorTexture) {
    return cachedArenaFloorTexture;
  }
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base oscura de arena volcánica y grava
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);

  // Ruido de arena
  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random();
    ctx.fillStyle = r < 0.3 ? '#1e293b' : r < 0.7 ? '#0b0f19' : '#334155';
    ctx.fillRect(x, y, 1.8, 1.8);
  }

  // Anillos concéntricos de cantería
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#090d16';
  for (let radius = 50; radius < size * 0.75; radius += 42) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.userData = texture.userData || {};
  texture.userData.sharedAsset = true;
  cachedArenaFloorTexture = texture;
  return texture;
}
