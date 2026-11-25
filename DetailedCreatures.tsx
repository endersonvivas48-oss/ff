import React from 'react';
import * as THREE from 'three';
import { mergeStaticGeometries } from './InstancedGlbGroup';
import { markGeometryAsShared, markMaterialAsShared } from './ThreeSceneCleanup';
import {
  getBrushedMetalRoughnessMap,
  getClothWeaveBumpMap,
  getStoneGrainBumpMap,
} from './battleTextures';

export interface CreatureRigRefs {
  weaponGroupRef?: React.RefObject<THREE.Group | null>;
  offhandGroupRef?: React.RefObject<THREE.Group | null>;
  leftWingRef?: React.RefObject<THREE.Group | null>;
  rightWingRef?: React.RefObject<THREE.Group | null>;
  leftLowerWingRef?: React.RefObject<THREE.Group | null>;
  rightLowerWingRef?: React.RefObject<THREE.Group | null>;
  haloRef?: React.RefObject<THREE.Group | null>;
  headRef?: React.RefObject<THREE.Group | null>;
  capeRef?: React.RefObject<THREE.Group | null>;
}

interface CreatureModelProps {
  level: number;
  isJ1: boolean;
  trimColor: string;
  primaryColor: string;
  rigRefs?: CreatureRigRefs;
}

// ========================================================
// CACHÉ DE MATERIALES PBR A NIVEL DE MÓDULO (IBL + roughnessMap + bumpMap)
// ========================================================
const standardMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
const basicMaterialCache = new Map<string, THREE.MeshBasicMaterial>();

type MaterialMapKind = 'none' | 'metal' | 'cloth' | 'stone';

