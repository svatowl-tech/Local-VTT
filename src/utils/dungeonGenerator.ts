export interface DungeonOptions {
  width: number;
  height: number;
  roomCount: number;
  minRoomSize: number;
  maxRoomSize: number;
  lootChance: number;
  trapChance: number;
  doorChance: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  center: Point;
}

export function generateDungeon(options: DungeonOptions): number[][] {
  // 1 is ground, 0 is floor, 2 is wall
  const map: number[][] = Array.from({ length: options.height }, () =>
    Array(options.width).fill(1)
  );

  const rooms: Room[] = [];

  for (let i = 0; i < options.roomCount; i++) {
    const w = Math.floor(Math.random() * (options.maxRoomSize - options.minRoomSize + 1)) + options.minRoomSize;
    const h = Math.floor(Math.random() * (options.maxRoomSize - options.minRoomSize + 1)) + options.minRoomSize;
    const x = Math.floor(Math.random() * (options.width - w - 1)) + 1;
    const y = Math.floor(Math.random() * (options.height - h - 1)) + 1;

    const newRoom: Room = { x, y, w, h, center: { x: Math.floor(x + w / 2), y: Math.floor(y + h / 2) } };

    let failed = false;
    for (const otherRoom of rooms) {
      if (
        newRoom.x <= otherRoom.x + otherRoom.w + 1 &&
        newRoom.x + newRoom.w >= otherRoom.x - 1 &&
        newRoom.y <= otherRoom.y + otherRoom.h + 1 &&
        newRoom.y + newRoom.h >= otherRoom.y - 1
      ) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      // Carve room
      for (let ry = newRoom.y; ry < newRoom.y + newRoom.h; ry++) {
        for (let rx = newRoom.x; rx < newRoom.x + newRoom.w; rx++) {
          map[ry][rx] = 0;
        }
      }

      if (rooms.length > 0) {
        // Connect to previous room
        const prevRoom = rooms[rooms.length - 1];
        carveCorridor(map, prevRoom.center, newRoom.center);
      }

      rooms.push(newRoom);
    }
  }

  // Post-process: Add walls (2) around floors (0)
  const processedMap: number[][] = Array.from({ length: options.height }, () => Array(options.width).fill(1));
  
  for (let y = 0; y < options.height; y++) {
    for (let x = 0; x < options.width; x++) {
      if (map[y][x] === 0) {
        processedMap[y][x] = 0; // Floor
      } else {
        // Check surrounding cells for floor
        let touchesFloor = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (y + dy >= 0 && y + dy < options.height && x + dx >= 0 && x + dx < options.width) {
              if (map[y + dy][x + dx] === 0) {
                touchesFloor = true;
              }
            }
          }
        }
        processedMap[y][x] = touchesFloor ? 2 : 1;
      }
    }
  }

  // Add special features: 3: DoorH, 4: DoorV, 5: StairsUp, 6: StairsDown, 7: Loot, 8: Trap
  if (rooms.length > 0) {
    // 1. Stairs (Start and End)
    const startRoom = rooms[0];
    processedMap[startRoom.center.y][startRoom.center.x] = 5; // Stairs Up
    
    if (rooms.length > 1) {
      const endRoom = rooms[rooms.length - 1];
      processedMap[endRoom.center.y][endRoom.center.x] = 6; // Stairs Down
    }

    // 2. Loot and Traps inside rooms
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      
      if (Math.random() < (options.lootChance ?? 0.7)) { // chance for loot
        const lx = room.x + Math.floor(Math.random() * room.w);
        const ly = room.y + Math.floor(Math.random() * room.h);
        if (processedMap[ly][lx] === 0) processedMap[ly][lx] = 7;
      }
      
      if (Math.random() < (options.trapChance ?? 0.5)) { // chance for trap
        const tx = room.x + Math.floor(Math.random() * room.w);
        const ty = room.y + Math.floor(Math.random() * room.h);
        if (processedMap[ty][tx] === 0) processedMap[ty][tx] = 8;
      }
    }

    // 3. Doors at room entrances (chokepoints)
    for (const room of rooms) {
      // Top & Bottom edges
      for (let x = room.x; x < room.x + room.w; x++) {
        if (room.y - 1 >= 0 && processedMap[room.y - 1][x] === 0) {
          if (Math.random() < (options.doorChance ?? 0.6)) processedMap[room.y - 1][x] = 3; // Horizontal door
        }
        if (room.y + room.h < options.height && processedMap[room.y + room.h][x] === 0) {
          if (Math.random() < (options.doorChance ?? 0.6)) processedMap[room.y + room.h][x] = 3;
        }
      }
      // Left & Right edges
      for (let y = room.y; y < room.y + room.h; y++) {
        if (room.x - 1 >= 0 && processedMap[y][room.x - 1] === 0) {
          if (Math.random() < (options.doorChance ?? 0.6)) processedMap[y][room.x - 1] = 4; // Vertical door
        }
        if (room.x + room.w < options.width && processedMap[y][room.x + room.w] === 0) {
          if (Math.random() < (options.doorChance ?? 0.6)) processedMap[y][room.x + room.w] = 4;
        }
      }
    }
  }

  return processedMap;
}

