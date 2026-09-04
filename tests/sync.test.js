/* ============================================================
   Node smoke test for js/sync.js
   Runs the REAL sync engine in a vm sandbox against a fake
   in-memory Supabase client, covering:

     1. First login: all local data pushes, snapshot written
     2. Remote add (todo) merges into localStorage
     3. Remote soft-delete of a mood entry removes it locally
     4. Remote newer settings merge (last-write-wins)
     5. Local change -> debounced push reaches the server
     6. Logout keeps data; status goes back to signedout

   Run:  node tests/sync.test.js
   ============================================================ */
"use strict";

const vm = require("vm");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

/* ---------- in-memory "server" ---------- */
const server = {
  mood_entries: [],
  todos: [],
  birthdays: [],
  profile: null,
  streak: null
};

function upsertTable(table, rows) {
  const keyOf = (r) =>
    table === "mood_entries" ? r.date_key : r.client_id;
  rows.forEach((r) => {
    const i = server[table].findIndex((x) => keyOf(x) === keyOf(r));
    if (i === -1) server[table].push(Object.assign({}, r));
    else server[table][i] = Object.assign({}, server[table][i], r);
  });
}

/* Fake supabase-js client (just enough surface for sync.js) */
function makeFakeClient() {
  function builder(table) {
    const b = {
      _single: false,
      select() { b._op = "select"; return b; },
      eq() { return b; },
      maybeSingle() { b._single = true; return b; },
      upsert(rows) {
        if (table === "profiles") {
          server.profile = Object.assign({}, server.profile || {}, rows);
        } else if (table === "streaks") {
          server.streak = Object.assign({}, server.streak || {}, rows);
        } else {
          upsertTable(table, rows);
        }
        return Promise.resolve({ error: null });
      },
      then(res, rej) {
        let data;
        if (b._op === "select") {
          if (b._single) {
            data = (table === "profiles" ? server.profile : server.streak) || null;
          } else {
            data = server[table] || [];
          }
          return Promise.resolve({ data, error: null }).then(res, rej);
        }
        return Promise.resolve({ data: null, error: null }).then(res, rej);
      }
    };
    return b;
  }
  return { from: (t) => builder(t) };
}
const fakeClient = makeFakeClient();

/* ---------- localStorage mock ---------- */
function makeLS() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _m: m
  };
}
const ls = makeLS();

/* ---------- sandbox + load the real sync.js ---------- */
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  addEventListener: () => {},   /* window.addEventListener stub */
  localStorage: ls,
  navigator: { onLine: true },
  document: {
    addEventListener: () => {},
    getElementById: () => null,
    visibilityState: "visible"
  },
  SupaConfig: { isReady: () => true, getClient: () => fakeClient },
  Storage: { getSetting: () => undefined },
  I18N: { lang: "fa", setLang: () => {} }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(ROOT, "js", "sync.js"), "utf8"),
  sandbox,
  { filename: "js/sync.js" }
);
const Sync = sandbox.Sync;

/* ---------- tiny test helpers ---------- */
let failures = 0;
function check(name, cond) {
  if (cond) console.log("  ok  - " + name);
  else {
    failures += 1;
    console.error("  FAIL - " + name);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitSynced(timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const st = Sync.status();
    if (st.state === "synced" || st.state === "error") return st;
    await sleep(20);
  }
  return Sync.status();
}

const readLS = (k) => JSON.parse(ls.getItem(k) || "null");

/* ================= test run ================= */
(async function main() {
  console.log("Node", process.version, "- sync engine smoke test\n");

  /* ----- 0. offline-only state before login ----- */
  check("status is signedout before login", Sync.status().state === "signedout");

  ls.setItem("moodTracker.v1", JSON.stringify({
    entries: { "1403-05-12": { mood: 4, note: "hello", updatedAt: 1000 } },
    settings: { userName: "Sara", lang: "fa" }
  }));
  ls.setItem("todoTracker.v1", JSON.stringify({
    items: [{ id: "t1", text: "Buy milk", done: false, fav: true, createdAt: 1000, updatedAt: 1000 }]
  }));
  ls.setItem("birthdaysTracker.v1", JSON.stringify({
    items: [{ id: "b1", name: "Ali", dateISO: "2000-05-05", createdAt: 1000, updatedAt: 1000 }]
  }));

  Sync.init();
  const moodData = readLS("moodTracker.v1");
  check("ensureTimestamps added settingsUpdatedAt",
    typeof moodData.settingsUpdatedAt === "number");

  /* ----- 1. first login: push everything ----- */
  Sync.setAuthUser({ id: "u1", email: "a@b.c" });
  let st = await waitSynced(3000);
  check("status becomes synced", st.state === "synced");
  check("snapshot written for u1", readLS("syncSnapshot.v1").userId === "u1");
  check("mood entry pushed to server", server.mood_entries.length === 1);
  check("todo pushed to server", server.todos.length === 1);
  check("birthday pushed to server", server.birthdays.length === 1);
  check("profile pushed (display_name=Sara)",
    server.profile && server.profile.display_name === "Sara");
  check("streak row pushed", !!server.streak);
  check("no pending changes left", Sync.status().state === "synced");

  /* ----- 2/3/4. remote changes from "another device" -----
     Timestamps must be NEWER than the local ones (epoch ms),
     exactly like a real second device would produce. */
  const T = Date.now();
  server.todos.push({
    user_id: "u1", client_id: "t2", text: "From phone",
    done: false, fav: false, deleted: false, client_updated_at: T + 1000
  });
  server.mood_entries.push({
    user_id: "u1", date_key: "1403-05-12", mood: 4,
    note: "", deleted: true, client_updated_at: T + 2000
  });
  server.profile = Object.assign({}, server.profile, {
    settings: { userName: "Sara", lang: "fa", theme: "dark" },
    client_updated_at: T + 3000
  });

  Sync.syncNow();
  st = await waitSynced(3000);
  check("second sync ok", st.state === "synced");
  const todoAfter = readLS("todoTracker.v1");
  check("remote todo merged in locally",
    todoAfter.items.some((t) => t.id === "t2" && t.text === "From phone"));
  check("remote-deleted mood entry removed locally",
    !readLS("moodTracker.v1").entries["1403-05-12"]);
  check("remote settings merged (theme=dark)",
    readLS("moodTracker.v1").settings.theme === "dark");

  /* ----- 5. local change -> debounced push -----
     updatedAt must be newer than the remote changes above. */
  const md = readLS("moodTracker.v1");
  md.entries["1403-06-01"] = { mood: 2, note: "offline note", updatedAt: T + 5000 };
  ls.setItem("moodTracker.v1", JSON.stringify(md));
  Sync.onLocalChange("mood");

  const stPending = Sync.status();
  check("status shows pending after local change", stPending.state === "pending");
  check("pending count is 1", stPending.pending === 1);

  await sleep(2300); // > PUSH_DEBOUNCE_MS (2000)
  check("debounced push delivered entry to server",
    server.mood_entries.some((r) => r.date_key === "1403-06-01" && !r.deleted));
  check("pending cleared after debounce push", Sync.status().state === "synced");

  /* ----- 6. logout keeps data, status signedout ----- */
  Sync.setAuthUser(null);
  check("logout: status signedout", Sync.status().state === "signedout");
  check("logout: local data kept",
    Object.keys(readLS("moodTracker.v1").entries).length === 1);

  console.log(failures === 0
    ? "\nALL TESTS PASSED"
    : "\n" + failures + " TEST(S) FAILED");
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error("Test crashed:", e);
  process.exit(1);
});


