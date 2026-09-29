const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const UPLOADS_DIR = path.join(ROOT, "uploads");
const DB_FILE = path.join(DATA_DIR, "tributes.json");

function ensure() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, "[]", "utf8");
  }
}

function readAll() {
  ensure();
  try {
    const items = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

// All operations are synchronous, so read-modify-write can never interleave
// within the single Node process.
function writeAll(items) {
  ensure();
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), "utf8");
  fs.renameSync(tmp, DB_FILE);
}

function addTribute(tribute) {
  const items = readAll();
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    hidden: false,
    ...tribute,
  };
  items.unshift(item);
  writeAll(items);
  return item;
}

function updateTribute(id, patch) {
  const items = readAll();
  const item = items.find((t) => t.id === id);
  if (!item) return null;
  Object.assign(item, patch);
  writeAll(items);
  return item;
}

function removeTribute(id) {
  const items = readAll();
  const item = items.find((t) => t.id === id);
  if (!item) return null;
  writeAll(items.filter((t) => t.id !== id));
  return item;
}

ensure();

module.exports = { UPLOADS_DIR, readAll, addTribute, updateTribute, removeTribute };
