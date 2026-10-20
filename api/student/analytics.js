// Vercel Serverless Function file route for GET /api/student/analytics
const analyticsHandler = require('../_handlers/analytics');

module.exports = async (req, res) => {
  return analyticsHandler(req, res);
};
