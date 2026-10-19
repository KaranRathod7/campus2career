// Campus2Career Student Activity Pipeline Endpoint
// POST /api/student/activity or /api/student/log-activity
// Tracks live stopwatch study sessions, video masterclass watch minutes, and benchmark exams
const logActivityHandler = require('./log-activity');

module.exports = async (req, res) => {
  return logActivityHandler(req, res);
};