function getCachedStandardMat(params: {
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  side?: THREE.Side;
  mapKind?: MaterialMapKind;
  bumpScale?: number;
  envMapIntensity?: number;
}): THREE.MeshStandardMaterial {
  const mapKind = params.mapKind ?? 'none';
  const bumpScale = params.bumpScale ?? (mapKind === 'cloth' ? 0.018 : mapKind === 'stone' ? 0.024 : 0);
  const envMapIntensity = params.envMapIntensity ?? ((params.metalness ?? 0) >= 0.5 ? 1.25 : 0.9);
  const key = `${params.color}|r:${params.roughness ?? 1}|m:${params.metalness ?? 0}|e:${params.emissive ?? ''}|ei:${params.emissiveIntensity ?? 0}|s:${params.side ?? THREE.FrontSide}|mk:${mapKind}|bs:${bumpScale}|emi:${envMapIntensity}`;

  let mat = standardMaterialCache.get(key);
  if (!mat) {
    const roughnessMap = mapKind === 'metal' ? getBrushedMetalRoughnessMap() : undefined;
    const bumpMap =
      mapKind === 'cloth'
        ? getClothWeaveBumpMap()
        : mapKind === 'stone'
        ? getStoneGrainBumpMap()
        : undefined;

    mat = markMaterialAsShared(
      new THREE.MeshStandardMaterial({
        color: params.color,
        roughness: params.roughness ?? 1,
        metalness: params.metalness ?? 0,
        emissive: params.emissive ? new THREE.Color(params.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: params.emissiveIntensity ?? 1,
        side: params.side ?? THREE.FrontSide,
        envMapIntensity,
        ...(roughnessMap ? { roughnessMap } : {}),
        ...(bumpMap ? { bumpMap, bumpScale } : {}),
      })
    );
    standardMaterialCache.set(key, mat);
  }
  return mat;
}

function getCachedBasicMat(color: string): THREE.MeshBasicMaterial {
  let mat = basicMaterialCache.get(color);
  if (!mat) {
    mat = markMaterialAsShared(new THREE.MeshBasicMaterial({ color }));
    basicMaterialCache.set(color, mat);
  }
  return mat;
}

// ========================================================
// UTILIDAD DE FUSIÓN ESTÁTICA CON mergeGeometries (Menos Draw Calls)
// ========================================================
export interface CreatureMergePart {
  geo: THREE.BufferGeometry;
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
}

export function mergeStaticCreatureParts(parts: CreatureMergePart[]): THREE.BufferGeometry {
  return mergeStaticGeometries(
    parts.map((part) => ({
      geometry: part.geo,
      position: part.pos,
      rotation: part.rot,
      scale: part.scale,
    }))
  );
}

// ========================================================
// CONSTRUCTORES PROCEDURALES DE SILUETAS (Extrude, Lathe, Tube)
// ========================================================
function createExtrudedSwordBladeGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.044, 0);
  s.lineTo(-0.052, 0.36);
  s.lineTo(-0.032, 0.5);
  s.lineTo(0, 0.62);
  s.lineTo(0.032, 0.5);
  s.lineTo(0.052, 0.36);
  s.lineTo(0.044, 0);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.016,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.translate(0, 0, -0.008);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createExtrudedHeraldicShieldGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.2, 0.22);
  s.lineTo(0.2, 0.22);
  s.quadraticCurveTo(0.22, 0.06, 0.19, -0.06);
  s.quadraticCurveTo(0.14, -0.2, 0, -0.29);
  s.quadraticCurveTo(-0.14, -0.2, -0.19, -0.06);
  s.quadraticCurveTo(-0.22, 0.06, -0.2, 0.22);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.015,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -0.02);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createExtrudedLanceTipGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.035, 0);
  s.lineTo(-0.085, 0.14);
  s.lineTo(0, 0.44);
  s.lineTo(0.085, 0.14);
  s.lineTo(0.035, 0);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.011);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createExtrudedHammerHeadGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.34, -0.15);
  s.lineTo(-0.28, -0.19);
  s.lineTo(-0.14, -0.13);
  s.lineTo(0.14, -0.13);
  s.lineTo(0.28, -0.19);
  s.lineTo(0.34, -0.15);
  s.lineTo(0.34, 0.15);
  s.lineTo(0.28, 0.19);
  s.lineTo(0.14, 0.13);
  s.lineTo(0, 0.19);
  s.lineTo(-0.14, 0.13);
  s.lineTo(-0.28, 0.19);
  s.lineTo(-0.34, 0.15);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.024,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.11);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createExtrudedWingGeo(
  span: number,
  rootChord: number,
  direction: 1 | -1,
  depth = 0.035
): THREE.BufferGeometry {
  // Perfil angular de ala emplumada extendiéndose a lo largo de +X (direction=1) o -X (direction=-1)
  const pts: Array<[number, number]> = [
    [0, 0.12 * rootChord],
    [0.32 * span * direction, 0.78 * rootChord],
    [0.72 * span * direction, 1.05 * rootChord],
    [1.0 * span * direction, 0.85 * rootChord],
    [0.82 * span * direction, 0.38 * rootChord],
    [0.9 * span * direction, 0.22 * rootChord],
    [0.64 * span * direction, -0.05 * rootChord],
    [0.7 * span * direction, -0.22 * rootChord],
    [0.42 * span * direction, -0.34 * rootChord],
    [0.45 * span * direction, -0.48 * rootChord],
    [0.18 * span * direction, -0.44 * rootChord],
    [0, -0.3 * rootChord],
  ];

  // Mantener orientación antihoraria (CCW) para que las normales siempre apunten hacia fuera
  const ordered = direction === 1 ? [...pts].reverse() : pts;
  const s = new THREE.Shape();
  ordered.forEach(([px, py], idx) => {
    if (idx === 0) s.moveTo(px, py);
    else s.lineTo(px, py);
  });
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createLatheCuirassGeo(scaleW: number, height: number): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.01, -height * 0.5),
    new THREE.Vector2(scaleW * 0.82, -height * 0.5),
    new THREE.Vector2(scaleW * 0.68, -height * 0.22),
    new THREE.Vector2(scaleW * 0.92, height * 0.14),
    new THREE.Vector2(scaleW * 0.96, height * 0.34),
    new THREE.Vector2(scaleW * 0.62, height * 0.48),
    new THREE.Vector2(0.01, height * 0.5),
  ];
  const geo = new THREE.LatheGeometry(pts, 18);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createLatheHelmGeo(radius: number, height: number): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.01, -height * 0.5),
    new THREE.Vector2(radius * 1.12, -height * 0.48),
    new THREE.Vector2(radius * 0.92, -height * 0.24),
    new THREE.Vector2(radius * 0.98, 0),
    new THREE.Vector2(radius * 0.94, height * 0.26),
    new THREE.Vector2(radius * 0.56, height * 0.44),
    new THREE.Vector2(0.01, height * 0.52),
  ];
  const geo = new THREE.LatheGeometry(pts, 18);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createLatheFlaredRobeGeo(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.01, -0.44),
    new THREE.Vector2(0.44, -0.44),
    new THREE.Vector2(0.38, -0.28),
    new THREE.Vector2(0.28, -0.02),
    new THREE.Vector2(0.21, 0.2),
    new THREE.Vector2(0.25, 0.38),
    new THREE.Vector2(0.16, 0.44),
    new THREE.Vector2(0.01, 0.44),
  ];
  const geo = new THREE.LatheGeometry(pts, 20);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createLatheWizardHatGeo(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.34, 0.0),
    new THREE.Vector2(0.35, 0.03),
    new THREE.Vector2(0.22, 0.07),
    new THREE.Vector2(0.18, 0.22),
    new THREE.Vector2(0.11, 0.42),
    new THREE.Vector2(0.04, 0.58),
    new THREE.Vector2(0.005, 0.66),
  ];
  const geo = new THREE.LatheGeometry(pts, 18);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createLatheHoodGeo(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.01, -0.2),
    new THREE.Vector2(0.24, -0.18),
    new THREE.Vector2(0.22, 0.0),
    new THREE.Vector2(0.16, 0.14),
    new THREE.Vector2(0.06, 0.24),
    new THREE.Vector2(0.005, 0.28),
  ];
  const geo = new THREE.LatheGeometry(pts, 16);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createRecurveBowTubeGeo(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.4, -0.12),
    new THREE.Vector3(0, 0.28, 0.12),
    new THREE.Vector3(0, 0.11, 0.06),
    new THREE.Vector3(0, 0, 0.14),
    new THREE.Vector3(0, -0.11, 0.06),
    new THREE.Vector3(0, -0.28, 0.12),
    new THREE.Vector3(0, -0.4, -0.12),
  ]);
  const geo = new THREE.TubeGeometry(curve, 24, 0.026, 8, false);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createCurvedPlumeTubeGeo(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.04, 0.08),
    new THREE.Vector3(0, 0.2, 0.02),
    new THREE.Vector3(0, 0.22, -0.14),
    new THREE.Vector3(0, 0.08, -0.28),
    new THREE.Vector3(0, -0.08, -0.34),
  ]);
  const geo = new THREE.TubeGeometry(curve, 18, 0.052, 8, false);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createGnarledStaffTubeGeo(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.74, 0),
    new THREE.Vector3(-0.02, -0.3, 0.02),
    new THREE.Vector3(0.03, 0.18, -0.02),
    new THREE.Vector3(-0.01, 0.56, 0.03),
    new THREE.Vector3(0.08, 0.72, 0.02),
    new THREE.Vector3(0.11, 0.86, 0),
    new THREE.Vector3(0.0, 0.92, 0),
  ]);
  const geo = new THREE.TubeGeometry(curve, 24, 0.034, 8, false);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createCurvedTailTubeGeo(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.04, -0.18),
    new THREE.Vector3(0.04, 0.16, -0.32),
    new THREE.Vector3(0, 0.3, -0.36),
  ]);
  const geo = new THREE.TubeGeometry(curve, 16, 0.045, 8, false);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

function createScepterShaftTubeGeo(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.88, 0),
    new THREE.Vector3(-0.025, -0.35, 0.02),
    new THREE.Vector3(0.025, 0.25, -0.02),
    new THREE.Vector3(0, 0.78, 0),
  ]);
  const geo = new THREE.TubeGeometry(curve, 20, 0.04, 10, false);
  geo.computeVertexNormals();
  return markGeometryAsShared(geo);
}

// ========================================================
// GEOMETRÍAS COMPARTIDAS Y FUSIONADAS POR NIVEL DE CRIATURA Y TITÁN
// ========================================================
const _rawL1Leg = new THREE.CapsuleGeometry(0.075, 0.32, 6, 12);
const _rawL1Boot = new THREE.CapsuleGeometry(0.065, 0.14, 6, 10);
const _rawL1SwordGuard = new THREE.CapsuleGeometry(0.025, 0.17, 6, 10);
const _rawL1SwordGrip = new THREE.CylinderGeometry(0.022, 0.024, 0.18, 8);
const _rawL1SwordPommel = new THREE.SphereGeometry(0.038, 10, 10);

