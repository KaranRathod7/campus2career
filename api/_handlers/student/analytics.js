// Campus2Career Student Analytics Endpoint
// GET /api/student/analytics
// Returns aggregated activity metrics and radar competencies from database
const analyticsHandler = require('../analytics');

module.exports = async (req, res) => {
  return analyticsHandler(req, res);
};
