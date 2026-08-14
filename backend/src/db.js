// Automatically uses MongoDB (permanent, safe for production) when MONGODB_URI
// is set in the environment. Falls back to local JSON files when it isn't —
// handy for quick local testing, but NOT safe for a live deployed site since
// file storage on most hosts (like Render's free tier) is wiped on restart.
const useMongo = !!process.env.MONGODB_URI;

module.exports = useMongo
  ? require('./store.mongo')
  : require('./store.json');