const _rawL2Leg = new THREE.CapsuleGeometry(0.07, 0.3, 6, 12);
const _rawL3Leg = new THREE.CapsuleGeometry(0.09, 0.34, 8, 14);
const _rawL3Pauldron = new THREE.SphereGeometry(0.18, 14, 14);
const _rawL5Eye = new THREE.SphereGeometry(0.045, 8, 8);
const _rawL6Leg = new THREE.CapsuleGeometry(0.14, 0.38, 8, 16);

function createCenteredVisorGeo(radius: number, tube: number, arc: number): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(radius, tube, 6, 16, arc);
  geo.rotateZ(Math.PI / 2 - arc / 2);
  return markGeometryAsShared(geo);
}
const _rawL6Pauldron = new THREE.SphereGeometry(0.25, 16, 16);

const _rawTitanHaloSpike = new THREE.ConeGeometry(0.07, 0.22, 6);
const _rawTitanHaloMinorSpike = new THREE.ConeGeometry(0.045, 0.14, 6);
const _rawTitanLeg = new THREE.CapsuleGeometry(0.13, 0.44, 8, 16);
const _rawTitanBoot = new THREE.SphereGeometry(0.12, 12, 12);
const _rawTitanPauldron = new THREE.SphereGeometry(0.24, 16, 16);

