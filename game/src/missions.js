// Marisol City — story: five sequential missions with dialog, waypoints,
// timers and cash rewards. Free roam after the last one.

import { nearestRoadPoint } from './world.js';
import { setWanted } from './police.js';
import { writeSave } from './save.js';

export const MISSIONS = [
  {
    name: 'First Fare',
    reward: 400,
    objective: 'Pick up the client, then drive them across town',
    dialog: [
      'Jax: Another day, another fare. The client is waiting uptown.',
      'Client: Take me across town, and step on it — I am late!',
    ],
  },
  {
    name: 'Hot Wheels',
    reward: 900,
    objective: 'Steal the red sports car and bring it to the garage',
    dialog: [
      'Rosa: A red sports car is parked near the marina. Bring it to my garage.',
      'Rosa: No questions. Just do not scratch the paint.',
    ],
  },
  {
    name: 'The Pickup',
    reward: 1200,
    objective: 'Collect 3 packages — keep your wanted level at 2 or below',
    dialog: [
      'Jax: Three packages, three corners of the city. Quietly.',
      'Rosa: The cops are jumpy today. Stay under 3 stars or the deal is off.',
    ],
  },
  {
    name: 'Heat Rising',
    reward: 1800,
    objective: 'Survive the 3-star chase for 30s, then deliver the package',
    dialog: [
      'Rosa: They made you. Lose them for thirty seconds, then run the package.',
      'Jax: Thirty seconds of sirens. I can do thirty seconds.',
    ],
  },
  {
    name: 'The Big Score',
    reward: 3500,
    objective: 'Hit 3 stops under 4-star heat, then escape to the hideout',
    dialog: [
      'Rosa: The big one. Three stops, full heat, then the hideout. No mistakes.',
      'Jax: One last job. Let us make it count.',
    ],
  },
];

function roadPoint(G, x, y) {
  return nearestRoadPoint(G.world, x, y) || { x, y };
}

export function setupMission(G, index) {
  const m = MISSIONS[index];
  const mission = {
    index,
    name: m.name,
    reward: m.reward,
    objective: m.objective,
    stage: 0,
    waypoint: null,
    timer: 0,
    timerMax: 0,
    dialog: [...m.dialog],
    dialogIdx: 0,
    dialogUntil: 0,
    stops: [],
    stopIdx: 0,
    done: false,
  };
  G.mission = mission;
  if (index === 0) {
    mission.waypoint = roadPoint(G, 2100, 900);
    mission.waypoint.label = 'Pick up the client';
  } else if (index === 1) {
    const hot = G.parkedCars.find((c) => c.hot) || G.world.parked[0];
    mission.waypoint = hot ? { x: hot.x, y: hot.y, label: 'Steal the red sports car' } : roadPoint(G, 900, 2100);
    mission.hotCar = hot || null;
  } else if (index === 2) {
    mission.stops = [
      roadPoint(G, 700, 2100),
      roadPoint(G, 2600, 700),
      roadPoint(G, 2600, 2600),
    ];
    mission.waypoint = { ...mission.stops[0], label: 'Package 1 of 3' };
  } else if (index === 3) {
    setWanted(G, 3);
    mission.timer = 30;
    mission.timerMax = 30;
    mission.waypoint = roadPoint(G, 1400, 1400);
    mission.waypoint.label = 'Stay alive — lose the chase';
  } else if (index === 4) {
    setWanted(G, 4);
    mission.stops = [
      roadPoint(G, 700, 700),
      roadPoint(G, 2600, 1400),
      roadPoint(G, 1400, 2600),
    ];
    mission.waypoint = { ...mission.stops[0], label: 'Stop 1 of 3' };
  }
  mission.dialogUntil = G.now + 5;
  return mission;
}

function arrive(G, target, radius) {
  const p = G.player;
  return Math.hypot(p.x - target.x, p.y - target.y) < radius;
}

