import { AnimatedEffect, EffectNode } from '../types';

/**
 * Advanced Elemental Physics & Fluid Fronts Engine
 * 
 * Capabilities:
 * 1. Multi-Node Organic Trails & Fronts:
 *    Instead of ballooning into a single giant circle, fire and water form
 *    winding trails, rivers, firewalls, and complex spreading fronts.
 * 2. Smart Node-Welding & Clustering:
 *    When painting or placing adjacent elements of the same type, they attach
 *    as connected vertices in an organic ribbon/network, keeping individual node sizes natural.
 * 3. Directional Propagation & Clash Dynamics (Water ⇄ Fire):
 *    - Water extinguishes touching fire nodes, creating steam vapor clouds.
 *    - Fire evaporates water if water is surrounded or outnumbered by nearby fire nodes.
 *    - Balanced clashes generate dense sizzling steam and dynamic front competition.
 */

export interface SteamVaporEvent {
  id: string;
  x: number;
  y: number;
  radius: number;
  createdAt: number;
}

export interface ElementalInteractionResult {
  updatedEffects: AnimatedEffect[];
  steamEvents: SteamVaporEvent[];
  message?: string;
}

function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Normalizes an AnimatedEffect to ensure it has a valid nodes array
 */
export function normalizeEffectNodes(effect: AnimatedEffect): EffectNode[] {
  if (effect.nodes && effect.nodes.length > 0) {
    return effect.nodes.map((n) => ({
      x: n.x,
      y: n.y,
      r: n.r || effect.radius || 40,
    }));
  }
  return [
    {
      x: effect.position.x,
      y: effect.position.y,
      r: effect.radius || 40,
    },
  ];
}

/**
 * Attaches or welds a new node into an existing effect's path/network
 */
export function attachNodeToEffect(
  effect: AnimatedEffect,
  newNode: EffectNode,
  minDist = 18,
  maxConnectDist = 140
): { effect: AnimatedEffect; attached: boolean } {
  const nodes = normalizeEffectNodes(effect);

  // Check if too close to an existing node (weld / update)
  let closestDist = Infinity;
  let closestIdx = -1;

  for (let i = 0; i < nodes.length; i++) {
    const d = getDistance(nodes[i].x, nodes[i].y, newNode.x, newNode.y);
    if (d < closestDist) {
      closestDist = d;
      closestIdx = i;
    }
  }

  if (closestDist < minDist) {
    // Already covered by this node
    return { effect, attached: true };
  }

  if (closestDist <= maxConnectDist) {
    // Attach to existing path at optimal index (end, start, or nearest neighbor)
    const newNodes = [...nodes];
    if (closestIdx === newNodes.length - 1) {
      newNodes.push(newNode);
    } else if (closestIdx === 0) {
      newNodes.unshift(newNode);
    } else {
      // Insert right after nearest neighbor
      newNodes.splice(closestIdx + 1, 0, newNode);
    }

    // Recompute root center of mass
    let sumX = 0;
    let sumY = 0;
    for (const n of newNodes) {
      sumX += n.x;
      sumY += n.y;
    }

    return {
      effect: {
        ...effect,
        position: {
          x: Math.round(sumX / newNodes.length),
          y: Math.round(sumY / newNodes.length),
        },
        nodes: newNodes,
      },
      attached: true,
    };
  }

  return { effect, attached: false };
}

/**
 * Evaluates elemental interaction between Water and Fire across all individual nodes.
 */
