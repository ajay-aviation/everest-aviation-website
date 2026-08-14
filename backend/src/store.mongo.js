const mongoose = require('mongoose');

let connectPromise = null;

function ensureConnection() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connectPromise) {
    connectPromise = mongoose.connect(process.env.MONGODB_URI);
  }
  return connectPromise;
}

// One flexible schema reused for both "enquiries" and "payments" collections —
// each collection just stores whatever fields the route passes in.
const flexibleSchema = new mongoose.Schema({}, { strict: false, timestamps: false });

function getModel(collectionName) {
  if (mongoose.models[collectionName]) return mongoose.models[collectionName];
  return mongoose.model(collectionName, flexibleSchema, collectionName);
}

async function readAll(collectionName) {
  await ensureConnection();
  const Model = getModel(collectionName);
  const docs = await Model.find({}).lean();
  return docs.map(d => ({ ...d, id: d.id || String(d._id), _id: undefined }));
}

async function insert(collectionName, record) {
  await ensureConnection();
  const Model = getModel(collectionName);
  const withId = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), ...record };
  await Model.create(withId);
  return withId;
}

module.exports = { readAll, insert };
