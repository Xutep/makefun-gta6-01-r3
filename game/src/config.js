// Marisol City — tuning constants, palette and world layout.
// All distances are world pixels unless noted. One tile = 64 px.

export const CFG = {
  TILE: 64,
  WORLD_W: 3200,
  WORLD_H: 3200,
  ROAD_W: 128,
  ROAD_STEP: 640,
  VIEW_W: 1280,
  VIEW_H: 720,
  STEP: 1 / 60,
  // Player on foot.
  WALK_SPEED: 175,
  RUN_SPEED: 268,
  PLAYER_R: 14,
  PLAYER_HEALTH: 100,
  // Cars (arcade physics, speeds in px/s).
  CAR_R: 26,
  CAR_ACCEL: 430,
  CAR_BRAKE: 760,
  CAR_REVERSE_MAX: 170,
  CAR_TURN: 2.7,
  CAR_DRAG: 0.55,
  CAR_MAX: { sedan: 430, taxi: 455, van: 380, sports: 640, police: 565 },
  // Combat.
  BULLET_SPEED: 920,
  BULLET_LIFE: 0.9,
  PISTOL_AMMO: 24,
  PISTOL_RANGE: 540,
  PUNCH_RANGE: 48,
  PUNCH_DAMAGE: 34,
  PUNCH_CD: 0.45,
  SHOOT_CD: 0.22,
  // Wanted / police.
  WANTED_MAX: 5,
  CRIME_DECAY_S: 25,
  POLICE_PER_STAR: 2,
  POLICE_MAX: 8,
  BUST_TIME: 1.4,
  // World.
  PICKUP_R: 16,
  MINIMAP: 190,
};

// Road bands: each band starts at one of these offsets and is ROAD_W wide,
// running the full width (horizontal) or height (vertical) of the city.
export const ROAD_BANDS = [0, 640, 1280, 1920, 2560];

// Palette — one place for every colour the city uses.
export const PAL = {
  grass: '#4a7d3a',
  grassDark: '#3e6c32',
  park: '#57a047',
  road: '#33363b',
  roadEdge: '#26282c',
  lane: '#d8c95a',
  sidewalk: '#9a9a92',
  crosswalk: '#e8e8e2',
  sand: '#d9c27a',
  water: '#2f6fb2',
  waterDeep: '#245a92',
  pier: '#8a6b48',
  buildingRoof: ['#b0563a', '#7a6a9e', '#4f7d8a', '#a08a4f', '#8a4f6d', '#5d7a4f'],
  buildingSide: '#00000033',
  downtownRoof: ['#5a6a7d', '#6d7d8a', '#4a5a6d', '#7d6a5a'],
  tree: '#2f6b2a',
  treeLight: '#4a8a3a',
  player: '#e8b13c',
  playerDark: '#8a6a1a',
  police: '#2f4a8a',
  policeLight: '#d8d8e8',
  blood: '#a02020',
  hudBg: 'rgba(12, 14, 18, 0.72)',
  hudText: '#f2f2e8',
  hudGold: '#f2c14e',
  star: '#ffd94a',
  starEmpty: '#5a5a52',
  waypoint: '#ffd94a',
  mission: '#7de3ff',
  dialogBg: 'rgba(10, 12, 20, 0.85)',
};
