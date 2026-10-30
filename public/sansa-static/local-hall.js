/* Local hall. People in the room are generated here and move on their own. */
(function () {
  const WINDOW_MS = 120000;
  const BLOCKED = new Set([12, 15, 17, 18, 99]);
  const COLORS = ['#c4b49a', '#b7c3b1', '#d2c2ae', '#aeb9c4', '#cbb7a4', '#b9c6bc', '#d0c6b2', '#c3b8aa', '#b5c0b8', '#c9bea8', '#d4c8b8', '#b8c4c0'];
  const halls = new Map();
  const countCache = new Map();

  function hashString(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function validRoom(id) {
    if (id === 'maru') return true;
    const match = /^maru-(\d{2,3})$/.exec(id || '');
    if (!match) return false;
    const n = Number(match[1]);
    return n >= 2 && n <= 100;
  }

  function targetCount(room, now) {
    const bucket = Math.floor(now / WINDOW_MS);
    const key = room + '|' + bucket;
    const cached = countCache.get(key);
    if (cached != null) return cached;
    let count = 8 + (hashString(room + '|base') % 8);
    const start = bucket - 1440;
    for (let b = start; b <= bucket; b += 1) {
      const roll = mulberry32(hashString(room + '|' + b))();
      if (roll < 0.28) count -= 1;
      else if (roll > 0.72) count += 1;
      if (count < 8) count = 8;
      if (count > 18) count = 18;
    }
    countCache.set(key, count);
    return count;
  }

  function seatPos(seat) {
    const col = seat % 10;
    return {
      x: col < 5 ? (col - 5) * 2.4 : (col - 4) * 2.4,
      z: -8.4 + Math.floor(seat / 10) * 2.8,
      yaw: 0,
    };
  }

  function entrance(index) {
    const lane = index % 9;
    const x = lane === 0 ? 0 : Math.ceil(lane / 2) * (lane % 2 ? -1 : 1) * 3.2;
    return { x, z: index % 2 === 0 ? 21.6 : 18.4, yaw: 0 };
  }

  function names() {
    const list = Array.isArray(window.SANSA_NAMES) ? window.SANSA_NAMES.filter(Boolean) : [];
    return list.length ? list : ['청솔', '하얀달', '느린강', '작은별'];
  }

  function selfName(pool, rng) {
    const key = 'sansa-self-name';
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) return saved;
      const name = pool[Math.floor(rng() * pool.length)] || pool[0];
      sessionStorage.setItem(key, name);
      return name;
    } catch {
      return pool[0];
    }
  }

  function shuffle(list, rng) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function publish(person) {
    const entry = {
      id: person.id,
      name: person.name,
      color: person.color,
      seat: person.seat,
      cushion: person.cushion,
      joinedAt: person.joinedAt,
      pose: person.pose,
      position: {
        x: Math.round(person.position.x * 1000) / 1000,
        z: Math.round(person.position.z * 1000) / 1000,
        yaw: Math.round(person.position.yaw * 1000) / 1000,
      },
    };
    if (person.bowAt) entry.bowAt = person.bowAt;
    return entry;
  }

  function createHall(room) {
    const now = Date.now();
    const bucket = Math.floor(now / WINDOW_MS);
    const rng = mulberry32(hashString('roster|' + room + '|' + bucket));
    const pool = names();
    const order = shuffle(pool.slice(), rng);
    const cushions = shuffle(
      Array.from({ length: 100 }, (_, i) => i).filter((i) => !BLOCKED.has(i)),
      rng,
    );
    const count = targetCount(room, now);
    const people = [];
    for (let i = 0; i < count; i += 1) {
      const dest = cushions[i];
      const roll = rng();
      const walking = i < (count >= 12 ? 2 : 1);
      const pose = walking ? 'walk' : roll < 0.22 ? 'beads' : 'kneel';
      const spot = pose === 'walk' ? entrance(i) : seatPos(dest);
      people.push({
        id: 'guest-' + bucket.toString(36) + '-' + i.toString(36),
        name: order[i % order.length],
        color: COLORS[Math.floor(rng() * COLORS.length)],
        seat: dest,
        cushion: pose === 'walk' ? null : dest,
        joinedAt: now - Math.floor(rng() * 18 * 60 * 1000) - 60000,
        pose,
        position: { x: spot.x, z: spot.z, yaw: spot.yaw },
        bowAt: pose === 'kneel' && rng() < 0.12 ? now - 800 : 0,
        dest,
        leaving: false,
        goal: pose === 'walk' ? seatPos(dest) : null,
      });
    }
    const nameRng = mulberry32(hashString('self|' + room));
    const self = {
      id: 'self-' + hashString(room + '|' + bucket).toString(36),
      name: selfName(pool, nameRng),
      color: '#c8b89a',
      seat: 99,
      cushion: null,
      joinedAt: now,
      pose: 'walk',
      position: { x: 0, z: 20.2, yaw: 0 },
      bowAt: 0,
    };
    const hall = {
      room,
      people,
      self,
      revision: 1,
      target: count,
      sockets: new Set(),
      nextSocial: now + 4500 + Math.floor(rng() * 2500),
      nextBead: now + 2800,
      seq: count,
      born: now,
      lastPush: 0,
      pendingArrive: 0,
      swapped: false,
    };

    function taken() {
      const used = new Set(BLOCKED);
      if (hall.self.cushion != null) used.add(hall.self.cushion);
      for (const person of hall.people) {
        if (person.cushion != null) used.add(person.cushion);
        if (person.dest != null) used.add(person.dest);
      }
      return used;
    }

    function visitors() {
      return [publish(hall.self), ...hall.people.map(publish)];
    }

    function snapshot() {
      hall.lastPush = Date.now();
      return {
        type: 'snapshot',
        room: hall.room,
        selfId: hall.self.id,
        visitors: visitors(),
        revision: hall.revision,
        serverTime: Date.now(),
        instance: 0,
        region: 'apac',
      };
    }

    function push(extra) {
      hall.lastPush = Date.now();
      hall.revision += 1;
      const update = {
        type: 'update',
        room: hall.room,
        visitors: visitors(),
        revision: hall.revision,
        serverTime: Date.now(),
      };
      for (const sock of hall.sockets) {
        if (sock.readyState !== 1) continue;
        sock.emit(update);
        if (extra) sock.emit(extra);
      }
    }

    function freeCushion() {
      const used = taken();
      const open = [];
      for (let i = 0; i < 99; i += 1) if (!used.has(i)) open.push(i);
      if (!open.length) return null;
      return open[Math.floor(Math.random() * open.length)];
    }

    function arrive() {
      const dest = freeCushion();
      if (dest == null) return false;
      const spot = entrance(hall.seq);
      const poolNow = names();
      const usedNames = new Set(hall.people.map((person) => person.name));
      let name = poolNow[Math.floor(Math.random() * poolNow.length)];
      for (const candidate of poolNow) {
        if (!usedNames.has(candidate)) {
          name = candidate;
          break;
        }
      }
      hall.people.push({
        id: 'guest-live-' + hall.seq.toString(36),
        name,
        color: COLORS[hall.seq % COLORS.length],
        seat: dest,
        cushion: null,
        joinedAt: Date.now(),
        pose: 'walk',
        position: { x: spot.x, z: spot.z + 1.4, yaw: 0 },
        bowAt: 0,
        dest,
        leaving: false,
        goal: seatPos(dest),
      });
      hall.seq += 1;
      return true;
    }

    function depart() {
      const seated = hall.people.filter((person) => !person.leaving && person.pose !== 'walk');
      if (!seated.length) return false;
      const person = seated[Math.floor(Math.random() * seated.length)];
      person.leaving = true;
      person.pose = 'walk';
      person.cushion = null;
      person.goal = { x: person.position.x, z: 27.2, yaw: Math.PI };
      return true;
    }

    hall.tick = function tick(nowMs) {
      let dirty = false;
      let beadId = '';
      for (let i = hall.people.length - 1; i >= 0; i -= 1) {
        const person = hall.people[i];
        if (!person.goal) continue;
        const dx = person.goal.x - person.position.x;
        const dz = person.goal.z - person.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.22) {
          if (person.leaving) {
            hall.people.splice(i, 1);
          } else {
            person.pose = person.pose === 'beads' ? 'beads' : 'kneel';
            if (Math.random() < 0.22) person.pose = 'beads';
            person.cushion = person.dest;
            const spot = seatPos(person.dest);
            person.position = { x: spot.x, z: spot.z, yaw: 0 };
            person.goal = null;
          }
          dirty = true;
          continue;
        }
        const step = Math.min(dist, 1.35 * 0.05);
        person.position.x += (dx / dist) * step;
        person.position.z += (dz / dist) * step;
        person.position.yaw = person.goal.yaw;
        dirty = true;
      }
      if (nowMs >= hall.nextBead) {
        const turning = hall.people.filter((person) => person.pose === 'beads' && !person.leaving);
        if (turning.length) beadId = turning[Math.floor(Math.random() * turning.length)].id;
        hall.nextBead = nowMs + 2600 + Math.floor(Math.random() * 1800);
      }
      if (hall.pendingArrive && nowMs >= hall.pendingArrive) {
        arrive();
        hall.pendingArrive = 0;
        hall.swapped = false;
        dirty = true;
      }
      if (nowMs >= hall.nextSocial) {
        const sitting = hall.people.filter((person) => !person.goal && !person.leaving && person.pose !== 'walk');
        const gap = hall.people.length - hall.target;
        const roll = Math.random();
        if (gap > 1) depart();
        else if (gap < -1) arrive();
        else if (!hall.swapped && !hall.pendingArrive) {
          if (depart()) hall.pendingArrive = nowMs + 4500 + Math.floor(Math.random() * 2000);
          hall.swapped = true;
        } else if (!hall.pendingArrive && sitting.length && roll < 0.46) {
          const person = sitting[Math.floor(Math.random() * sitting.length)];
          person.pose = 'kneel';
          person.bowAt = Date.now();
          dirty = true;
        } else if (!hall.pendingArrive && sitting.length && roll < 0.68) {
          const person = sitting[Math.floor(Math.random() * sitting.length)];
          person.pose = person.pose === 'beads' ? 'kneel' : 'beads';
          dirty = true;
        } else if (!hall.pendingArrive && sitting.length) {
          const person = sitting[Math.floor(Math.random() * sitting.length)];
          push({ type: 'event', room: hall.room, event: { type: 'hello', id: person.id } });
          hall.nextSocial = nowMs + 7000 + Math.floor(Math.random() * 8000);
          return;
        }
        hall.nextSocial = nowMs + 7000 + Math.floor(Math.random() * 9000);
        dirty = true;
      }
      const since = nowMs - (hall.lastPush || 0);
      const warming = nowMs - hall.born < 14000;
      if (!dirty && since > (warming ? 900 : 14000)) dirty = true;
      if (dirty) push(beadId ? { type: 'event', room: hall.room, event: { type: 'bead', id: beadId } } : null);
      else if (beadId) {
        for (const sock of hall.sockets) {
          if (sock.readyState === 1) sock.emit({ type: 'event', room: hall.room, event: { type: 'bead', id: beadId } });
        }
      }
    };

    hall.handle = function handle(msg) {
      if (!msg || typeof msg !== 'object') return [];
      if (msg.type === 'sync') return [snapshot()];
      if (msg.type === 'ping') return [{ type: 'pong', room: hall.room }];
      if (msg.type === 'ack') return [];
      if (msg.type === 'move') {
        if (['kneel', 'walk', 'beads'].includes(msg.pose)) hall.self.pose = msg.pose;
        if ([msg.x, msg.z, msg.yaw].every((n) => typeof n === 'number' && Number.isFinite(n))) {
          hall.self.position = { x: msg.x, z: msg.z, yaw: msg.yaw };
        }
        if (msg.pose === 'walk') hall.self.cushion = null;
        return [];
      }
      if (msg.type === 'stand') {
        hall.self.cushion = null;
        hall.self.pose = 'walk';
        push(null);
        return [];
      }
      if (msg.type === 'seat') {
        const seat = freeCushion();
        if (seat == null) return [{ type: 'seat-unavailable', requestId: msg.requestId, room: hall.room }];
        hall.self.cushion = seat;
        hall.self.seat = 99;
        push(null);
        return [{ type: 'seat-granted', requestId: msg.requestId, seat, room: hall.room }];
      }
      if (msg.type === 'bow') {
        hall.self.pose = 'kneel';
        hall.self.bowAt = Date.now();
        return [];
      }
      if (msg.type === 'bead') {
        hall.self.pose = 'beads';
        return [];
      }
      if (msg.type === 'hello') return [];
      return [];
    };

    hall.snapshot = snapshot;
    return hall;
  }

  function getHall(room) {
    const id = validRoom(room) ? room : 'maru-38';
    let hall = halls.get(id);
    if (!hall) {
      hall = createHall(id);
      halls.set(id, hall);
    }
    return hall;
  }

  class SansaLocalSocket extends EventTarget {
    constructor(url) {
      super();
      this.url = String(url);
      this.readyState = 0;
      this.binaryType = 'arraybuffer';
      let room = 'maru-38';
      try {
        room = new URL(this.url, location.href).searchParams.get('room') || room;
      } catch { /* keep the default room */ }
      this.hall = getHall(room);
      this.hall.sockets.add(this);
      queueMicrotask(() => {
        if (this.readyState !== 0) return;
        this.readyState = 1;
        this.dispatchEvent(new Event('open'));
        this.emit(this.hall.snapshot());
      });
    }

    emit(payload) {
      this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(payload) }));
    }

    send(data) {
      if (this.readyState !== 1) return;
      let msg = null;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      for (const reply of this.hall.handle(msg)) this.emit(reply);
    }

    close() {
      if (this.readyState >= 2) return;
      this.readyState = 3;
      this.hall.sockets.delete(this);
      this.dispatchEvent(new CloseEvent('close'));
    }
  }

  setInterval(() => {
    const now = Date.now();
    for (const hall of halls.values()) {
      if (hall.sockets.size) hall.tick(now);
    }
  }, 50);

  function directory() {
    const rooms = [];
    for (let e = 0; e < 100; e += 1) {
      const id = e === 0 ? 'maru' : 'maru-' + String(e + 1).padStart(2, '0');
      const hall = halls.get(id);
      const count = hall ? hall.people.length + 1 : targetCount(id, Date.now()) + 1;
      rooms.push({ id, number: e + 1, count, capacity: 100 });
    }
    return { ok: true, rooms };
  }

  const origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input && input.url ? input.url : '';
    if (url.includes('/api/rooms')) {
      return Promise.resolve(new Response(JSON.stringify(directory()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    }
    if (url.includes('/api/health')) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true, localNetworkUrls: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    }
    return origFetch(input, init);
  };

  window.SansaLocalSocket = SansaLocalSocket;
})();