function carveCorridor(map: number[][], p1: Point, p2: Point) {
  let x = p1.x;
  let y = p1.y;

  while (x !== p2.x) {
    map[y][x] = 0;
    // widen corridor slightly
    if (y + 1 < map.length) map[y+1][x] = 0;
    x += x < p2.x ? 1 : -1;
  }
  while (y !== p2.y) {
    map[y][x] = 0;
    if (x + 1 < map[0].length) map[y][x+1] = 0;
    y += y < p2.y ? 1 : -1;
  }
}

// --- Procedural Texture Generators ---

function createGroundPattern(ctx: CanvasRenderingContext2D, size: number): CanvasPattern | string {
  const cvs = document.createElement('canvas');
  cvs.width = size * 2;
  cvs.height = size * 2;
  const pctx = cvs.getContext('2d');
  if (!pctx) return '#0d0d0d';
  
  pctx.fillStyle = '#0a0a0c'; // Deep dark void/earth
  pctx.fillRect(0, 0, cvs.width, cvs.height);
  
  // Dirt/noise
  for(let i = 0; i < (size * size) / 2; i++) {
    pctx.fillStyle = Math.random() > 0.5 ? '#111216' : '#050506';
    pctx.fillRect(Math.random() * cvs.width, Math.random() * cvs.height, Math.random() * 3 + 1, Math.random() * 3 + 1);
  }
  
  return ctx.createPattern(cvs, 'repeat') || '#0d0d0d';
}

function createFloorPattern(ctx: CanvasRenderingContext2D, size: number): CanvasPattern | string {
  const cvs = document.createElement('canvas');
  cvs.width = size;
  cvs.height = size;
  const pctx = cvs.getContext('2d');
  if (!pctx) return '#454a50';
  
  pctx.fillStyle = '#4f565e';
  pctx.fillRect(0, 0, size, size);
  
  // Stone texture noise
  for(let i = 0; i < (size * size) / 4; i++) {
    pctx.fillStyle = Math.random() > 0.5 ? '#5a626a' : '#454b52';
    pctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 2 + 1, Math.random() * 2 + 1);
  }
  
  // Tile edges
  pctx.strokeStyle = 'rgba(0,0,0,0.5)';
  pctx.lineWidth = 2;
  pctx.strokeRect(0, 0, size, size);
  
  // Subtle inner highlight
  pctx.strokeStyle = 'rgba(255,255,255,0.06)';
  pctx.lineWidth = 1;
  pctx.strokeRect(2, 2, size - 4, size - 4);
  
  return ctx.createPattern(cvs, 'repeat') || '#454a50';
}

function createWallPattern(ctx: CanvasRenderingContext2D, size: number): CanvasPattern | string {
  const cvs = document.createElement('canvas');
  cvs.width = size;
  cvs.height = size;
  const pctx = cvs.getContext('2d');
  if (!pctx) return '#22252a';
  
  pctx.fillStyle = '#2b2f36';
  pctx.fillRect(0, 0, size, size);
  
  // Wall texture
  for(let i = 0; i < (size * size) / 4; i++) {
    pctx.fillStyle = Math.random() > 0.5 ? '#353a42' : '#22252b';
    pctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 3 + 1, Math.random() * 3 + 1);
  }
  
  // Bevel effect to make it look 3D (Extrusion)
  pctx.fillStyle = 'rgba(255,255,255,0.12)'; // Top/Left highlight
  pctx.fillRect(0, 0, size, 4);
  pctx.fillRect(0, 0, 4, size);
  
  pctx.fillStyle = 'rgba(0,0,0,0.6)'; // Bottom/Right shadow
  pctx.fillRect(0, size - 4, size, 4);
  pctx.fillRect(size - 4, 0, 4, size);
  
  // Inner block line
  pctx.strokeStyle = 'rgba(0,0,0,0.8)';
  pctx.lineWidth = 2;
  pctx.strokeRect(0, 0, size, size);

  return ctx.createPattern(cvs, 'repeat') || '#22252a';
}