function completeMission(G) {
  const mission = G.mission;
  const p = G.player;
  p.cash += mission.reward;
  mission.done = true;
  G.banner = { text: `Mission complete: ${mission.name}  +$${mission.reward}`, until: G.now + 3.5 };
  G.events.push({ type: 'text', text: `Mission complete: ${mission.name} (+$${mission.reward})`, at: G.now });
  writeSave({ missionsDone: mission.index + 1, cash: p.cash, bestWanted: G.bestWanted, muted: G.audio.muted });
  if (mission.index + 1 >= MISSIONS.length) {
    G.mission = null;
    G.banner = { text: 'All missions complete — free roam! Marisol City is yours.', until: G.now + 5 };
  } else {
    setupMission(G, mission.index + 1);
  }
}

function failMission(G, reason) {
  G.banner = { text: reason, until: G.now + 3.5 };
  G.events.push({ type: 'text', text: reason, at: G.now });
  setupMission(G, G.mission.index);
}

export function updateMission(G, dt) {
  const mission = G.mission;
  if (!mission) return;
  const p = G.player;

  // Dialog auto-advances; E skips ahead (handled in main update).
  if (mission.dialogIdx < mission.dialog.length && G.now > mission.dialogUntil) {
    mission.dialogIdx += 1;
    mission.dialogUntil = G.now + 5;
  }

  if (mission.index === 0) {
    if (mission.stage === 0) {
      if (arrive(G, mission.waypoint, 70)) {
        mission.stage = 1;
        mission.waypoint = roadPoint(G, 700, 2600);
        mission.waypoint.label = 'Drop the client off';
        mission.timer = 75;
        mission.timerMax = 75;
        G.events.push({ type: 'text', text: 'Client aboard — 75 seconds to the drop-off', at: G.now });
      }
    } else {
      mission.timer -= dt;
      if (mission.timer <= 0) {
        failMission(G, 'Too slow — the client walked. Try again.');
        return;
      }
      if (arrive(G, mission.waypoint, 70)) completeMission(G);
    }
  } else if (mission.index === 1) {
    if (mission.stage === 0) {
      if (!p.onFoot && p.car && p.car.hot) {
        mission.stage = 1;
        mission.waypoint = roadPoint(G, 2100, 2100);
        mission.waypoint.label = 'Bring it to the garage';
        G.events.push({ type: 'text', text: 'Got the car — now to the garage', at: G.now });
      }
    } else if (arrive(G, mission.waypoint, 80) && p.car && p.car.hot) {
      completeMission(G);
    }
  } else if (mission.index === 2) {
    if (G.wanted.level >= 3) {
      failMission(G, 'Too hot! The deal went cold — lay low and try again.');
      return;
    }
    if (arrive(G, mission.waypoint, 70)) {
      mission.stopIdx += 1;
      if (mission.stopIdx >= mission.stops.length) {
        completeMission(G);
      } else {
        mission.waypoint = { ...mission.stops[mission.stopIdx], label: `Package ${mission.stopIdx + 1} of 3` };
      }
    }
  } else if (mission.index === 3) {
    if (mission.stage === 0) {
      mission.timer -= dt;
      if (mission.timer <= 0) {
        mission.stage = 1;
        mission.waypoint = roadPoint(G, 900, 900);
        mission.waypoint.label = 'Deliver the package';
        G.events.push({ type: 'text', text: 'You shook them — now deliver the package', at: G.now });
      }
    } else if (arrive(G, mission.waypoint, 70)) {
      completeMission(G);
    }
  } else if (mission.index === 4) {
    if (arrive(G, mission.waypoint, 80)) {
      mission.stopIdx += 1;
      if (mission.stopIdx < mission.stops.length) {
        mission.waypoint = { ...mission.stops[mission.stopIdx], label: `Stop ${mission.stopIdx + 1} of 3` };
      } else if (mission.stage === 0) {
        mission.stage = 1;
        mission.waypoint = roadPoint(G, 1400, 1400);
        mission.waypoint.label = 'Escape to the hideout';
      } else {
        completeMission(G);
      }
    }
  }
}

// Current dialog line, if one is showing.
export function currentDialog(G) {
  const mission = G.mission;
  if (!mission || mission.dialogIdx >= mission.dialog.length) return null;
  return mission.dialog[mission.dialogIdx];
}
