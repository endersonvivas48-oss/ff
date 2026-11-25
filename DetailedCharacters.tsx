import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { markGeometryAsShared, markMaterialAsShared, useSceneTimer } from './ThreeSceneCleanup';
import { isMobileOptimizationTarget } from './glbRuntimeOptimizer';
import { mergeStaticGeometries } from './InstancedGlbGroup';
import {
  getBrushedMetalRoughnessMap,
  getClothLeatherRoughnessMap,
  getClothWeaveBumpMap,
  getContactShadowTexture,
  getStoneGrainBumpMap,
} from './battleTextures';

const tempNpcWorldPos = new THREE.Vector3();

export type DetailedNpcRole = 'MERCHANT' | 'BLACKSMITH' | 'CHALLENGER' | 'CITIZEN' | 'TAVERN_KEEPER';

interface DetailedNPCProps {
  id: string;
  name: string;
  title: string;
  role: DetailedNpcRole;
  color: string;
  position: [number, number, number];
  isNear?: boolean;
  isNearRef?: React.MutableRefObject<boolean>;
  isWalking?: boolean;
  isWalkingRef?: React.MutableRefObject<boolean>;
  isPaused?: boolean;
  castShadow?: boolean;
  onInteract?: () => void;
}

// ========================================================
// GEOMETRÍAS Y MATERIALES COMPARTIDOS PARA EL AVATAR DEL JUGADOR
// (Se declaran primero para poder reutilizar piezas en CHALLENGER y NPCs)
// ========================================================
const sharedPlayerGeos = {
  thigh: markGeometryAsShared(new THREE.CapsuleGeometry(0.13, 0.32, 8, 16)),
  knee: markGeometryAsShared(new THREE.SphereGeometry(0.11, 14, 14)),
  boot: markGeometryAsShared(new THREE.CapsuleGeometry(0.11, 0.28, 8, 14)),
  bootToe: markGeometryAsShared(new THREE.CapsuleGeometry(0.09, 0.16, 8, 12)),
  belt: markGeometryAsShared(new THREE.TorusGeometry(0.34, 0.07, 12, 28)),
  buckle: markGeometryAsShared(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16)),
  smallSphere: markGeometryAsShared(new THREE.SphereGeometry(0.06, 12, 12)),
  pouch: markGeometryAsShared(new THREE.SphereGeometry(0.12, 14, 14)),
  hipOrb: markGeometryAsShared(new THREE.SphereGeometry(0.09, 16, 16)),
  abdomen: markGeometryAsShared(new THREE.CapsuleGeometry(0.27, 0.28, 10, 20)),
  chest: markGeometryAsShared(new THREE.CapsuleGeometry(0.31, 0.32, 10, 22)),
  pec: markGeometryAsShared(new THREE.SphereGeometry(0.16, 14, 14)),
  chestTrim: markGeometryAsShared(new THREE.CapsuleGeometry(0.035, 0.26, 8, 16)),
  pauldronOuter: markGeometryAsShared(new THREE.SphereGeometry(0.21, 16, 16)),
  pauldronInner: markGeometryAsShared(new THREE.SphereGeometry(0.19, 14, 14)),
  upperArm: markGeometryAsShared(new THREE.CapsuleGeometry(0.09, 0.28, 8, 16)),
  elbow: markGeometryAsShared(new THREE.SphereGeometry(0.085, 12, 12)),
  forearm: markGeometryAsShared(new THREE.CapsuleGeometry(0.095, 0.22, 8, 16)),
  hand: markGeometryAsShared(new THREE.SphereGeometry(0.09, 12, 12)),
  neck: markGeometryAsShared(new THREE.CylinderGeometry(0.11, 0.14, 0.16, 14)),
  head: markGeometryAsShared(new THREE.SphereGeometry(0.26, 22, 22)),
  hairCap: markGeometryAsShared(new THREE.SphereGeometry(0.28, 18, 18)),
  hairStrand: markGeometryAsShared(new THREE.CapsuleGeometry(0.06, 0.2, 6, 12)),
  crownRing: markGeometryAsShared(new THREE.TorusGeometry(0.25, 0.038, 10, 26)),
  crownSpike: markGeometryAsShared(new THREE.ConeGeometry(0.045, 0.12, 10)),
  crownGem: markGeometryAsShared(new THREE.SphereGeometry(0.07, 14, 14)),
  swordGrip: markGeometryAsShared(new THREE.CylinderGeometry(0.03, 0.035, 0.26, 12)),
  swordGuard: markGeometryAsShared(new THREE.CapsuleGeometry(0.045, 0.28, 8, 16)),
  swordScabbard: markGeometryAsShared(new THREE.CapsuleGeometry(0.075, 1.05, 8, 16)),
  swordRune: markGeometryAsShared(new THREE.CapsuleGeometry(0.02, 0.75, 4, 8)),
  capeTopCenter: markGeometryAsShared(new THREE.CapsuleGeometry(0.11, 0.5, 8, 16)),
  capeTopSide: markGeometryAsShared(new THREE.CapsuleGeometry(0.08, 0.46, 6, 12)),
  capeMidCenter: markGeometryAsShared(new THREE.CapsuleGeometry(0.13, 0.52, 8, 16)),
  capeMidSide: markGeometryAsShared(new THREE.CapsuleGeometry(0.09, 0.48, 6, 12)),
  capeTailCenter: markGeometryAsShared(new THREE.CapsuleGeometry(0.14, 0.42, 8, 16)),
  capeTailTrim: markGeometryAsShared(new THREE.CapsuleGeometry(0.04, 0.68, 6, 12)),
};

const sharedPlayerMats = {
  thigh: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.6 })),
  goldTrim92: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.92, roughness: 0.2 })),
  goldTrim95: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.95, roughness: 0.18 })),
  goldTrim95r2: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.95, roughness: 0.2 })),
  goldCrown: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.96, roughness: 0.16 })),
  goldCapeTrim: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.85, roughness: 0.25 })),
  bootLeather: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1e1b18', roughness: 0.65, metalness: 0.3 })),
  steelToe: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.85, roughness: 0.25 })),
  beltLeather: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#2d1606', roughness: 0.7 })),
  sapphireGem: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 1.2, roughness: 0.1 })
  ),
  pouchLeather: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.85 })),
  hipOrb: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#38bdf8', emissiveIntensity: 1.5, roughness: 0.1 })
  ),
  abdomenBlue: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0369a1', roughness: 0.35, metalness: 0.6 })),
  chestBlue: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.25, metalness: 0.75 })),
  pecBlue: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0369a1', roughness: 0.3, metalness: 0.7 })),
  pauldronSilver: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.92, roughness: 0.18 })),
  upperArmBlue: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.4 })),
  forearmSteel: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.2 })),
  handDark: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.6, roughness: 0.4 })),
  skinNeck: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.8 })),
  skinHead: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.7 })),
  hairBrown: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#3b1e08', roughness: 0.85 })),
  swordGripLeather: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1e1b18', roughness: 0.8 })),
  scabbardBlue: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0c4a6e', roughness: 0.5 })),
  swordRuneGlow: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#38bdf8', emissiveIntensity: 1.6 })
  ),
  capeTop: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.8 })),
  capeMid: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0369a1', roughness: 0.82 })),
  capeDeep: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#075985', roughness: 0.85 })),
  capeTail: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#075985', roughness: 0.86 })),
};

