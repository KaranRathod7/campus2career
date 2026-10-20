// Vercel Serverless Function file route
const submitHandler = require('../_handlers/tests/submit');

module.exports = async (req, res) => {
  return submitHandler(req, res);
};