const sharedCreatureGeos = {
  // Nivel 1 (Fusión de piernas/botas/empuñadura + Extrude + Lathe)
  l1Legs: mergeStaticCreatureParts([
    { geo: _rawL1Leg, pos: [-0.14, 0.28, 0] },
    { geo: _rawL1Leg, pos: [0.14, 0.28, 0] },
  ]),
  l1Boots: mergeStaticCreatureParts([
    { geo: _rawL1Boot, pos: [-0.14, 0.06, 0.03], rot: [-Math.PI / 2, 0, 0] },
    { geo: _rawL1Boot, pos: [0.14, 0.06, 0.03], rot: [-Math.PI / 2, 0, 0] },
  ]),
  l1Torso: markGeometryAsShared(new THREE.CapsuleGeometry(0.19, 0.32, 8, 16)),
  l1Chest: createLatheCuirassGeo(0.22, 0.38),
  l1Helm: createLatheHelmGeo(0.185, 0.36),
  l1Visor: createCenteredVisorGeo(0.135, 0.028, Math.PI * 0.78),
  l1ShieldPlate: createExtrudedHeraldicShieldGeo(),
  l1ShieldBoss: markGeometryAsShared(new THREE.SphereGeometry(0.065, 12, 12)),
  l1SwordBlade: createExtrudedSwordBladeGeo(),
  l1SwordHilt: mergeStaticCreatureParts([
    { geo: _rawL1SwordGuard, pos: [0, -0.02, 0], rot: [0, 0, Math.PI / 2] },
    { geo: _rawL1SwordGrip, pos: [0, -0.1, 0] },
    { geo: _rawL1SwordPommel, pos: [0, -0.19, 0] },
  ]),

  // Nivel 2 (Arco recurvo TubeGeometry + Capucha LatheGeometry + Piernas fusionadas)
  l2Legs: mergeStaticCreatureParts([
    { geo: _rawL2Leg, pos: [-0.13, 0.26, 0] },
    { geo: _rawL2Leg, pos: [0.13, 0.26, 0] },
  ]),
  l2Torso: markGeometryAsShared(new THREE.CapsuleGeometry(0.19, 0.34, 8, 16)),
  l2Vest: createLatheCuirassGeo(0.21, 0.36),
  l2Head: markGeometryAsShared(new THREE.SphereGeometry(0.175, 16, 16)),
  l2Hood: createLatheHoodGeo(),
  l2Bow: createRecurveBowTubeGeo(),
  l2BowString: markGeometryAsShared(new THREE.CylinderGeometry(0.008, 0.008, 0.8, 6)),
  l2Arrow: markGeometryAsShared(new THREE.CylinderGeometry(0.012, 0.012, 0.56, 6)),
  l2ArrowTip: createExtrudedLanceTipGeo(),
  l2Quiver: markGeometryAsShared(new THREE.CylinderGeometry(0.07, 0.05, 0.48, 12)),
  l2Fletching: markGeometryAsShared(new THREE.SphereGeometry(0.06, 8, 8)),

  // Nivel 3 (Coraza y yelmo Lathe + Penacho Tube + Lanza Extrude + Piernas y hombreras fusionadas)
  l3Legs: mergeStaticCreatureParts([
    { geo: _rawL3Leg, pos: [-0.16, 0.3, 0] },
    { geo: _rawL3Leg, pos: [0.16, 0.3, 0] },
  ]),
  l3Torso: createLatheCuirassGeo(0.28, 0.52),
  l3Pauldrons: mergeStaticCreatureParts([
    { geo: _rawL3Pauldron, pos: [-0.36, 0.82, 0] },
    { geo: _rawL3Pauldron, pos: [0.36, 0.82, 0] },
  ]),
  l3Helm: createLatheHelmGeo(0.2, 0.4),
  l3Plume: createCurvedPlumeTubeGeo(),
  l3LanceShaft: markGeometryAsShared(new THREE.CylinderGeometry(0.025, 0.035, 1.68, 10)),
  l3LanceTip: createExtrudedLanceTipGeo(),

  // Nivel 4 (Túnica acampanada y sombrero Lathe + Báculo curvo TubeGeometry)
  l4Robe: createLatheFlaredRobeGeo(),
  l4Shoulders: createLatheCuirassGeo(0.25, 0.24),
  l4Head: markGeometryAsShared(new THREE.SphereGeometry(0.175, 16, 16)),
  l4Hat: createLatheWizardHatGeo(),
  l4StaffShaft: createGnarledStaffTubeGeo(),
  l4StaffRing: markGeometryAsShared(new THREE.TorusGeometry(0.125, 0.028, 8, 16)),
  l4StaffOrb: markGeometryAsShared(new THREE.SphereGeometry(0.095, 16, 16)),

  // Nivel 5 (Alas angulares emplumadas Extrude + Cola Tube + Ojos fusionados)
  l5Body: markGeometryAsShared(new THREE.CapsuleGeometry(0.24, 0.52, 10, 18)),
  l5Chest: createLatheCuirassGeo(0.24, 0.32),
  l5Helm: createLatheHelmGeo(0.195, 0.36),
  l5Beak: markGeometryAsShared(new THREE.ConeGeometry(0.08, 0.22, 10)),
  l5Eyes: mergeStaticCreatureParts([
    { geo: _rawL5Eye, pos: [0.11, 0.04, 0.145] },
    { geo: _rawL5Eye, pos: [-0.11, 0.04, 0.145] },
  ]),
  l5WingLeft: createExtrudedWingGeo(0.76, 0.42, -1, 0.04),
  l5WingRight: createExtrudedWingGeo(0.76, 0.42, 1, 0.04),
  l5Tail: createCurvedTailTubeGeo(),

  // Nivel 6 (Coloso Lathe + Martillo biselado Extrude + Piernas y hombreras fusionadas)
  l6Legs: mergeStaticCreatureParts([
    { geo: _rawL6Leg, pos: [-0.26, 0.34, 0] },
    { geo: _rawL6Leg, pos: [0.26, 0.34, 0] },
  ]),
  l6Torso: createLatheCuirassGeo(0.4, 0.62),
  l6CoreRing: markGeometryAsShared(new THREE.TorusGeometry(0.16, 0.04, 8, 20)),
  l6CoreOrb: markGeometryAsShared(new THREE.SphereGeometry(0.12, 14, 14)),
  l6Pauldrons: mergeStaticCreatureParts([
    { geo: _rawL6Pauldron, pos: [-0.48, 1.02, 0] },
    { geo: _rawL6Pauldron, pos: [0.48, 1.02, 0] },
  ]),
  l6Head: createLatheHelmGeo(0.22, 0.42),
  l6Visor: createCenteredVisorGeo(0.135, 0.034, Math.PI * 0.88),
  l6HammerShaft: markGeometryAsShared(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 10)),
  l6HammerHead: createExtrudedHammerHeadGeo(),

  // Titán Ascendido (Halo con picos fusionados + Alas angulares Extrude + Torso/Yelmo Lathe + Cetro Tube)
  titanHalo: markGeometryAsShared(new THREE.TorusGeometry(0.55, 0.045, 12, 32)),
  titanHaloSpikes: mergeStaticCreatureParts([
    ...[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((ang) => ({
      geo: _rawTitanHaloSpike,
      pos: [Math.cos(ang) * 0.57, Math.sin(ang) * 0.57, 0] as [number, number, number],
      rot: [0, 0, ang - Math.PI / 2] as [number, number, number],
    })),
    ...[Math.PI / 4, (Math.PI * 3) / 4, (Math.PI * 5) / 4, (Math.PI * 7) / 4].map((ang) => ({
      geo: _rawTitanHaloMinorSpike,
      pos: [Math.cos(ang) * 0.55, Math.sin(ang) * 0.55, 0] as [number, number, number],
      rot: [0, 0, ang - Math.PI / 2] as [number, number, number],
    })),
  ]),
  titanUpperWingLeft: createExtrudedWingGeo(0.95, 0.46, -1, 0.036),
  titanUpperWingRight: createExtrudedWingGeo(0.95, 0.46, 1, 0.036),
  titanLowerWingLeft: createExtrudedWingGeo(0.7, 0.34, -1, 0.03),
  titanLowerWingRight: createExtrudedWingGeo(0.7, 0.34, 1, 0.03),
  titanLegs: mergeStaticCreatureParts([
    { geo: _rawTitanLeg, pos: [-0.24, 0.38, 0] },
    { geo: _rawTitanLeg, pos: [0.24, 0.38, 0] },
  ]),
  titanBoots: mergeStaticCreatureParts([
    { geo: _rawTitanBoot, pos: [-0.24, 0.1, 0.08] },
    { geo: _rawTitanBoot, pos: [0.24, 0.1, 0.08] },
  ]),
  titanTorso: createLatheCuirassGeo(0.37, 0.68),
  titanCoreRing: markGeometryAsShared(new THREE.TorusGeometry(0.15, 0.04, 8, 20)),
  titanCoreOrb: markGeometryAsShared(new THREE.SphereGeometry(0.11, 16, 16)),
  titanPauldrons: mergeStaticCreatureParts([
    { geo: _rawTitanPauldron, pos: [-0.48, 1.15, 0] },
    { geo: _rawTitanPauldron, pos: [0.48, 1.15, 0] },
  ]),
  titanHead: createLatheHelmGeo(0.23, 0.44),
  titanVisor: createCenteredVisorGeo(0.14, 0.038, Math.PI * 0.88),
  titanScepterShaft: createScepterShaftTubeGeo(),
  titanScepterRing: markGeometryAsShared(new THREE.TorusGeometry(0.18, 0.035, 8, 20)),
  titanScepterOrb: markGeometryAsShared(new THREE.SphereGeometry(0.12, 16, 16)),
};

// Limpiar geometrías temporales usadas únicamente para construir las fusiones estáticas
[
  _rawL1Leg,
  _rawL1Boot,
  _rawL1SwordGuard,
  _rawL1SwordGrip,
  _rawL1SwordPommel,
  _rawL2Leg,
  _rawL3Leg,
  _rawL3Pauldron,
  _rawL5Eye,
  _rawL6Leg,
  _rawL6Pauldron,
  _rawTitanHaloSpike,
  _rawTitanHaloMinorSpike,
  _rawTitanLeg,
  _rawTitanBoot,
  _rawTitanPauldron,
].forEach((g) => g.dispose());

/**
 * Modelos 3D orgánicos, perfilados y articulados para cada criatura,
 * optimizados con geometrías fusionadas, texturas PBR compartidas e IBL.
 */