// ========================================================
// GEOMETRÍAS, FUSIONES ESTÁTICAS Y MATERIALES PBR PARA NPCs
// ========================================================
const _tmpEyeGeo = new THREE.SphereGeometry(0.032, 8, 8);
const _tmpBrowGeo = new THREE.BoxGeometry(0.068, 0.022, 0.024);
const _tmpBeardJawGeo = new THREE.SphereGeometry(0.145, 10, 8);
const _tmpBeardChinGeo = new THREE.ConeGeometry(0.115, 0.17, 8);
const _tmpMustacheGeo = new THREE.CapsuleGeometry(0.022, 0.09, 4, 6);

const _tmpApronBibGeo = new THREE.BoxGeometry(0.34, 0.36, 0.055);
const _tmpApronSkirtGeo = new THREE.BoxGeometry(0.4, 0.44, 0.055);
const _tmpApronStrapGeo = new THREE.TorusGeometry(0.255, 0.026, 6, 18);

const _tmpHammerHeadGeo = new THREE.BoxGeometry(0.16, 0.14, 0.28);
const _tmpHammerCollarGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.08, 8);
const _tmpHammerHandleGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.46, 8);

const _tmpBeretCrownGeo = new THREE.SphereGeometry(0.25, 14, 10);
const _tmpBeretRimGeo = new THREE.TorusGeometry(0.22, 0.042, 8, 20);
const _tmpTravelerBrimGeo = new THREE.CylinderGeometry(0.37, 0.39, 0.035, 18);
const _tmpTravelerCrownGeo = new THREE.CylinderGeometry(0.18, 0.23, 0.2, 14);
const _tmpHeadbandGeo = new THREE.TorusGeometry(0.225, 0.028, 6, 20);

const _tmpVestPanelGeo = new THREE.BoxGeometry(0.14, 0.44, 0.08);
const _tmpShortCapeGeo = new THREE.BoxGeometry(0.44, 0.48, 0.06);

const _tmpMugCupGeo = new THREE.CylinderGeometry(0.095, 0.082, 0.21, 10);
const _tmpMugHandleGeo = new THREE.TorusGeometry(0.065, 0.018, 6, 10, Math.PI);
const _tmpMugFoamGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.035, 10);

const sharedNpcGeos = {
  leg: markGeometryAsShared(new THREE.CapsuleGeometry(0.08, 0.42, 6, 12)),
  boot: markGeometryAsShared(new THREE.CapsuleGeometry(0.07, 0.16, 4, 8)),
  torso: markGeometryAsShared(new THREE.CapsuleGeometry(0.24, 0.44, 8, 16)),
  arm: markGeometryAsShared(new THREE.CapsuleGeometry(0.072, 0.34, 6, 12)),
  hand: markGeometryAsShared(new THREE.SphereGeometry(0.068, 10, 10)),
  neck: markGeometryAsShared(new THREE.CylinderGeometry(0.082, 0.105, 0.16, 10)),
  head: markGeometryAsShared(new THREE.SphereGeometry(0.22, 20, 20)),
  hairCapBase: markGeometryAsShared(new THREE.SphereGeometry(0.23, 14, 14)),
  hairLongTail: markGeometryAsShared(new THREE.CapsuleGeometry(0.085, 0.22, 6, 10)),
  eyes: mergeStaticGeometries([
    { geometry: _tmpEyeGeo, position: [-0.078, 0.024, 0.196] },
    { geometry: _tmpEyeGeo, position: [0.078, 0.024, 0.196] },
  ]),
  nearRing: markGeometryAsShared(new THREE.RingGeometry(0.7, 0.85, 32)),
  nearDiamond: markGeometryAsShared(new THREE.OctahedronGeometry(0.11, 0)),
  contactShadow: markGeometryAsShared(new THREE.PlaneGeometry(1.24, 1.24)),

  // Accesorios fusionados por rol (minimizan draw calls)
  apron: mergeStaticGeometries([
    { geometry: _tmpApronBibGeo, position: [0, 1.15, 0.225] },
    { geometry: _tmpApronSkirtGeo, position: [0, 0.78, 0.21], rotation: [-0.08, 0, 0] },
    { geometry: _tmpApronStrapGeo, position: [0, 0.96, 0], rotation: [Math.PI / 2, 0, 0] },
  ]),
  hammerHead: mergeStaticGeometries([
    { geometry: _tmpHammerHeadGeo, position: [0, 0.21, 0] },
    { geometry: _tmpHammerCollarGeo, position: [0, 0.13, 0] },
  ]),
  hammerHandle: markGeometryAsShared(_tmpHammerHandleGeo.clone()),

  merchantVestCape: mergeStaticGeometries([
    { geometry: _tmpVestPanelGeo, position: [-0.15, 1.18, 0.19], rotation: [0, 0.22, 0] },
    { geometry: _tmpVestPanelGeo, position: [0.15, 1.18, 0.19], rotation: [0, -0.22, 0] },
    { geometry: _tmpShortCapeGeo, position: [0, 1.16, -0.24], rotation: [0.14, 0, 0] },
  ]),
  merchantPouch: mergeStaticGeometries([
    { geometry: sharedPlayerGeos.pouch, position: [0.27, 0.9, 0.12], scale: [0.82, 0.9, 0.75] },
    { geometry: _tmpApronStrapGeo, position: [0, 0.95, 0], rotation: [Math.PI / 2, 0, 0] },
  ]),
  merchantBeret: mergeStaticGeometries([
    { geometry: _tmpBeretRimGeo, position: [0, 0.13, -0.02], rotation: [Math.PI / 2 - 0.12, 0, 0] },
    {
      geometry: _tmpBeretCrownGeo,
      position: [0.02, 0.2, -0.03],
      rotation: [-0.12, 0, -0.14],
      scale: [1.05, 0.48, 1.05],
    },
  ]),

  tavernMugBody: mergeStaticGeometries([
    { geometry: _tmpMugCupGeo, position: [0, 0, 0] },
    { geometry: _tmpMugHandleGeo, position: [0.09, 0, 0], rotation: [0, 0, -Math.PI / 2] },
  ]),
  tavernMugFoam: markGeometryAsShared(_tmpMugFoamGeo.clone()),

  challengerPauldrons: mergeStaticGeometries([
    { geometry: sharedPlayerGeos.pauldronOuter, position: [-0.36, 1.4, 0], scale: [0.82, 0.82, 0.82] },
    { geometry: sharedPlayerGeos.pauldronOuter, position: [0.36, 1.4, 0], scale: [0.82, 0.82, 0.82] },
  ]),
  challengerPauldronTrim: mergeStaticGeometries([
    { geometry: sharedPlayerGeos.pauldronInner, position: [-0.38, 1.35, 0], scale: [0.76, 0.76, 0.76] },
    { geometry: sharedPlayerGeos.pauldronInner, position: [0.38, 1.35, 0], scale: [0.76, 0.76, 0.76] },
  ]),
  challengerCirclet: mergeStaticGeometries([
    {
      geometry: sharedPlayerGeos.crownRing,
      position: [0, 0.14, 0],
      rotation: [Math.PI / 2, 0, 0],
      scale: [0.88, 0.88, 0.88],
    },
    {
      geometry: sharedPlayerGeos.crownSpike,
      position: [0, 0.2, 0.21],
      scale: [0.9, 0.9, 0.9],
    },
  ]),
  challengerSwordScabbard: mergeStaticGeometries([
    { geometry: sharedPlayerGeos.swordScabbard, position: [0, -0.1, 0], scale: [0.62, 0.62, 0.62] },
  ]),
  challengerSwordHilt: mergeStaticGeometries([
    { geometry: sharedPlayerGeos.swordGrip, position: [0, 0.36, 0], scale: [0.62, 0.62, 0.62] },
    {
      geometry: sharedPlayerGeos.swordGuard,
      position: [0, 0.27, 0],
      rotation: [0, 0, Math.PI / 2],
      scale: [0.62, 0.62, 0.62],
    },
  ]),

  citizenCapHat: mergeStaticGeometries([
    { geometry: _tmpBeretRimGeo, position: [0, 0.13, -0.02], rotation: [Math.PI / 2 - 0.1, 0, 0] },
    { geometry: _tmpBeretCrownGeo, position: [0, 0.19, -0.03], scale: [1.0, 0.5, 1.0] },
  ]),
  citizenTravelerHat: mergeStaticGeometries([
    { geometry: _tmpTravelerBrimGeo, position: [0, 0.15, -0.02], rotation: [-0.08, 0, 0] },
    { geometry: _tmpTravelerCrownGeo, position: [0, 0.25, -0.03], rotation: [-0.08, 0, 0] },
  ]),
  citizenHeadband: markGeometryAsShared(_tmpHeadbandGeo.clone()),
};