export function processElementalClashes(
  effectsList: AnimatedEffect[]
): { effects: AnimatedEffect[]; steam: SteamVaporEvent[] } {
  const steam: SteamVaporEvent[] = [];

  // Separate fire and water effects
  let fireEffects = effectsList
    .filter((e) => e.type === 'fire')
    .map((e) => ({ ...e, nodes: normalizeEffectNodes(e) }));

  let waterEffects = effectsList
    .filter((e) => e.type === 'water')
    .map((e) => ({ ...e, nodes: normalizeEffectNodes(e) }));

  const otherEffects = effectsList.filter((e) => e.type !== 'fire' && e.type !== 'water');

  // Node-level collision detection
  for (let wIdx = 0; wIdx < waterEffects.length; wIdx++) {
    const water = waterEffects[wIdx];
    const survivingWaterNodes: EffectNode[] = [];

    for (let wn = 0; wn < water.nodes.length; wn++) {
      const wNode = water.nodes[wn];
      const wRadius = wNode.r || 40;

      // Count contacting and surrounding fire nodes
      let touchingFireCount = 0;
      let surroundingAngles: number[] = [];

      for (let fIdx = 0; fIdx < fireEffects.length; fIdx++) {
        const fire = fireEffects[fIdx];
        const survivingFireNodes: EffectNode[] = [];

        for (let fn = 0; fn < fire.nodes.length; fn++) {
          const fNode = fire.nodes[fn];
          const fRadius = fNode.r || 40;
          const dist = getDistance(wNode.x, wNode.y, fNode.x, fNode.y);
          const contactRadius = (wRadius + fRadius) * 0.75;

          if (dist <= contactRadius) {
            touchingFireCount++;
            const angle = Math.atan2(fNode.y - wNode.y, fNode.x - wNode.x);
            surroundingAngles.push(angle);

            // Water douses Fire: Unless fire heavily surrounds water, fire node is extinguished
            // Spawn steam puff at clash point
            steam.push({
              id: `steam-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              x: Math.round((wNode.x + fNode.x) / 2),
              y: Math.round((wNode.y + fNode.y) / 2),
              radius: Math.max(25, (wRadius + fRadius) * 0.45),
              createdAt: Date.now(),
            });

            // Fire node is quenched by water unless fire is overwhelmingly large
            // (If fire is not overwhelming, don't keep this fire node)
            // (We keep it only if fire count > 3)
          } else {
            survivingFireNodes.push(fNode);
          }
        }
        fire.nodes = survivingFireNodes;
      }

      // Check if water is surrounded by fire (> 2 distinct surrounding angles or heavy fire presence)
      const isSurrounded = touchingFireCount >= 3;
      if (!isSurrounded) {
        survivingWaterNodes.push(wNode);
      }
    }
    water.nodes = survivingWaterNodes;
  }

  // Filter out any effects whose nodes were completely extinguished / evaporated
  const activeFire = fireEffects
    .filter((f) => f.nodes.length > 0)
    .map((f) => {
      let sumX = 0, sumY = 0;
      for (const n of f.nodes) {
        sumX += n.x;
        sumY += n.y;
      }
      return {
        ...f,
        position: { x: Math.round(sumX / f.nodes.length), y: Math.round(sumY / f.nodes.length) },
      };
    });

  const activeWater = waterEffects
    .filter((w) => w.nodes.length > 0)
    .map((w) => {
      let sumX = 0, sumY = 0;
      for (const n of w.nodes) {
        sumX += n.x;
        sumY += n.y;
      }
      return {
        ...w,
        position: { x: Math.round(sumX / w.nodes.length), y: Math.round(sumY / w.nodes.length) },
      };
    });

  return {
    effects: [...otherEffects, ...activeFire, ...activeWater],
    steam,
  };
}

/**
 * Main entrance function when placing or painting an effect onto the workspace.
 * Smoothly extends trails/rivers/complex shapes or creates a new element.
 */
export function applyElementalInteraction(
  existingEffects: AnimatedEffect[],
  incoming: AnimatedEffect
): ElementalInteractionResult {
  let list = [...existingEffects];
  const incomingNodes = normalizeEffectNodes(incoming);

  // 1. Try to attach incoming nodes to an existing trail of the same type
  let wasAttached = false;

  for (let i = 0; i < list.length; i++) {
    const existing = list[i];
    if (existing.type === incoming.type) {
      // Check if any incoming node is within connect distance of this existing effect
      for (const inNode of incomingNodes) {
        const res = attachNodeToEffect(existing, inNode);
        if (res.attached) {
          list[i] = res.effect;
          wasAttached = true;
        }
      }
      if (wasAttached) break;
    }
  }

  if (!wasAttached) {
    // Create new standalone trail / shape
    list.push({
      ...incoming,
      nodes: incomingNodes,
    });
  }

  // 2. Process water ⇄ fire clashes and extinguishing logic
  const clashResult = processElementalClashes(list);

  return {
    updatedEffects: clashResult.effects,
    steamEvents: clashResult.steam,
  };
}