export async function drawDungeonToDataURL(map: number[][], cellSize: number = 40): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = map[0].length * cellSize;
  canvas.height = map.length * cellSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  const groundPat = createGroundPattern(ctx, cellSize);
  const floorPat = createFloorPattern(ctx, cellSize);
  const wallPat = createWallPattern(ctx, cellSize);

  // 1. Draw ground base
  ctx.fillStyle = groundPat;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw floors & walls
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const val = map[y][x];
      // Floor base is drawn for empty floor (0) and all objects (3-8)
      if (val === 0 || val >= 3) {
        ctx.fillStyle = floorPat;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      } else if (val === 2) {
        ctx.fillStyle = wallPat;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  // 3. Ambient Occlusion / Shadows on floor from walls
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const val = map[y][x];
      if (val === 0 || val >= 3) {
        const shadowSize = Math.max(12, cellSize * 0.4);
        
        // North shadow
        if (y > 0 && map[y-1][x] === 2) {
          const grad = ctx.createLinearGradient(0, y * cellSize, 0, y * cellSize + shadowSize);
          grad.addColorStop(0, 'rgba(0,0,0,0.8)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, shadowSize);
        }
        // South shadow
        if (y < map.length - 1 && map[y+1][x] === 2) {
          const grad = ctx.createLinearGradient(0, (y+1) * cellSize, 0, (y+1) * cellSize - shadowSize);
          grad.addColorStop(0, 'rgba(0,0,0,0.8)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(x * cellSize, (y+1) * cellSize - shadowSize, cellSize, shadowSize);
        }
        // West shadow
        if (x > 0 && map[y][x-1] === 2) {
          const grad = ctx.createLinearGradient(x * cellSize, 0, x * cellSize + shadowSize, 0);
          grad.addColorStop(0, 'rgba(0,0,0,0.8)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(x * cellSize, y * cellSize, shadowSize, cellSize);
        }
        // East shadow
        if (x < map[y].length - 1 && map[y][x+1] === 2) {
          const grad = ctx.createLinearGradient((x+1) * cellSize, 0, (x+1) * cellSize - shadowSize, 0);
          grad.addColorStop(0, 'rgba(0,0,0,0.8)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect((x+1) * cellSize - shadowSize, y * cellSize, shadowSize, cellSize);
        }
      }
    }
  }

  // 4. Draw Objects (Doors, Stairs, Loot, Traps)
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const val = map[y][x];
      if (val < 3) continue;

      const px = x * cellSize;
      const py = y * cellSize;
      const cs = cellSize;

      if (val === 3) { // Horizontal Door
        ctx.fillStyle = '#4a3320';
        ctx.fillRect(px, py + cs/2 - 6, cs, 12);
        ctx.strokeStyle = '#1a0b02';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py + cs/2 - 6, cs, 12);
        // Hinges/Handles
        ctx.fillStyle = '#88929b';
        ctx.fillRect(px + cs - 10, py + cs/2 - 2, 4, 4);
      } else if (val === 4) { // Vertical Door
        ctx.fillStyle = '#4a3320';
        ctx.fillRect(px + cs/2 - 6, py, 12, cs);
        ctx.strokeStyle = '#1a0b02';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + cs/2 - 6, py, 12, cs);
        ctx.fillStyle = '#88929b';
        ctx.fillRect(px + cs/2 - 2, py + cs - 10, 4, 4);
      } else if (val === 5) { // Stairs Up
        const steps = 5;
        const stepHeight = cs / steps;
        for(let i=0; i<steps; i++) {
          const shade = 90 + i * 25; // Gets lighter towards top
          ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
          ctx.fillRect(px, py + i * stepHeight, cs, stepHeight);
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py + i * stepHeight, cs, stepHeight);
        }
      } else if (val === 6) { // Stairs Down
        const steps = 5;
        const stepHeight = cs / steps;
        for(let i=0; i<steps; i++) {
          const shade = 100 - i * 15; // Gets darker towards bottom
          ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
          ctx.fillRect(px, py + i * stepHeight, cs, stepHeight);
          ctx.strokeStyle = 'rgba(0,0,0,0.8)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py + i * stepHeight, cs, stepHeight);
        }
      } else if (val === 7) { // Loot (Chest)
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(px + cs/4, py + cs/4, cs/2, cs/2);
        ctx.fillStyle = '#e6c229'; // Gold trim
        ctx.fillRect(px + cs/4, py + cs/4 + 2, cs/2, 4);
        ctx.fillRect(px + cs/4, py + cs*3/4 - 6, cs/2, 4);
        ctx.fillStyle = '#silver';
        ctx.fillRect(px + cs/2 - 3, py + cs/2 - 3, 6, 6);
      } else if (val === 8) { // Trap (Spikes)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(px + 6, py + 6, cs - 12, cs - 12);
        ctx.fillStyle = '#7a7a7a';
        for(let i=0; i<3; i++) {
          for(let j=0; j<3; j++) {
            ctx.beginPath();
            ctx.arc(px + 12 + i * ((cs-24)/2), py + 12 + j * ((cs-24)/2), 2.5, 0, Math.PI*2);
            ctx.fill();
          }
        }
      }
    }
  }

  return canvas.toDataURL('image/jpeg', 0.85); // JPEG is much faster and smaller for noisy textures
}