// Caché de geometría fusionada (cejas + cabello + barba opcional) para mantener 1 draw call por rostro
const npcHairFeatureCache = new Map<string, THREE.BufferGeometry>();

function getNpcHairFeatureGeometry(hairStyle: number, hasBeard: boolean): THREE.BufferGeometry {
  const key = `${hairStyle}_${hasBeard ? 1 : 0}`;
  let cached = npcHairFeatureCache.get(key);
  if (cached) return cached;

  const parts: Array<{
    geometry: THREE.BufferGeometry;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
  }> = [
    // Cejas integradas al mismo material del cabello
    { geometry: _tmpBrowGeo, position: [-0.078, 0.082, 0.204], rotation: [0, 0, 0.1] },
    { geometry: _tmpBrowGeo, position: [0.078, 0.082, 0.204], rotation: [0, 0, -0.1] },
    // Casquete base de cabello
    { geometry: sharedNpcGeos.hairCapBase, position: [0, 0.08, -0.04], scale: [1.0, 0.96, 1.0] },
  ];

  if (hairStyle === 1) {
    // Estilo con patillas / mechones laterales
    parts.push(
      { geometry: sharedPlayerGeos.hairStrand, position: [-0.18, -0.01, 0.04], rotation: [0.22, 0, -0.15], scale: [0.8, 0.72, 0.8] },
      { geometry: sharedPlayerGeos.hairStrand, position: [0.18, -0.01, 0.04], rotation: [0.22, 0, 0.15], scale: [0.8, 0.72, 0.8] }
    );
  } else if (hairStyle === 2) {
    // Cabello largo recogido atrás
    parts.push(
      { geometry: sharedNpcGeos.hairLongTail, position: [0, -0.06, -0.2], rotation: [0.28, 0, 0] },
      { geometry: sharedPlayerGeos.hairStrand, position: [-0.18, -0.02, 0.05], rotation: [0.25, 0, -0.12], scale: [0.75, 0.8, 0.75] },
      { geometry: sharedPlayerGeos.hairStrand, position: [0.18, -0.02, 0.05], rotation: [0.25, 0, 0.12], scale: [0.75, 0.8, 0.75] }
    );
  }

  if (hasBeard) {
    parts.push(
      { geometry: _tmpBeardJawGeo, position: [0, -0.11, 0.1], scale: [1.0, 0.82, 0.85] },
      { geometry: _tmpBeardChinGeo, position: [0, -0.2, 0.13], rotation: [Math.PI, 0, 0] },
      { geometry: _tmpMustacheGeo, position: [0, -0.048, 0.215], rotation: [0, 0, Math.PI / 2] }
    );
  }

  cached = mergeStaticGeometries(parts);
  npcHairFeatureCache.set(key, cached);
  return cached;
}

// Liberar geometrías temporales de un solo uso tras construir las fusiones estáticas
[
  _tmpEyeGeo,
  _tmpBrowGeo,
  _tmpBeardJawGeo,
  _tmpBeardChinGeo,
  _tmpMustacheGeo,
  _tmpApronBibGeo,
  _tmpApronSkirtGeo,
  _tmpApronStrapGeo,
  _tmpHammerHeadGeo,
  _tmpHammerCollarGeo,
  _tmpHammerHandleGeo,
  _tmpBeretCrownGeo,
  _tmpBeretRimGeo,
  _tmpTravelerBrimGeo,
  _tmpTravelerCrownGeo,
  _tmpHeadbandGeo,
  _tmpVestPanelGeo,
  _tmpShortCapeGeo,
  _tmpMugCupGeo,
  _tmpMugHandleGeo,
  _tmpMugFoamGeo,
].forEach((g) => g.dispose());

const sharedNpcFixedMats = {
  pants: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.78,
      roughnessMap: getClothLeatherRoughnessMap(),
      bumpMap: getClothWeaveBumpMap(),
      bumpScale: 0.015,
    })
  ),
  boots: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.72,
      roughnessMap: getClothLeatherRoughnessMap(),
      bumpMap: getStoneGrainBumpMap(),
      bumpScale: 0.018,
    })
  ),
  eyes: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.2, metalness: 0.1 })),
  darkGlove: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#1c1917',
      roughness: 0.74,
      roughnessMap: getClothLeatherRoughnessMap(),
      bumpMap: getStoneGrainBumpMap(),
      bumpScale: 0.016,
    })
  ),
  steelGauntlet: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      metalness: 0.88,
      roughness: 0.26,
      roughnessMap: getBrushedMetalRoughnessMap(),
    })
  ),
  leatherApron: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#451a03',
      roughness: 0.76,
      roughnessMap: getClothLeatherRoughnessMap(),
      bumpMap: getStoneGrainBumpMap(),
      bumpScale: 0.022,
    })
  ),
  lightApron: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      roughness: 0.84,
      roughnessMap: getClothLeatherRoughnessMap(),
      bumpMap: getClothWeaveBumpMap(),
      bumpScale: 0.016,
    })
  ),
  merchantVelvet: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#4c1d95',
      roughness: 0.72,
      roughnessMap: getClothLeatherRoughnessMap(),
      bumpMap: getClothWeaveBumpMap(),
      bumpScale: 0.018,
    })
  ),
  merchantPouch: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#78350f',
      roughness: 0.78,
      roughnessMap: getClothLeatherRoughnessMap(),
      bumpMap: getStoneGrainBumpMap(),
      bumpScale: 0.02,
    })
  ),
  woodHandle: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#78350f',
      roughness: 0.78,
      bumpMap: getStoneGrainBumpMap(),
      bumpScale: 0.018,
    })
  ),
  ironTool: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      metalness: 0.88,
      roughness: 0.28,
      roughnessMap: getBrushedMetalRoughnessMap(),
    })
  ),
  mugOak: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#92400e',
      roughness: 0.65,
      metalness: 0.15,
      bumpMap: getStoneGrainBumpMap(),
      bumpScale: 0.016,
    })
  ),
  mugFoam: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.9 })),
  goldAccent: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      metalness: 0.92,
      roughness: 0.22,
      roughnessMap: getBrushedMetalRoughnessMap(),
    })
  ),
  scabbard: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.58,
      metalness: 0.35,
      bumpMap: getStoneGrainBumpMap(),
      bumpScale: 0.015,
    })
  ),
  citizenHatDark: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.8,
      roughnessMap: getClothLeatherRoughnessMap(),
      bumpMap: getClothWeaveBumpMap(),
      bumpScale: 0.016,
    })
  ),
  citizenHatLeather: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#713f12',
      roughness: 0.78,
      roughnessMap: getClothLeatherRoughnessMap(),
      bumpMap: getStoneGrainBumpMap(),
      bumpScale: 0.018,
    })
  ),
  nearRing: markMaterialAsShared(
    new THREE.MeshBasicMaterial({
      color: '#f59e0b',
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    })
  ),
  nearDiamond: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      emissive: '#f59e0b',
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.7,
    })
  ),
  contactShadow: markMaterialAsShared(
    new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  ),
};

const npcTorsoMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
const npcArmMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
const npcSkinMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
const npcHairMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

function getNpcTorsoMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = npcTorsoMaterialCache.get(color);
  if (!mat) {
    mat = markMaterialAsShared(
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.64,
        metalness: 0.16,
        roughnessMap: getClothLeatherRoughnessMap(),
        bumpMap: getClothWeaveBumpMap(),
        bumpScale: 0.016,
      })
    );
    npcTorsoMaterialCache.set(color, mat);
  }
  return mat;
}

function getNpcArmMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = npcArmMaterialCache.get(color);
  if (!mat) {
    mat = markMaterialAsShared(
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.68,
        roughnessMap: getClothLeatherRoughnessMap(),
        bumpMap: getClothWeaveBumpMap(),
        bumpScale: 0.014,
      })
    );
    npcArmMaterialCache.set(color, mat);
  }
  return mat;
}

function getNpcSkinMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = npcSkinMaterialCache.get(color);
  if (!mat) {
    mat = markMaterialAsShared(new THREE.MeshStandardMaterial({ color, roughness: 0.74 }));
    npcSkinMaterialCache.set(color, mat);
  }
  return mat;
}

function getNpcHairMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = npcHairMaterialCache.get(color);
  if (!mat) {
    mat = markMaterialAsShared(
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.88,
        bumpMap: getClothWeaveBumpMap(),
        bumpScale: 0.01,
      })
    );
    npcHairMaterialCache.set(color, mat);
  }
  return mat;
}

const NPC_SKIN_PALETTE = ['#fed7aa', '#fde2c4', '#e8b892', '#c68b59', '#9c6644'];
const NPC_HAIR_PALETTE = ['#332115', '#1c1917', '#78350f', '#b45309', '#64748b', '#451a03'];
const FEMININE_NPC_REGEX = /selene|lyra|valeria|lyanna|sariel|morgana|aurelia|seraphina|elara|nyx|hechicera|erudita|trovadora/i;

function hashNpcString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * NPC Orgánico y estilizado para interiores y calles
 * Diferenciado por rol e ID con rostro, cuello, manos, sombra de contacto,
 * texturas PBR de tela/cuero y gestos vivos por proximidad.
 */
