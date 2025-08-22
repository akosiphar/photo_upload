// Basic PWA front‑end for POV‑style uploads
const FRONTEND_CONFIG = {
  BACKEND_URL:
    "https://script.google.com/macros/s/AKfycbwrZc5hiNyXJOvuQBaTVU6Ss_qalX5p4YKGgbOVf9egIheGO9py4ha4A-WRTlxSoM8E/exec",
};

// Register SW
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

// IndexedDB utility (very small)
const idb = {
  _db: null,
  async db() {
    if (this._db) return this._db;
    return (this._db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("pov-event-camera", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("queue"))
          db.createObjectStore("queue", { keyPath: "id" });
        if (!db.objectStoreNames.contains("session"))
          db.createObjectStore("session", { keyPath: "key" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  },
  async put(store, obj) {
    const db = await this.db();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(obj);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  },
  async get(store, key) {
    const db = await this.db();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, "readonly");
      const g = tx.objectStore(store).get(key);
      g.onsuccess = () => res(g.result);
      g.onerror = () => rej(g.error);
    });
  },
  async all(store) {
    const db = await this.db();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, "readonly");
      const out = [];
      const cur = tx.objectStore(store).openCursor();
      cur.onsuccess = () => {
        const c = cur.result;
        if (c) {
          out.push(c.value);
          c.continue();
        } else res(out);
      };
      cur.onerror = () => rej(cur.error);
    });
  },
  async del(store, key) {
    const db = await this.db();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  },
};

const el = (id) => document.getElementById(id);
const qs = (s) => document.querySelector(s);

const state = {
  eventId: new URLSearchParams(location.search).get("event") || "",
  shooterId: null,
  secret: null,
  remaining: null,
  stream: null,
  facing: "environment",
};

function setStatus() {
  const s = navigator.onLine ? "online" : "offline";
  el("status").textContent = s;
  el("status").className = "pill " + (navigator.onLine ? "ok" : "warn");
}
window.addEventListener("online", setStatus);
window.addEventListener("offline", setStatus);
setStatus();

// Restore session
(async () => {
  const sess = await idb.get("session", "auth");
  if (sess) {
    Object.assign(state, sess);
    el("eventId").value = state.eventId || "";
    if (state.shooterId) {
      el("displayName").value = sess.displayName || "";
      afterJoin();
    }
  } else if (state.eventId) {
    el("eventId").value = state.eventId;
  }
})();

el("joinBtn").addEventListener("click", async () => {
  const eventId = el("eventId").value.trim();
  const displayName = el("displayName").value.trim() || "Anonymous";
  if (!eventId) return (el("joinMsg").textContent = "Enter an Event ID");

  const res = await api({ action: "register", eventId, displayName });
  if (!res.ok) {
    el("joinMsg").textContent = res.error || "Join failed";
    return;
  }
  state.eventId = eventId;
  state.shooterId = res.shooterId;
  state.secret = res.secret;
  state.remaining = res.remaining;
  await idb.put("session", { key: "auth", ...state, displayName });
  el("joinMsg").textContent = `Joined ${eventId} as ${displayName}`;
  afterJoin();
});

function remainingBadge() {
  el("remaining").textContent = (state.remaining ?? "—") + " left";
}

async function afterJoin() {
  remainingBadge();
  el("camSection").style.display = "";
  await startCamera();
}

async function startCamera() {
  if (state.stream) state.stream.getTracks().forEach((t) => t.stop());
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.facing },
    });
    const vid = el("preview");
    vid.srcObject = state.stream;
    await vid.play();
    el("snapBtn").disabled = false;
  } catch (e) {
    el("msg").textContent = "Camera error: " + e.message;
  }
}

el("flipBtn").addEventListener("click", async () => {
  state.facing = state.facing === "environment" ? "user" : "environment";
  await startCamera();
});

el("snapBtn").addEventListener("click", async () => {
  if (state.remaining <= 0) {
    el("msg").textContent = "You're out of shots!";
    return;
  }
  const vid = el("preview");
  const c = el("canvas");
  const maxW = 1600; // downscale to reduce size
  const scale = Math.min(1, maxW / vid.videoWidth || 1);
  c.width = Math.floor((vid.videoWidth || 1280) * scale);
  c.height = Math.floor((vid.videoHeight || 720) * scale);
  const ctx = c.getContext("2d");
  ctx.drawImage(vid, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL("image/jpeg", 0.85);

  // Queue item
  const item = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    eventId: state.eventId,
    shooterId: state.shooterId,
    secret: state.secret,
    imageBase64: dataUrl,
    meta: { userAgent: navigator.userAgent, ts: Date.now() },
  };
  await idb.put("queue", item);
  el("msg").textContent = "Saved to queue…";
  tryUploadQueue();
});

el("uploadQueueBtn").addEventListener("click", tryUploadQueue);

async function tryUploadQueue() {
  if (!navigator.onLine) {
    el("msg").textContent = "Offline; will upload later";
    return;
  }
  const q = await idb.all("queue");
  for (const item of q) {
    const res = await api({
      action: "upload",
      eventId: item.eventId,
      shooterId: item.shooterId,
      secret: item.secret,
      imageBase64: item.imageBase64,
      meta: item.meta,
    });
    if (res.ok) {
      await idb.del("queue", item.id);
      state.remaining = res.remaining;
      await idb.put("session", { key: "auth", ...state });
      remainingBadge();
      el("msg").textContent = `Uploaded. ${res.remaining} left.`;
    } else if (res.limitReached) {
      await idb.del("queue", item.id);
      state.remaining = 0;
      remainingBadge();
      el("msg").textContent = "Limit reached.";
    } else {
      el("msg").textContent = "Upload failed; will retry.";
      break; // stop loop; retry later
    }
  }
}

async function api(payload) {
  try {
    const r = await fetch(FRONTEND_CONFIG.BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" }, // keep simple to avoid preflight
      body: JSON.stringify(payload),
    });
    return await r.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
