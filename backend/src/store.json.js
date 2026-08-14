const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readAllSync(name) {
  const file = filePath(name);
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAllSync(name, records) {
  fs.writeFileSync(filePath(name), JSON.stringify(records, null, 2), 'utf-8');
}

async function readAll(name) {
  return readAllSync(name);
}

async function insert(name, record) {
  const records = readAllSync(name);
  const withId = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), ...record };
  records.push(withId);
  writeAllSync(name, records);
  return withId;
}

module.exports = { readAll, insert };