export function DetailedNPC({
  id,
  name,
  role,
  color,
  position,
  isNear = false,
  isNearRef,
  isWalking = false,
  isWalkingRef,
  isPaused = false,
  castShadow = false,
}: DetailedNPCProps) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const nearRingRef = useRef<THREE.Mesh>(null);
  const nearDiamondRef = useRef<THREE.Mesh>(null);
  const walkCycle = useRef(0);
  const animAccumRef = useRef(Math.random() * 0.05);
  const timerRef = useSceneTimer();
  const isMobile = isMobileOptimizationTarget();

  const npcAppearance = useMemo(() => {
    const h = hashNpcString(id || name || 'npc');
    const isFeminine = FEMININE_NPC_REGEX.test(`${id} ${name}`);

    const skinColor = NPC_SKIN_PALETTE[h % NPC_SKIN_PALETTE.length];
    const hairColor = NPC_HAIR_PALETTE[(h >>> 3) % NPC_HAIR_PALETTE.length];
    const hairStyle = isFeminine ? 2 : (h >>> 6) % 3;

    const hasBeard =
      !isFeminine &&
      (role === 'BLACKSMITH'
        ? (h & 1) === 0 || (h & 2) === 0
        : role === 'TAVERN_KEEPER'
        ? true
        : role === 'CITIZEN'
        ? ((h >>> 9) % 5) < 2
        : ((h >>> 9) % 4) === 0);

    // Sombreros sencillos determinísticos para CITIZEN (0: sin sombrero, 1: boina, 2: ala ancha, 3: cinta)
    const citizenHatVariant = role === 'CITIZEN' ? (isFeminine ? ((h >>> 12) % 2 === 0 ? 3 : 0) : (h >>> 12) % 4) : 0;

    return {
      skinColor,
      hairColor,
      hairStyle,
      hasBeard,
      citizenHatVariant,
    };
  }, [id, name, role]);

  const torsoMat = getNpcTorsoMaterial(color);
  const armMat = getNpcArmMaterial(color);
  const skinMat = getNpcSkinMaterial(npcAppearance.skinColor);
  const hairMat = getNpcHairMaterial(npcAppearance.hairColor);
  const hairFeatureGeo = getNpcHairFeatureGeometry(npcAppearance.hairStyle, npcAppearance.hasBeard);

  const handMat =
    role === 'BLACKSMITH'
      ? sharedNpcFixedMats.darkGlove
      : role === 'CHALLENGER'
      ? sharedNpcFixedMats.steelGauntlet
      : skinMat;

  useFrame((state, delta) => {
    const activeIsNear = isNearRef ? isNearRef.current : isNear;
    if (nearRingRef.current) {
      nearRingRef.current.visible = activeIsNear && !isPaused;
    }
    if (nearDiamondRef.current) {
      nearDiamondRef.current.visible = activeIsNear && !isPaused;
    }

    if (isPaused || !rootRef.current) return;

    // Culling por radio de cámara y limitación a 15–20 Hz para NPCs lejanos
    rootRef.current.getWorldPosition(tempNpcWorldPos);
    const camDx = state.camera.position.x - tempNpcWorldPos.x;
    const camDz = state.camera.position.z - tempNpcWorldPos.z;
    const camDistSq = camDx * camDx + camDz * camDz;

    const maxAnimRadiusSq = isMobile ? 55 * 55 : 78 * 78;
    if (camDistSq > maxAnimRadiusSq) {
      return;
    }

    const farAnimDistSq = isMobile ? 22 * 22 : 30 * 30;
    let effectiveDelta = delta;
    if (camDistSq > farAnimDistSq) {
      animAccumRef.current += delta;
      const farStep = isMobile ? 1 / 16 : 1 / 20;
      if (animAccumRef.current < farStep) return;
      effectiveDelta = animAccumRef.current;
      animAccumRef.current = 0;
    } else if (isMobile) {
      animAccumRef.current += delta;
      if (animAccumRef.current < 1 / 30) return;
      effectiveDelta = animAccumRef.current;
      animAccumRef.current = 0;
    } else {
      animAccumRef.current = 0;
    }

    const t = timerRef.current?.update(effectiveDelta) ?? 0;
    const clampedDelta = Math.min(effectiveDelta, 0.1);

    const walkSmooth = 1 - Math.exp(-18 * clampedDelta);
    const idleFastSmooth = 1 - Math.exp(-10 * clampedDelta);
    const idleSmooth = 1 - Math.exp(-7.7 * clampedDelta);
    const activeIsWalking = isWalkingRef ? isWalkingRef.current : isWalking;

    if (nearDiamondRef.current && activeIsNear) {
      nearDiamondRef.current.position.y = 2.34 + Math.sin(t * 3.8) * 0.055;
      nearDiamondRef.current.rotation.y = t * 2.2;
    }

    if (activeIsWalking) {
      walkCycle.current += clampedDelta * 7.5;
      const cycle = walkCycle.current;
      const legAngle = Math.sin(cycle) * 0.55;
      const armAngle = -Math.sin(cycle) * 0.45;

      if (leftLeg.current) {
        leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, legAngle, walkSmooth);
      }
      if (rightLeg.current) {
        rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, -legAngle, walkSmooth);
      }
      if (leftArm.current) {
        leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, armAngle, walkSmooth);
        leftArm.current.rotation.z = THREE.MathUtils.lerp(leftArm.current.rotation.z, 0.08 + Math.sin(cycle) * 0.03, walkSmooth);
      }
      if (rightArm.current) {
        rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, -armAngle, walkSmooth);
        rightArm.current.rotation.z = THREE.MathUtils.lerp(rightArm.current.rotation.z, -0.08 - Math.sin(cycle) * 0.03, walkSmooth);
      }
      if (headRef.current) {
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, idleFastSmooth);
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0.04, idleFastSmooth);
      }

      if (rootRef.current) {
        rootRef.current.position.y = Math.abs(Math.sin(cycle)) * 0.06;
        rootRef.current.rotation.z = Math.sin(cycle) * 0.025;
        rootRef.current.rotation.x = 0.04;
      }
    } else {
      walkCycle.current = 0;
      const seed = Math.sin(position[0] * 12.9898 + position[2] * 78.233 + id.length * 4.13) * 43758.5453;
      const offset = Math.abs(seed % 10);
      const timeWithOffset = t + offset;

      const breatheCycle = timeWithOffset * 1.8;
      const swayCycle = timeWithOffset * 0.9;

      if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, 0, idleFastSmooth);
      if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, 0, idleFastSmooth);

      let targetLeftArmX = Math.sin(breatheCycle) * 0.08;
      let targetLeftArmZ = 0.06 + Math.sin(swayCycle) * 0.03;
      let targetRightArmX = -Math.sin(breatheCycle) * 0.08;
      let targetRightArmZ = -0.06 - Math.sin(swayCycle) * 0.03;
      let targetRootTiltX = 0;

      if (activeIsNear) {
        // Saludo cordial y mirada atenta cuando el jugador está cerca
        targetRightArmX = role === 'TAVERN_KEEPER' ? -0.78 + Math.sin(t * 3.4) * 0.14 : -0.62 + Math.sin(t * 4.2) * 0.18;
        targetRightArmZ = -0.22;
        if (role === 'MERCHANT') {
          targetLeftArmX = -0.25 + Math.cos(t * 2.8) * 0.1;
          targetLeftArmZ = 0.16;
        }
      } else if (role === 'BLACKSMITH') {
        // Cadencia de forja con el martillo en la mano derecha
        const strikeWave = Math.sin(timeWithOffset * 3.1);
        const strikeSnap = strikeWave > 0 ? Math.pow(strikeWave, 0.7) : strikeWave * 0.85;
        targetRightArmX = -0.58 + strikeSnap * 0.52;
        targetRightArmZ = -0.14;
        targetLeftArmX = -0.32 + Math.sin(breatheCycle) * 0.05;
        targetLeftArmZ = 0.12;
        targetRootTiltX = Math.max(0, strikeSnap) * 0.04;
      } else if (role === 'TAVERN_KEEPER') {
        // Sostiene la jarra erguida con leve balanceo de taberna
        targetRightArmX = -0.62 + Math.sin(breatheCycle) * 0.07;
        targetRightArmZ = -0.12;
        targetLeftArmX = -0.15 + Math.cos(swayCycle) * 0.08;
        targetLeftArmZ = 0.1;
      } else if (role === 'MERCHANT') {
        // Gestos expresivos de comerciante ofreciendo mercancía
        targetLeftArmX = -0.18 + Math.sin(timeWithOffset * 1.4) * 0.12;
        targetRightArmX = -0.18 - Math.sin(timeWithOffset * 1.4) * 0.12;
        targetLeftArmZ = 0.12;
        targetRightArmZ = -0.12;
      } else if (role === 'CHALLENGER') {
        // Postura firme de duelista en guardia
        targetLeftArmX = -0.12 + Math.sin(breatheCycle) * 0.05;
        targetRightArmX = -0.06 - Math.sin(breatheCycle) * 0.05;
        targetLeftArmZ = 0.14;
        targetRightArmZ = -0.14;
      }

      if (leftArm.current) {
        leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, targetLeftArmX, idleSmooth);
        leftArm.current.rotation.z = THREE.MathUtils.lerp(leftArm.current.rotation.z, targetLeftArmZ, idleSmooth);
      }
      if (rightArm.current) {
        rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, targetRightArmX, idleSmooth);
        rightArm.current.rotation.z = THREE.MathUtils.lerp(rightArm.current.rotation.z, targetRightArmZ, idleSmooth);
      }

      if (headRef.current) {
        const targetHeadY = activeIsNear ? Math.sin(t * 1.3) * 0.1 : Math.sin(swayCycle * 0.75) * 0.16;
        const targetHeadX = activeIsNear ? -0.05 + Math.sin(t * 2.6) * 0.045 : Math.sin(breatheCycle * 0.65) * 0.04;
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetHeadY, idleSmooth);
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetHeadX, idleSmooth);
      }

      if (rootRef.current) {
        const targetY = (activeIsNear ? Math.sin(t * 3.5) * 0.025 : 0) + Math.sin(breatheCycle) * 0.02;
        rootRef.current.position.y = THREE.MathUtils.lerp(rootRef.current.position.y, targetY, idleSmooth);
        rootRef.current.rotation.z = THREE.MathUtils.lerp(rootRef.current.rotation.z, Math.sin(swayCycle) * 0.015, idleSmooth);
        rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, targetRootTiltX, idleFastSmooth);
      }
    }
  });

  return (
    <group ref={rootRef} position={position} scale={[1.35, 1.35, 1.35]}>
      {/* Sombra de contacto suave en el suelo (1 sola llamada compartida, clave cuando castShadow es false) */}
      <mesh
        geometry={sharedNpcGeos.contactShadow}
        material={sharedNpcFixedMats.contactShadow}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        renderOrder={1}
      />

      {/* Piernas orgánicas redondeadas */}
      <group ref={leftLeg} position={[-0.2, 0.72, 0]}>
        <mesh geometry={sharedNpcGeos.leg} material={sharedNpcFixedMats.pants} position={[0, -0.32, 0]} castShadow={castShadow} />
        <mesh geometry={sharedNpcGeos.boot} material={sharedNpcFixedMats.boots} position={[0, -0.62, 0.04]} castShadow={castShadow} />
      </group>

      <group ref={rightLeg} position={[0.2, 0.72, 0]}>
        <mesh geometry={sharedNpcGeos.leg} material={sharedNpcFixedMats.pants} position={[0, -0.32, 0]} castShadow={castShadow} />
        <mesh geometry={sharedNpcGeos.boot} material={sharedNpcFixedMats.boots} position={[0, -0.62, 0.04]} castShadow={castShadow} />
      </group>

      {/* Torso con textura de tela/cuero + cuello */}
      <mesh geometry={sharedNpcGeos.torso} material={torsoMat} position={[0, 1.16, 0]} castShadow={castShadow} />
      <mesh geometry={sharedNpcGeos.neck} material={skinMat} position={[0, 1.54, 0]} castShadow={castShadow} />

      {/* Accesorios estáticos de torso por rol (fusionados en 1-2 draw calls) */}
      {role === 'BLACKSMITH' && (
        <mesh geometry={sharedNpcGeos.apron} material={sharedNpcFixedMats.leatherApron} castShadow={castShadow} />
      )}
      {role === 'TAVERN_KEEPER' && (
        <mesh geometry={sharedNpcGeos.apron} material={sharedNpcFixedMats.lightApron} castShadow={castShadow} />
      )}
      {role === 'MERCHANT' && (
        <>
          <mesh geometry={sharedNpcGeos.merchantVestCape} material={sharedNpcFixedMats.merchantVelvet} castShadow={castShadow} />
          <mesh geometry={sharedNpcGeos.merchantPouch} material={sharedNpcFixedMats.merchantPouch} castShadow={castShadow} />
        </>
      )}
      {role === 'CHALLENGER' && (
        <>
          <mesh geometry={sharedNpcGeos.challengerPauldrons} material={sharedNpcFixedMats.steelGauntlet} castShadow={castShadow} />
          <mesh geometry={sharedNpcGeos.challengerPauldronTrim} material={sharedNpcFixedMats.goldAccent} castShadow={castShadow} />
          <group position={[-0.27, 0.92, -0.05]} rotation={[0.45, 0, 0.16]}>
            <mesh geometry={sharedNpcGeos.challengerSwordScabbard} material={sharedNpcFixedMats.scabbard} castShadow={castShadow} />
            <mesh geometry={sharedNpcGeos.challengerSwordHilt} material={sharedNpcFixedMats.goldAccent} castShadow={castShadow} />
          </group>
        </>
      )}

      {/* Brazo izquierdo con mano */}
      <group ref={leftArm} position={[-0.38, 1.34, 0]}>
        <mesh geometry={sharedNpcGeos.arm} material={armMat} position={[0, -0.26, 0]} castShadow={castShadow} />
        <mesh geometry={sharedNpcGeos.hand} material={handMat} position={[0, -0.49, 0.02]} castShadow={castShadow} />
      </group>

      {/* Brazo derecho con mano y herramienta de rol (martillo / jarra) */}
      <group ref={rightArm} position={[0.38, 1.34, 0]}>
        <mesh geometry={sharedNpcGeos.arm} material={armMat} position={[0, -0.26, 0]} castShadow={castShadow} />
        <mesh geometry={sharedNpcGeos.hand} material={handMat} position={[0, -0.49, 0.02]} castShadow={castShadow} />

        {role === 'BLACKSMITH' && (
          <group position={[0, -0.5, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={sharedNpcGeos.hammerHandle} material={sharedNpcFixedMats.woodHandle} castShadow={castShadow} />
            <mesh geometry={sharedNpcGeos.hammerHead} material={sharedNpcFixedMats.ironTool} castShadow={castShadow} />
          </group>
        )}

        {role === 'TAVERN_KEEPER' && (
          <group position={[0, -0.49, 0.12]} rotation={[Math.PI / 2 - 0.18, 0, 0]}>
            <mesh geometry={sharedNpcGeos.tavernMugBody} material={sharedNpcFixedMats.mugOak} castShadow={castShadow} />
            <mesh geometry={sharedNpcGeos.tavernMugFoam} material={sharedNpcFixedMats.mugFoam} position={[0, 0.11, 0]} />
          </group>
        )}
      </group>

      {/* Grupo de cabeza articulada: rostro con ojos + cejas/cabello/barba fusionados + tocado por rol */}
      <group ref={headRef} position={[0, 1.78, 0]}>
        <mesh geometry={sharedNpcGeos.head} material={skinMat} castShadow={castShadow} />
        <mesh geometry={sharedNpcGeos.eyes} material={sharedNpcFixedMats.eyes} />
        <mesh geometry={hairFeatureGeo} material={hairMat} castShadow={castShadow} />

        {role === 'MERCHANT' && (
          <mesh geometry={sharedNpcGeos.merchantBeret} material={sharedNpcFixedMats.merchantVelvet} castShadow={castShadow} />
        )}
        {role === 'CHALLENGER' && (
          <mesh geometry={sharedNpcGeos.challengerCirclet} material={sharedNpcFixedMats.goldAccent} castShadow={castShadow} />
        )}
        {role === 'CITIZEN' && npcAppearance.citizenHatVariant === 1 && (
          <mesh geometry={sharedNpcGeos.citizenCapHat} material={sharedNpcFixedMats.citizenHatDark} castShadow={castShadow} />
        )}
        {role === 'CITIZEN' && npcAppearance.citizenHatVariant === 2 && (
          <mesh geometry={sharedNpcGeos.citizenTravelerHat} material={sharedNpcFixedMats.citizenHatLeather} castShadow={castShadow} />
        )}
        {role === 'CITIZEN' && npcAppearance.citizenHatVariant === 3 && (
          <mesh
            geometry={sharedNpcGeos.citizenHeadband}
            material={torsoMat}
            position={[0, 0.1, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        )}
      </group>

      {/* Rombo discreto flotante sobre la cabeza cuando el jugador está cerca */}
      <mesh
        ref={nearDiamondRef}
        visible={Boolean(isNearRef ? isNearRef.current : isNear)}
        geometry={sharedNpcGeos.nearDiamond}
        material={sharedNpcFixedMats.nearDiamond}
        position={[0, 2.34, 0]}
      />

      {/* Anillo de interacción sutil bajo los pies controlado por ref */}
      <mesh
        ref={nearRingRef}
        visible={Boolean(isNearRef ? isNearRef.current : isNear)}
        geometry={sharedNpcGeos.nearRing}
        material={sharedNpcFixedMats.nearRing}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
      />
    </group>
  );
}

const CROWN_SPIKE_ANGLES = [0, 0.8, -0.8, 1.6, -1.6];

/**
 * AVATAR ESCULPIDO ORGÁNICO DEL HÉROE PRINCIPAL (Rey Celeste / Invocador Gladiador)
 * Optimizado con geometrías y materiales compartidos a nivel de módulo.
 */
export function DetailedPlayerAvatar({
  isWalking = false,
  isWalkingRef,
  isPaused = false,
  castShadow = false,
}: {
  isWalking?: boolean;
  isWalkingRef?: React.MutableRefObject<boolean>;
  isPaused?: boolean;
  castShadow?: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const capeTopRef = useRef<THREE.Group>(null);
  const capeMidRef = useRef<THREE.Group>(null);
  const capeTailRef = useRef<THREE.Group>(null);
  const swordRef = useRef<THREE.Group>(null);
  const walkCycle = useRef(0);
  const animAccumRef = useRef(0);
  const timerRef = useSceneTimer();
  const isMobile = isMobileOptimizationTarget();

  useFrame((state, delta) => {
    if (isPaused) return;
    const activeIsWalking = isWalkingRef ? isWalkingRef.current : isWalking;

    let effectiveDelta = delta;
    if (isMobile) {
      animAccumRef.current += delta;
      if (animAccumRef.current < 1 / 30) return;
      effectiveDelta = animAccumRef.current;
      animAccumRef.current = 0;
    } else {
      animAccumRef.current = 0;
    }

    const t = timerRef.current?.update(effectiveDelta) ?? 0;
    const clampedDelta = Math.min(effectiveDelta, 0.1);

    if (activeIsWalking) {
      walkCycle.current += clampedDelta * 11.5;
      const cycle = walkCycle.current;
      const legAngle = Math.sin(cycle) * 0.62;
      const armAngle = -Math.sin(cycle) * 0.54;

      if (leftLegRef.current) leftLegRef.current.rotation.x = legAngle;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -legAngle;

      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = armAngle;
        leftArmRef.current.rotation.z = 0.12 + Math.sin(cycle) * 0.04;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -armAngle;
        rightArmRef.current.rotation.z = -0.12 - Math.sin(cycle) * 0.04;
      }

      if (rootRef.current) {
        rootRef.current.position.y = Math.abs(Math.sin(cycle)) * 0.08;
        rootRef.current.rotation.z = Math.sin(cycle) * 0.035;
        rootRef.current.rotation.x = 0.06;
      }

      const capeWave = Math.sin(cycle * 1.4);
      if (capeTopRef.current) capeTopRef.current.rotation.x = 0.35 + capeWave * 0.18;
      if (capeMidRef.current) capeMidRef.current.rotation.x = 0.45 + Math.sin(cycle * 1.4 - 0.4) * 0.22;
      if (capeTailRef.current) capeTailRef.current.rotation.x = 0.55 + Math.sin(cycle * 1.4 - 0.8) * 0.26;

      if (swordRef.current) swordRef.current.rotation.z = 0.45 + Math.sin(cycle) * 0.02;
    } else {
      walkCycle.current = 0;
      const idle = t;
      const legSmooth = 1 - Math.exp(-7.7 * clampedDelta);
      const idleSmooth = 1 - Math.exp(-6.3 * clampedDelta);

      if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, legSmooth);
      if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, legSmooth);

      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, Math.sin(idle * 1.6) * 0.05, idleSmooth);
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.1, idleSmooth);
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -Math.sin(idle * 1.6) * 0.05, idleSmooth);
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.1, idleSmooth);
      }

      if (rootRef.current) {
        rootRef.current.position.y = THREE.MathUtils.lerp(rootRef.current.position.y, Math.sin(idle * 2.2) * 0.015, idleSmooth);
        rootRef.current.rotation.z = THREE.MathUtils.lerp(rootRef.current.rotation.z, 0, idleSmooth);
        rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, 0, idleSmooth);
      }

      if (capeTopRef.current) capeTopRef.current.rotation.x = THREE.MathUtils.lerp(capeTopRef.current.rotation.x, 0.12 + Math.sin(idle * 2.2) * 0.03, idleSmooth);
      if (capeMidRef.current) capeMidRef.current.rotation.x = THREE.MathUtils.lerp(capeMidRef.current.rotation.x, 0.14 + Math.sin(idle * 2.2 - 0.3) * 0.04, idleSmooth);
      if (capeTailRef.current) capeTailRef.current.rotation.x = THREE.MathUtils.lerp(capeTailRef.current.rotation.x, 0.16 + Math.sin(idle * 2.2 - 0.6) * 0.05, idleSmooth);

      if (swordRef.current) swordRef.current.rotation.z = THREE.MathUtils.lerp(swordRef.current.rotation.z, 0.45, idleSmooth);
    }
  });

  return (
    <group ref={rootRef} scale={[1.35, 1.35, 1.35]}>
      {/* 1. PIERNAS ANATÓMICAS ESCULPIDAS */}
      <group ref={leftLegRef} position={[-0.24, 0.88, 0]}>
        <mesh geometry={sharedPlayerGeos.thigh} material={sharedPlayerMats.thigh} position={[0, -0.22, 0]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.knee} material={sharedPlayerMats.goldTrim92} position={[0, -0.42, 0.11]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.boot} material={sharedPlayerMats.bootLeather} position={[0, -0.62, 0.02]} castShadow={castShadow} />
        <mesh
          geometry={sharedPlayerGeos.bootToe}
          material={sharedPlayerMats.steelToe}
          position={[0, -0.78, 0.12]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow={castShadow}
        />
      </group>

      <group ref={rightLegRef} position={[0.24, 0.88, 0]}>
        <mesh geometry={sharedPlayerGeos.thigh} material={sharedPlayerMats.thigh} position={[0, -0.22, 0]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.knee} material={sharedPlayerMats.goldTrim92} position={[0, -0.42, 0.11]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.boot} material={sharedPlayerMats.bootLeather} position={[0, -0.62, 0.02]} castShadow={castShadow} />
        <mesh
          geometry={sharedPlayerGeos.bootToe}
          material={sharedPlayerMats.steelToe}
          position={[0, -0.78, 0.12]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow={castShadow}
        />
      </group>

      {/* 2. CINTURÓN CURVO DE CUERO Y ACCESORIOS MÍSTICOS */}
      <mesh
        geometry={sharedPlayerGeos.belt}
        material={sharedPlayerMats.beltLeather}
        position={[0, 0.94, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow={castShadow}
      />
      <mesh geometry={sharedPlayerGeos.buckle} material={sharedPlayerMats.goldTrim95} position={[0, 0.94, 0.36]} castShadow={castShadow} />
      <mesh geometry={sharedPlayerGeos.smallSphere} material={sharedPlayerMats.sapphireGem} position={[0, 0.94, 0.4]} castShadow={castShadow} />

      <mesh
        geometry={sharedPlayerGeos.pouch}
        material={sharedPlayerMats.pouchLeather}
        position={[0.36, 0.88, 0.14]}
        rotation={[0.2, 0, -0.3]}
        castShadow={castShadow}
      />
      <mesh
        geometry={sharedPlayerGeos.hipOrb}
        material={sharedPlayerMats.hipOrb}
        position={[-0.36, 0.88, 0.12]}
        castShadow={castShadow}
      />

      {/* 3. CORAZA REAL CURVA */}
      <mesh geometry={sharedPlayerGeos.abdomen} material={sharedPlayerMats.abdomenBlue} position={[0, 1.18, 0]} castShadow={castShadow} />
      <mesh geometry={sharedPlayerGeos.chest} material={sharedPlayerMats.chestBlue} position={[0, 1.46, 0.04]} castShadow={castShadow} />
      <mesh
        geometry={sharedPlayerGeos.pec}
        material={sharedPlayerMats.pecBlue}
        position={[-0.11, 1.5, 0.24]}
        rotation={[0.2, -0.1, 0]}
        castShadow={castShadow}
      />
      <mesh
        geometry={sharedPlayerGeos.pec}
        material={sharedPlayerMats.pecBlue}
        position={[0.11, 1.5, 0.24]}
        rotation={[0.2, 0.1, 0]}
        castShadow={castShadow}
      />
      <mesh
        geometry={sharedPlayerGeos.chestTrim}
        material={sharedPlayerMats.goldTrim95}
        position={[0, 1.44, 0.28]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow={castShadow}
      />

      {/* 4. HOMBRERAS DE PLACAS CURVAS */}
      <group position={[-0.46, 1.68, 0]}>
        <mesh geometry={sharedPlayerGeos.pauldronOuter} material={sharedPlayerMats.pauldronSilver} castShadow={castShadow} />
        <mesh
          geometry={sharedPlayerGeos.pauldronInner}
          material={sharedPlayerMats.goldTrim95r2}
          position={[-0.03, -0.06, 0]}
          castShadow={castShadow}
        />
      </group>
      <group position={[0.46, 1.68, 0]}>
        <mesh geometry={sharedPlayerGeos.pauldronOuter} material={sharedPlayerMats.pauldronSilver} castShadow={castShadow} />
        <mesh
          geometry={sharedPlayerGeos.pauldronInner}
          material={sharedPlayerMats.goldTrim95r2}
          position={[0.03, -0.06, 0]}
          castShadow={castShadow}
        />
      </group>

      {/* 5. BRAZOS ANATÓMICOS Y GUANTELETES CURVOS */}
      <group ref={leftArmRef} position={[-0.46, 1.6, 0]}>
        <mesh geometry={sharedPlayerGeos.upperArm} material={sharedPlayerMats.upperArmBlue} position={[0, -0.22, 0]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.elbow} material={sharedPlayerMats.forearmSteel} position={[0, -0.38, 0.05]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.forearm} material={sharedPlayerMats.forearmSteel} position={[0, -0.52, 0.02]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.hand} material={sharedPlayerMats.handDark} position={[0, -0.7, 0.06]} castShadow={castShadow} />
      </group>

      <group ref={rightArmRef} position={[0.46, 1.6, 0]}>
        <mesh geometry={sharedPlayerGeos.upperArm} material={sharedPlayerMats.upperArmBlue} position={[0, -0.22, 0]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.elbow} material={sharedPlayerMats.forearmSteel} position={[0, -0.38, 0.05]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.forearm} material={sharedPlayerMats.forearmSteel} position={[0, -0.52, 0.02]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.hand} material={sharedPlayerMats.handDark} position={[0, -0.7, 0.06]} castShadow={castShadow} />
      </group>

      {/* 6. CABEZA ESCULPIDA, ROSTRO, CORONA Y ZAFIRO RADIANTE */}
      <mesh geometry={sharedPlayerGeos.neck} material={sharedPlayerMats.skinNeck} position={[0, 1.76, 0]} castShadow={castShadow} />
      <mesh geometry={sharedPlayerGeos.head} material={sharedPlayerMats.skinHead} position={[0, 2.02, 0]} castShadow={castShadow} />
      <mesh geometry={sharedPlayerGeos.hairCap} material={sharedPlayerMats.hairBrown} position={[0, 2.12, -0.06]} castShadow={castShadow} />
      <mesh
        geometry={sharedPlayerGeos.hairStrand}
        material={sharedPlayerMats.hairBrown}
        position={[-0.2, 2.04, 0.08]}
        rotation={[0.3, 0, -0.2]}
        castShadow={castShadow}
      />
      <mesh
        geometry={sharedPlayerGeos.hairStrand}
        material={sharedPlayerMats.hairBrown}
        position={[0.2, 2.04, 0.08]}
        rotation={[0.3, 0, 0.2]}
        castShadow={castShadow}
      />

      {/* Corona Imperial Dorada Esculpida */}
      <group position={[0, 2.18, 0]}>
        <mesh
          geometry={sharedPlayerGeos.crownRing}
          material={sharedPlayerMats.goldCrown}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow={castShadow}
        />
        {CROWN_SPIKE_ANGLES.map((ang, i) => (
          <mesh
            key={i}
            geometry={sharedPlayerGeos.crownSpike}
            material={sharedPlayerMats.goldCrown}
            position={[Math.sin(ang) * 0.25, 0.06, Math.cos(ang) * 0.25]}
            rotation={[0, ang, 0]}
            castShadow={castShadow}
          />
        ))}
        <mesh
          geometry={sharedPlayerGeos.crownGem}
          material={sharedPlayerMats.sapphireGem}
          position={[0, 0.01, 0.26]}
          castShadow={castShadow}
        />
      </group>

      {/* 7. MANDOBLE RÚNICO CELESTIAL CURVADO A LA ESPALDA */}
      <group ref={swordRef} position={[0.12, 1.48, -0.28]} rotation={[0.08, 0.06, 0.45]}>
        <mesh geometry={sharedPlayerGeos.smallSphere} material={sharedPlayerMats.goldTrim95r2} position={[0, 0.74, 0]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.swordGrip} material={sharedPlayerMats.swordGripLeather} position={[0, 0.58, 0]} castShadow={castShadow} />
        <mesh
          geometry={sharedPlayerGeos.swordGuard}
          material={sharedPlayerMats.goldTrim95r2}
          position={[0, 0.44, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow={castShadow}
        />
        <mesh
          geometry={sharedPlayerGeos.swordScabbard}
          material={sharedPlayerMats.scabbardBlue}
          position={[0, -0.16, 0]}
          castShadow={castShadow}
        />
        <mesh geometry={sharedPlayerGeos.swordRune} material={sharedPlayerMats.swordRuneGlow} position={[0, -0.16, 0.07]} />
      </group>

      {/* 8. CAPA DE TELA DINÁMICA ORGÁNICA */}
      <group ref={capeTopRef} position={[0, 1.68, -0.22]}>
        <mesh
          geometry={sharedPlayerGeos.smallSphere}
          material={sharedPlayerMats.goldTrim95r2}
          position={[-0.28, 0, 0.05]}
          castShadow={castShadow}
        />
        <mesh
          geometry={sharedPlayerGeos.smallSphere}
          material={sharedPlayerMats.goldTrim95r2}
          position={[0.28, 0, 0.05]}
          castShadow={castShadow}
        />
        <mesh geometry={sharedPlayerGeos.capeTopCenter} material={sharedPlayerMats.capeTop} position={[0, -0.26, 0]} castShadow={castShadow} />
        <mesh
          geometry={sharedPlayerGeos.capeTopSide}
          material={sharedPlayerMats.capeMid}
          position={[-0.24, -0.26, -0.01]}
          rotation={[0, 0.15, -0.05]}
          castShadow={castShadow}
        />
        <mesh
          geometry={sharedPlayerGeos.capeTopSide}
          material={sharedPlayerMats.capeMid}
          position={[0.24, -0.26, -0.01]}
          rotation={[0, -0.15, 0.05]}
          castShadow={castShadow}
        />

        <group ref={capeMidRef} position={[0, -0.48, 0]}>
          <mesh geometry={sharedPlayerGeos.capeMidCenter} material={sharedPlayerMats.capeMid} position={[0, -0.26, 0]} castShadow={castShadow} />
          <mesh
            geometry={sharedPlayerGeos.capeMidSide}
            material={sharedPlayerMats.capeDeep}
            position={[-0.28, -0.26, 0]}
            rotation={[0, 0.2, -0.08]}
            castShadow={castShadow}
          />
          <mesh
            geometry={sharedPlayerGeos.capeMidSide}
            material={sharedPlayerMats.capeDeep}
            position={[0.28, -0.26, 0]}
            rotation={[0, -0.2, 0.08]}
            castShadow={castShadow}
          />

          <group ref={capeTailRef} position={[0, -0.5, 0]}>
            <mesh geometry={sharedPlayerGeos.capeTailCenter} material={sharedPlayerMats.capeTail} position={[0, -0.2, 0]} castShadow={castShadow} />
            <mesh
              geometry={sharedPlayerGeos.capeTailTrim}
              material={sharedPlayerMats.goldCapeTrim}
              position={[0, -0.4, 0]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow={castShadow}
            />
          </group>
        </group>
      </group>
    </group>
  );
}