export function DetailedCreatureMesh({
  level,
  isJ1,
  rigRefs,
}: CreatureModelProps) {
  const armorMetal = isJ1 ? '#38bdf8' : '#e11d48';
  const armorShade = isJ1 ? '#0284c7' : '#be123c';
  const clothColor = isJ1 ? '#1e3a8a' : '#881337';
  const goldTrim = '#f59e0b';
  const steelBright = '#e2e8f0';

  const matGoldTrim = getCachedStandardMat({
    color: goldTrim,
    metalness: 0.9,
    roughness: 0.24,
    mapKind: 'metal',
  });
  const matSteelBright = getCachedStandardMat({
    color: steelBright,
    metalness: 0.92,
    roughness: 0.2,
    mapKind: 'metal',
  });
  const matCloth = getCachedStandardMat({
    color: clothColor,
    roughness: 0.6,
    mapKind: 'cloth',
  });

  // ========================================================
  // NIVEL 1: INFANTERÍA / ESPADACHÍN ÁGIL CON ESPADA Y ESCUDO HERÁLDICO
  // ========================================================
  if (level === 1) {
    const matLeg = getCachedStandardMat({ color: '#1e293b', roughness: 0.65, mapKind: 'stone' });
    const matBoot = getCachedStandardMat({ color: '#0f172a', roughness: 0.72, mapKind: 'stone' });
    const matChestPlate = getCachedStandardMat({
      color: armorMetal,
      metalness: 0.8,
      roughness: 0.28,
      mapKind: 'metal',
    });
    const matHelm = getCachedStandardMat({
      color: '#64748b',
      metalness: 0.82,
      roughness: 0.26,
      mapKind: 'metal',
    });
    const matVisor = getCachedStandardMat({
      color: isJ1 ? '#38bdf8' : '#f43f5e',
      emissive: isJ1 ? '#0284c7' : '#be123c',
      emissiveIntensity: 1.4,
    });
    const matShield = getCachedStandardMat({
      color: armorMetal,
      metalness: 0.82,
      roughness: 0.25,
      side: THREE.DoubleSide,
      mapKind: 'metal',
    });

    return (
      <group position={[0, 0.12, 0]}>
        {/* Piernas y botas fusionadas (2 draw calls en lugar de 4) */}
        <mesh geometry={sharedCreatureGeos.l1Legs} material={matLeg} castShadow />
        <mesh geometry={sharedCreatureGeos.l1Boots} material={matBoot} castShadow />

        {/* Torso y peto entallado LatheGeometry */}
        <mesh geometry={sharedCreatureGeos.l1Torso} material={matCloth} position={[0, 0.58, 0]} castShadow />
        <mesh geometry={sharedCreatureGeos.l1Chest} material={matChestPlate} position={[0, 0.62, 0.03]} castShadow />

        {/* Yelmo perfilado con visera luminosa */}
        <group ref={rigRefs?.headRef} position={[0, 0.94, 0]}>
          <mesh geometry={sharedCreatureGeos.l1Helm} material={matHelm} castShadow />
          <mesh
            geometry={sharedCreatureGeos.l1Visor}
            material={matVisor}
            position={[0, 0.01, 0.09]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </group>

        {/* Escudo Heráldico Biselado (Brazo Izquierdo articulado) */}
        <group ref={rigRefs?.offhandGroupRef} position={[-0.34, 0.6, 0.08]} rotation={[0, 0.45, 0]}>
          <mesh geometry={sharedCreatureGeos.l1ShieldPlate} material={matShield} castShadow />
          <mesh
            geometry={sharedCreatureGeos.l1ShieldBoss}
            material={matGoldTrim}
            position={[0, 0.02, 0.038]}
            scale={[1, 1, 0.5]}
          />
        </group>

        {/* Espada de Acero Biselada con Filo (Mano Derecha articulada) */}
        <group ref={rigRefs?.weaponGroupRef} position={[0.32, 0.52, 0.1]} rotation={[0.3, 0, -0.2]}>
          <mesh geometry={sharedCreatureGeos.l1SwordBlade} material={matSteelBright} position={[0, 0.02, 0]} castShadow />
          <mesh geometry={sharedCreatureGeos.l1SwordHilt} material={matGoldTrim} />
        </group>
      </group>
    );
  }

  // ========================================================
  // NIVEL 2: ARQUERO / EXPLORADOR SILVESTRE CON ARCO RECURVO
  // ========================================================
  if (level === 2) {
    const matLeg = getCachedStandardMat({ color: '#14532d', roughness: 0.72, mapKind: 'cloth' });
    const matTorso = getCachedStandardMat({ color: '#166534', roughness: 0.68, mapKind: 'cloth' });
    const matVest = getCachedStandardMat({ color: '#78350f', roughness: 0.8, mapKind: 'stone' });
    const matSkin = getCachedStandardMat({ color: '#fed7aa', roughness: 0.7 });
    const matHood = getCachedStandardMat({ color: '#14532d', roughness: 0.75, mapKind: 'cloth' });
    const matBow = getCachedStandardMat({ color: '#78350f', roughness: 0.55, mapKind: 'stone' });
    const matString = getCachedBasicMat('#fef08a');
    const matQuiver = getCachedStandardMat({ color: '#451a03', roughness: 0.82, mapKind: 'stone' });
    const matFletch = getCachedStandardMat({ color: '#fef08a', roughness: 0.6 });

    return (
      <group position={[0, 0.12, 0]}>
        <mesh geometry={sharedCreatureGeos.l2Legs} material={matLeg} castShadow />
        <mesh geometry={sharedCreatureGeos.l2Torso} material={matTorso} position={[0, 0.56, 0]} castShadow />
        <mesh geometry={sharedCreatureGeos.l2Vest} material={matVest} position={[0, 0.58, 0.03]} castShadow />

        {/* Cabeza y Capucha perfilada LatheGeometry */}
        <group ref={rigRefs?.headRef} position={[0, 0.9, 0]}>
          <mesh geometry={sharedCreatureGeos.l2Head} material={matSkin} castShadow />
          <mesh
            geometry={sharedCreatureGeos.l2Hood}
            material={matHood}
            position={[0, 0.08, -0.04]}
            rotation={[-0.25, 0, 0]}
            castShadow
          />
        </group>

        {/* Arco Recurvo (TubeGeometry CatmullRomCurve3) */}
        <group ref={rigRefs?.offhandGroupRef} position={[-0.32, 0.58, 0.12]} rotation={[0.05, 0.4, 0.15]}>
          <mesh geometry={sharedCreatureGeos.l2Bow} material={matBow} castShadow />
          <mesh geometry={sharedCreatureGeos.l2BowString} material={matString} position={[0, 0, -0.12]} />
        </group>

        {/* Mano derecha con flecha lista para tensar */}
        <group ref={rigRefs?.weaponGroupRef} position={[0.25, 0.58, 0.12]} rotation={[Math.PI / 2, 0, 0.25]}>
          <mesh geometry={sharedCreatureGeos.l2Arrow} material={matBow} castShadow />
          <mesh
            geometry={sharedCreatureGeos.l2ArrowTip}
            material={matSteelBright}
            position={[0, 0.24, 0]}
            scale={[0.45, 0.4, 0.55]}
          />
        </group>

        {/* Carcaj a la espalda */}
        <group position={[0.14, 0.66, -0.16]} rotation={[-0.3, 0.2, 0.3]}>
          <mesh geometry={sharedCreatureGeos.l2Quiver} material={matQuiver} castShadow />
          <mesh geometry={sharedCreatureGeos.l2Fletching} material={matFletch} position={[0, 0.26, 0]} />
        </group>
      </group>
    );
  }

  // ========================================================
  // NIVEL 3: CABALLERO DE PLACAS Y LANZA DE TORNEO
  // ========================================================
  if (level === 3) {
    const matGreaves = getCachedStandardMat({
      color: '#334155',
      metalness: 0.82,
      roughness: 0.28,
      mapKind: 'metal',
    });
    const matPlate = getCachedStandardMat({
      color: armorMetal,
      metalness: 0.86,
      roughness: 0.24,
      mapKind: 'metal',
    });
    const matPauldron = getCachedStandardMat({
      color: goldTrim,
      metalness: 0.92,
      roughness: 0.22,
      mapKind: 'metal',
    });
    const matHelm = getCachedStandardMat({
      color: steelBright,
      metalness: 0.92,
      roughness: 0.22,
      mapKind: 'metal',
    });
    const matPlume = getCachedStandardMat({
      color: isJ1 ? '#38bdf8' : '#ef4444',
      roughness: 0.45,
      mapKind: 'cloth',
    });
    const matShaft = getCachedStandardMat({ color: '#78350f', roughness: 0.65, mapKind: 'stone' });
    const matTip = getCachedStandardMat({
      color: steelBright,
      metalness: 0.95,
      roughness: 0.18,
      mapKind: 'metal',
    });

    return (
      <group position={[0, 0.14, 0]}>
        <mesh geometry={sharedCreatureGeos.l3Legs} material={matGreaves} castShadow />
        <mesh geometry={sharedCreatureGeos.l3Torso} material={matPlate} position={[0, 0.64, 0]} castShadow />
        <mesh geometry={sharedCreatureGeos.l3Pauldrons} material={matPauldron} castShadow />

        {/* Yelmo perfilado con penacho curvo (TubeGeometry) */}
        <group ref={rigRefs?.headRef} position={[0, 1.05, 0]}>
          <mesh geometry={sharedCreatureGeos.l3Helm} material={matHelm} castShadow />
          <mesh geometry={sharedCreatureGeos.l3Plume} material={matPlume} position={[0, 0.15, 0]} castShadow />
        </group>

        {/* Lanza de torneo con punta biselada (ExtrudeGeometry) */}
        <group ref={rigRefs?.weaponGroupRef} position={[0.4, 0.86, 0.12]} rotation={[0.22, 0, -0.08]}>
          <mesh geometry={sharedCreatureGeos.l3LanceShaft} material={matShaft} castShadow />
          <mesh geometry={sharedCreatureGeos.l3LanceTip} material={matTip} position={[0, 0.82, 0]} castShadow />
        </group>
      </group>
    );
  }

  // ========================================================
  // NIVEL 4: HECHICERO ELEMENTAL CON TÚNICA FLUIDA Y BÁCULO CURVO
  // ========================================================
  if (level === 4) {
    const matMantle = getCachedStandardMat({ color: armorShade, roughness: 0.55, mapKind: 'cloth' });
    const matSkin = getCachedStandardMat({ color: '#fed7aa', roughness: 0.7 });
    const matHat = getCachedStandardMat({ color: clothColor, roughness: 0.65, mapKind: 'cloth' });
    const matStaff = getCachedStandardMat({ color: '#451a03', roughness: 0.72, mapKind: 'stone' });
    const matStaffRing = getCachedStandardMat({
      color: goldTrim,
      metalness: 0.95,
      roughness: 0.2,
      mapKind: 'metal',
    });
    const matOrb = getCachedStandardMat({
      color: isJ1 ? '#38bdf8' : '#c084fc',
      emissive: isJ1 ? '#0284c7' : '#9333ea',
      emissiveIntensity: 3.0,
    });

    return (
      <group position={[0, 0.12, 0]}>
        {/* Túnica acampanada LatheGeometry + manto */}
        <mesh geometry={sharedCreatureGeos.l4Robe} material={matCloth} position={[0, 0.44, 0]} castShadow />
        <mesh geometry={sharedCreatureGeos.l4Shoulders} material={matMantle} position={[0, 0.76, 0]} castShadow />

        {/* Cabeza y Sombrero de Archidruida/Mago (ala y copa fusionadas en 1 LatheGeometry) */}
        <group ref={rigRefs?.headRef} position={[0, 1.05, 0]}>
          <mesh geometry={sharedCreatureGeos.l4Head} material={matSkin} castShadow />
          <mesh
            geometry={sharedCreatureGeos.l4Hat}
            material={matHat}
            position={[0, 0.08, -0.02]}
            rotation={[0.16, 0, 0]}
            castShadow
          />
        </group>

        {/* Báculo Arcano Curvo (TubeGeometry CatmullRomCurve3) */}
        <group ref={rigRefs?.weaponGroupRef} position={[0.42, 0.82, 0.1]} rotation={[0.08, 0, -0.05]}>
          <mesh geometry={sharedCreatureGeos.l4StaffShaft} material={matStaff} castShadow />
          <mesh
            geometry={sharedCreatureGeos.l4StaffRing}
            material={matStaffRing}
            position={[0, 0.8, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          />
          <mesh geometry={sharedCreatureGeos.l4StaffOrb} material={matOrb} position={[0, 0.8, 0]} />
        </group>
      </group>
    );
  }

  // ========================================================
  // NIVEL 5: BESTIA SAGRADA / GRIFO ALADO GUARDIÁN
  // ========================================================
  if (level === 5) {
    const matBody = getCachedStandardMat({
      color: armorMetal,
      roughness: 0.42,
      metalness: 0.45,
      mapKind: 'metal',
    });
    const matChest = getCachedStandardMat({
      color: goldTrim,
      metalness: 0.82,
      roughness: 0.28,
      mapKind: 'metal',
    });
    const matHead = getCachedStandardMat({
      color: goldTrim,
      metalness: 0.85,
      roughness: 0.24,
      mapKind: 'metal',
    });
    const matBeak = getCachedStandardMat({
      color: '#d97706',
      metalness: 0.8,
      roughness: 0.24,
      mapKind: 'metal',
    });
    const matEye = getCachedBasicMat('#ffffff');
    const matTail = getCachedStandardMat({ color: goldTrim, metalness: 0.72, roughness: 0.3, mapKind: 'metal' });

    return (
      <group position={[0, 0.16, 0]}>
        <mesh
          geometry={sharedCreatureGeos.l5Body}
          material={matBody}
          position={[0, 0.44, 0]}
          rotation={[0.15, 0, 0]}
          castShadow
        />

        <mesh
          geometry={sharedCreatureGeos.l5Chest}
          material={matChest}
          position={[0, 0.65, 0.2]}
          rotation={[0.35, 0, 0]}
          castShadow
        />

        {/* Cabeza de águila articulada (ojos fusionados en 1 malla) */}
        <group ref={rigRefs?.headRef} position={[0, 0.88, 0.35]}>
          <mesh geometry={sharedCreatureGeos.l5Helm} material={matHead} castShadow />
          <mesh
            geometry={sharedCreatureGeos.l5Beak}
            material={matBeak}
            position={[0, -0.06, 0.18]}
            rotation={[0.4, 0, 0]}
            castShadow
          />
          <mesh geometry={sharedCreatureGeos.l5Eyes} material={matEye} />
        </group>

        {/* Alas Angulares Emplumadas (ExtrudeGeometry con bisel y animación por ref) */}
        <group ref={rigRefs?.leftWingRef} position={[-0.24, 0.68, -0.04]} rotation={[0.32, 0.22, 0.28]}>
          <mesh geometry={sharedCreatureGeos.l5WingLeft} material={matCloth} castShadow />
        </group>
        <group ref={rigRefs?.rightWingRef} position={[0.24, 0.68, -0.04]} rotation={[0.32, -0.22, -0.28]}>
          <mesh geometry={sharedCreatureGeos.l5WingRight} material={matCloth} castShadow />
        </group>

        {/* Cola felina curva (TubeGeometry) */}
        <mesh
          geometry={sharedCreatureGeos.l5Tail}
          material={matTail}
          position={[0, 0.32, -0.28]}
          castShadow
        />
      </group>
    );
  }

  // ========================================================
  // NIVEL 6: TITÁN DE ADAMANTIO / COLOSO RÚNICO CON MARTILLO BISELADO
  // ========================================================
  const matTitanLeg = getCachedStandardMat({
    color: '#1e293b',
    roughness: 0.65,
    metalness: 0.5,
    mapKind: 'stone',
  });
  const matTitanTorso = getCachedStandardMat({
    color: '#334155',
    roughness: 0.65,
    metalness: 0.45,
    mapKind: 'stone',
  });
  const matTitanCore = getCachedStandardMat({
    color: isJ1 ? '#38bdf8' : '#ef4444',
    emissive: isJ1 ? '#0284c7' : '#dc2626',
    emissiveIntensity: 3.2,
  });
  const matTitanPauldron = getCachedStandardMat({
    color: '#1e293b',
    metalness: 0.72,
    roughness: 0.34,
    mapKind: 'stone',
  });
  const matTitanHead = getCachedStandardMat({
    color: '#475569',
    metalness: 0.75,
    roughness: 0.3,
    mapKind: 'metal',
  });
  const matTitanVisor = getCachedBasicMat(isJ1 ? '#38bdf8' : '#ef4444');
  const matHammerShaft = getCachedStandardMat({ color: '#0f172a', roughness: 0.8, mapKind: 'stone' });
  const matHammerHead = getCachedStandardMat({
    color: '#1e293b',
    metalness: 0.85,
    roughness: 0.25,
    mapKind: 'metal',
  });

  return (
    <group position={[0, 0.18, 0]}>
      {/* Piernas y hombreras fusionadas */}
      <mesh geometry={sharedCreatureGeos.l6Legs} material={matTitanLeg} castShadow />
      <mesh geometry={sharedCreatureGeos.l6Torso} material={matTitanTorso} position={[0, 0.74, 0]} castShadow />

      {/* Núcleo Rúnico Cósmico pulsante */}
      <group position={[0, 0.78, 0.33]}>
        <mesh geometry={sharedCreatureGeos.l6CoreRing} material={matGoldTrim} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={sharedCreatureGeos.l6CoreOrb} material={matTitanCore} />
      </group>

      <mesh geometry={sharedCreatureGeos.l6Pauldrons} material={matTitanPauldron} castShadow />

      {/* Cabeza blindada LatheGeometry */}
      <group ref={rigRefs?.headRef} position={[0, 1.18, 0]}>
        <mesh geometry={sharedCreatureGeos.l6Head} material={matTitanHead} castShadow />
        <mesh
          geometry={sharedCreatureGeos.l6Visor}
          material={matTitanVisor}
          position={[0, 0, 0.12]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </group>

      {/* Martillo Colosal de Guerra biselado (ExtrudeGeometry, articulado por ref) */}
      <group ref={rigRefs?.weaponGroupRef} position={[0.56, 0.72, 0.15]} rotation={[0.3, 0, -0.15]}>
        <mesh geometry={sharedCreatureGeos.l6HammerShaft} material={matHammerShaft} castShadow />
        <mesh
          geometry={sharedCreatureGeos.l6HammerHead}
          material={matHammerHead}
          position={[0, 0.65, 0]}
          castShadow
        />
      </group>
    </group>
  );
}

/**
 * TITÁN ASCENDIDO CÓSMICO (Unidad Suprema despierta por tiradas triples legendarias)
 * Con halo rúnico rotatorio, 4 alas angulares articuladas, partes fusionadas y PBR+IBL.
 */
export function AscendedTitanMesh({
  isJ1,
  rigRefs,
}: {
  isJ1: boolean;
  rigRefs?: CreatureRigRefs;
}) {
  const energyColor = isJ1 ? '#38bdf8' : '#c084fc';
  const emissiveColor = isJ1 ? '#0284c7' : '#9333ea';
  const armorColor = isJ1 ? '#1e1b4b' : '#3b0764';
  const goldTrim = '#f59e0b';

  const matHalo = getCachedStandardMat({
    color: goldTrim,
    emissive: energyColor,
    emissiveIntensity: 1.5,
    metalness: 0.95,
    roughness: 0.18,
    mapKind: 'metal',
  });
  const matGoldCrown = getCachedStandardMat({
    color: goldTrim,
    metalness: 0.95,
    roughness: 0.18,
    mapKind: 'metal',
  });
  const matWingUpper = getCachedStandardMat({
    color: armorColor,
    emissive: emissiveColor,
    emissiveIntensity: 0.85,
    roughness: 0.35,
    mapKind: 'metal',
  });
  const matWingLower = getCachedStandardMat({
    color: armorColor,
    emissive: emissiveColor,
    emissiveIntensity: 0.65,
    roughness: 0.38,
    mapKind: 'metal',
  });
  const matLeg = getCachedStandardMat({
    color: armorColor,
    roughness: 0.35,
    metalness: 0.72,
    mapKind: 'metal',
  });
  const matBoot = getCachedStandardMat({
    color: goldTrim,
    metalness: 0.92,
    roughness: 0.22,
    mapKind: 'metal',
  });
  const matTorso = getCachedStandardMat({
    color: armorColor,
    roughness: 0.28,
    metalness: 0.82,
    mapKind: 'metal',
  });
  const matCoreOrb = getCachedStandardMat({
    color: energyColor,
    emissive: energyColor,
    emissiveIntensity: 3.8,
    roughness: 0.05,
  });
  const matPauldron = getCachedStandardMat({
    color: goldTrim,
    metalness: 0.95,
    roughness: 0.2,
    mapKind: 'metal',
  });
  const matHead = getCachedStandardMat({
    color: '#e2e8f0',
    metalness: 0.92,
    roughness: 0.2,
    mapKind: 'metal',
  });
  const matVisor = getCachedBasicMat(energyColor);
  const matScepterShaft = getCachedStandardMat({
    color: goldTrim,
    metalness: 0.9,
    roughness: 0.22,
    mapKind: 'metal',
  });
  const matScepterOrb = getCachedStandardMat({
    color: energyColor,
    emissive: energyColor,
    emissiveIntensity: 3.5,
  });

  return (
    <group position={[0, 0.2, 0]}>
      {/* Halo Rúnico Levitante Trasero (8 picos fusionados en 1 malla + rotación por ref) */}
      <group ref={rigRefs?.haloRef} position={[0, 1.35, -0.25]}>
        <mesh geometry={sharedCreatureGeos.titanHalo} material={matHalo} />
        <mesh geometry={sharedCreatureGeos.titanHaloSpikes} material={matGoldCrown} />
      </group>

      {/* 4 Alas Cósmicas Angulares Biseladas (articuladas por ref) */}
      <group ref={rigRefs?.leftWingRef} position={[-0.28, 1.24, -0.14]} rotation={[0.22, 0.35, 0.35]}>
        <mesh geometry={sharedCreatureGeos.titanUpperWingLeft} material={matWingUpper} castShadow />
      </group>
      <group ref={rigRefs?.leftLowerWingRef} position={[-0.22, 0.88, -0.12]} rotation={[0.14, 0.28, 0.1]}>
        <mesh geometry={sharedCreatureGeos.titanLowerWingLeft} material={matWingLower} castShadow />
      </group>

      <group ref={rigRefs?.rightWingRef} position={[0.28, 1.24, -0.14]} rotation={[0.22, -0.35, -0.35]}>
        <mesh geometry={sharedCreatureGeos.titanUpperWingRight} material={matWingUpper} castShadow />
      </group>
      <group ref={rigRefs?.rightLowerWingRef} position={[0.22, 0.88, -0.12]} rotation={[0.14, -0.28, -0.1]}>
        <mesh geometry={sharedCreatureGeos.titanLowerWingRight} material={matWingLower} castShadow />
      </group>

      {/* Piernas, botas y hombreras fusionadas */}
      <mesh geometry={sharedCreatureGeos.titanLegs} material={matLeg} castShadow />
      <mesh geometry={sharedCreatureGeos.titanBoots} material={matBoot} castShadow />
      <mesh geometry={sharedCreatureGeos.titanTorso} material={matTorso} position={[0, 0.86, 0]} castShadow />

      {/* Núcleo de Supernova Cósmico pulsante */}
      <group position={[0, 0.94, 0.32]}>
        <mesh geometry={sharedCreatureGeos.titanCoreRing} material={matGoldCrown} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={sharedCreatureGeos.titanCoreOrb} material={matCoreOrb} />
      </group>

      <mesh geometry={sharedCreatureGeos.titanPauldrons} material={matPauldron} castShadow />

      {/* Cabeza y visera astral (LatheGeometry) */}
      <group ref={rigRefs?.headRef} position={[0, 1.36, 0]}>
        <mesh geometry={sharedCreatureGeos.titanHead} material={matHead} castShadow />
        <mesh
          geometry={sharedCreatureGeos.titanVisor}
          material={matVisor}
          position={[0, 0, 0.13]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </group>

      {/* Gran Cetro Astral del Juicio (TubeGeometry, articulado por ref) */}
      <group ref={rigRefs?.weaponGroupRef} position={[0.55, 0.9, 0.15]} rotation={[0.2, 0, -0.1]}>
        <mesh geometry={sharedCreatureGeos.titanScepterShaft} material={matScepterShaft} castShadow />
        <group position={[0, 0.88, 0]}>
          <mesh geometry={sharedCreatureGeos.titanScepterRing} material={matGoldCrown} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={sharedCreatureGeos.titanScepterOrb} material={matScepterOrb} />
        </group>
      </group>
    </group>
  );
}
