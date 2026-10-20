// Campus2Career Student Activity Pipeline Endpoint
// POST /api/student/activity
// Persists student activity directly to Supabase/PostgreSQL
const activityHandler = require('../activity');

module.exports = async (req, res) => {
  return activityHandler(req, res);
};
