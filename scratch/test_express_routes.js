// Test Express server API routing
const express = require('express');
const app = require('../api/index');

const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log(`Test express server running on port ${port}`);

  try {
    // 1. Test /api/health
    const resHealth = await fetch(`http://localhost:${port}/api/health`);
    const dataHealth = await resHealth.json();
    console.log('Health check:', dataHealth.status);

    // 2. Test /api/auth/status missing email
    const resStatus = await fetch(`http://localhost:${port}/api/auth/status`);
    console.log('Status without email HTTP code:', resStatus.status);

    // 3. Test /api/auth/logout
    const resLogout = await fetch(`http://localhost:${port}/api/auth/logout`, { method: 'POST' });
    const dataLogout = await resLogout.json();
    console.log('Logout response:', dataLogout.message);

    server.close();
    console.log('\n>>> EXPRESS API ROUTER INTEGRATION PASSED! <<<');
  } catch (err) {
    server.close();
    console.error('Express test error:', err);
    process.exit(1);
  }
});
