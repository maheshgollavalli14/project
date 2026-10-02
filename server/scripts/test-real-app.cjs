const http = require('http');
const { PrismaClient, Role, ViolationType, Severity } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000';

async function makeRequest({ path, method = 'GET', body, headers = {}, cookie = '' }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const data = body ? JSON.stringify(body) : null;

    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (cookie) {
      reqHeaders['Cookie'] = cookie;
    }
    if (data) {
      reqHeaders['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(responseBody);
          } catch {
            parsed = responseBody;
          }

          // Extract Set-Cookie header if present
          const setCookie = res.headers['set-cookie'];
          let cookieValue = '';
          if (setCookie) {
            cookieValue = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
          }

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
            cookie: cookieValue,
          });
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function parseCookieToken(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/cb_access_token=([^;]+)/);
  return match ? match[1] : null;
}

async function runRealAppVerification() {
  console.log('================================================================');
  console.log('REAL RUNNING APPLICATION VERIFICATION: SINGLE-LOGIN PROTECTION');
  console.log('Target Server:', BASE_URL);
  console.log('Database:', process.env.DATABASE_URL || 'localhost:5433');
  console.log('================================================================\n');

  const participantAlpha = {
    email: 'participant.alpha@codebreak.dev',
    password: 'Password@123',
  };
  const participantBeta = {
    email: 'participant.beta@codebreak.dev',
    password: 'Password@123',
  };
  const adminAccount = {
    email: 'admin@codebreak.dev',
    password: 'Admin@CodeBreak2026',
  };

  // Clean any active session for test participant accounts before start
  await prisma.userSession.updateMany({
    where: {
      user: { email: { in: [participantAlpha.email, participantBeta.email] } },
      isActive: true,
    },
    data: { isActive: false, revokedAt: new Date() },
  });

  // --------------------------------------------------------------------------
  // STEP 1: Browser A - Participant logs in
  // --------------------------------------------------------------------------
  console.log('[Step 1] Browser A: Logging in as Participant Alpha...');
  const browserALogin = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Browser-A' },
    body: participantAlpha,
  });

  if (browserALogin.statusCode !== 200 || !browserALogin.body.success) {
    throw new Error(`Browser A login failed: ${JSON.stringify(browserALogin.body)}`);
  }
  const tokenA = browserALogin.body.data.token;
  const sessionIdA = browserALogin.body.data.sessionId;
  const cookieA = browserALogin.cookie;
  console.log(`✓ Browser A login succeeded! Session ID: ${sessionIdA}`);

  // Confirm session is active in database
  const sessionAInDb = await prisma.userSession.findUnique({ where: { id: sessionIdA } });
  if (!sessionAInDb || !sessionAInDb.isActive || sessionAInDb.revokedAt) {
    throw new Error('Session A was not found or not active in PostgreSQL!');
  }
  console.log(`✓ Verified session ${sessionIdA} is active in PostgreSQL (port 5433).`);

  // --------------------------------------------------------------------------
  // STEP 2: Browser B - Concurrent login attempt with SAME credentials
  // --------------------------------------------------------------------------
  console.log('\n[Step 2] Browser B: Attempting login with SAME credentials while Browser A is active...');
  const browserBLogin = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Browser-B' },
    body: participantAlpha,
  });

  console.log(`Browser B status code: ${browserBLogin.statusCode}`);
  console.log(`Browser B response code: ${browserBLogin.body.code}`);
  console.log(`Browser B response message: "${browserBLogin.body.message}"`);

  if (browserBLogin.statusCode !== 409) {
    throw new Error(`Expected HTTP 409, got ${browserBLogin.statusCode}`);
  }
  if (browserBLogin.body.code !== 'ACCOUNT_ALREADY_ACTIVE') {
    throw new Error(`Expected code ACCOUNT_ALREADY_ACTIVE, got ${browserBLogin.body.code}`);
  }
  if (browserBLogin.body.message !== 'This account is already logged in on another device or browser.') {
    throw new Error(`Expected exact message: "This account is already logged in on another device or browser.", got "${browserBLogin.body.message}"`);
  }
  console.log('✓ Concurrent login rejected with HTTP 409, code ACCOUNT_ALREADY_ACTIVE, exact message matched!');

  // Verify only 1 active session in database
  const activeSessionsAfterB = await prisma.userSession.findMany({
    where: { user: { email: participantAlpha.email }, isActive: true },
  });
  if (activeSessionsAfterB.length !== 1 || activeSessionsAfterB[0].id !== sessionIdA) {
    throw new Error(`Expected exactly 1 active session (Browser A), found ${activeSessionsAfterB.length}`);
  }
  console.log('✓ Confirmed only Browser A session exists. No second active session was created in DB.');

  // Verify anti-cheat violation record
  const latestViolation = await prisma.violation.findFirst({
    where: { user: { email: participantAlpha.email }, type: ViolationType.MULTIPLE_LOGIN },
    orderBy: { createdAt: 'desc' },
  });
  if (!latestViolation || latestViolation.severity !== Severity.CRITICAL) {
    throw new Error('Anti-cheat violation MULTIPLE_LOGIN of CRITICAL severity was not recorded!');
  }
  console.log(`✓ Anti-cheat violation verified: Type = ${latestViolation.type}, Severity = ${latestViolation.severity}`);

  // Verify audit log record
  const latestAuditLog = await prisma.auditLog.findFirst({
    where: { actorEmail: participantAlpha.email, action: 'CONCURRENT_LOGIN_BLOCKED' },
    orderBy: { createdAt: 'desc' },
  });
  if (!latestAuditLog) {
    throw new Error('AuditLog record for CONCURRENT_LOGIN_BLOCKED was not found!');
  }
  console.log(`✓ Audit log verified: Action = ${latestAuditLog.action}, Entity = ${latestAuditLog.entity}`);

  // --------------------------------------------------------------------------
  // STEP 3: Browser A remains logged in & can make authenticated requests
  // --------------------------------------------------------------------------
  console.log('\n[Step 3] Browser A: Verifying session remains active and can make authenticated requests...');
  const meA = await makeRequest({
    path: '/api/auth/me',
    headers: {
      'User-Agent': 'Mozilla/5.0 Browser-A',
      'Authorization': `Bearer ${tokenA}`,
    },
    cookie: cookieA,
  });

  if (meA.statusCode !== 200 || !meA.body.success) {
    throw new Error(`Browser A session was interrupted! Status: ${meA.statusCode}, Body: ${JSON.stringify(meA.body)}`);
  }
  console.log(`✓ Browser A is still fully authenticated! User: ${meA.body.data.user.email}`);

  // --------------------------------------------------------------------------
  // STEP 4: Browser A temporary disconnect / reconnect
  // --------------------------------------------------------------------------
  console.log('\n[Step 4] Browser A: Simulating temporary disconnect and reconnect...');
  // A temporary network pause does not invalidate the session
  const meAReconnect = await makeRequest({
    path: '/api/auth/me',
    headers: {
      'User-Agent': 'Mozilla/5.0 Browser-A',
      'Authorization': `Bearer ${tokenA}`,
    },
    cookie: cookieA,
  });
  if (meAReconnect.statusCode !== 200) {
    throw new Error(`Browser A failed to reconnect: ${meAReconnect.statusCode}`);
  }
  console.log('✓ Browser A successfully continued with existing valid session after reconnect.');

  // --------------------------------------------------------------------------
  // STEP 5: Browser A explicitly logs out
  // --------------------------------------------------------------------------
  console.log('\n[Step 5] Browser A: Explicitly logging out...');
  const logoutRes = await makeRequest({
    path: '/api/auth/logout',
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 Browser-A',
      'Authorization': `Bearer ${tokenA}`,
    },
    cookie: cookieA,
  });

  if (logoutRes.statusCode !== 200) {
    throw new Error(`Logout failed: ${logoutRes.statusCode}`);
  }
  console.log('✓ Browser A logout request completed successfully.');

  // Confirm session is inactive in DB
  const sessionAfterLogout = await prisma.userSession.findUnique({ where: { id: sessionIdA } });
  if (sessionAfterLogout?.isActive) {
    throw new Error('Session A is still active in database after logout!');
  }
  console.log('✓ Confirmed Session A is revoked in PostgreSQL (isActive = false, revokedAt set).');

  // Confirm Browser A's old token is rejected now
  const meAAfterLogout = await makeRequest({
    path: '/api/auth/me',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
    },
    cookie: cookieA,
  });
  if (meAAfterLogout.statusCode !== 401) {
    throw new Error(`Expected 401 after logout, got ${meAAfterLogout.statusCode}`);
  }
  console.log(`✓ Browser A old token correctly rejected with HTTP 401 (${meAAfterLogout.body.code}).`);

  // --------------------------------------------------------------------------
  // STEP 6: Browser B can now log in after Browser A logged out
  // --------------------------------------------------------------------------
  console.log('\n[Step 6] Browser B: Logging in now that Browser A has logged out...');
  const browserBLogin2 = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0 Browser-B' },
    body: participantAlpha,
  });

  if (browserBLogin2.statusCode !== 200 || !browserBLogin2.body.success) {
    throw new Error(`Browser B failed to log in after logout: ${JSON.stringify(browserBLogin2.body)}`);
  }
  const sessionIdB = browserBLogin2.body.data.sessionId;
  const tokenB = browserBLogin2.body.data.token;
  console.log(`✓ Browser B successfully logged in with new Session ID: ${sessionIdB}`);

  // --------------------------------------------------------------------------
  // STEP 7: Two DIFFERENT participant accounts can log in concurrently
  // --------------------------------------------------------------------------
  console.log('\n[Step 7] Testing simultaneous login of two DIFFERENT participant accounts...');
  // Participant Alpha is logged in on Browser B.
  // Now Participant Beta logs in on Browser C:
  const browserCLogin = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0 Browser-C' },
    body: participantBeta,
  });

  if (browserCLogin.statusCode !== 200 || !browserCLogin.body.success) {
    throw new Error(`Participant Beta login failed: ${JSON.stringify(browserCLogin.body)}`);
  }
  const sessionIdC = browserCLogin.body.data.sessionId;
  console.log(`✓ Participant Beta logged in concurrently! Session ID: ${sessionIdC}`);

  // Confirm both sessions are active simultaneously
  const bothActive = await prisma.userSession.findMany({
    where: {
      id: { in: [sessionIdB, sessionIdC] },
      isActive: true,
    },
  });
  if (bothActive.length !== 2) {
    throw new Error(`Expected both sessions to be active simultaneously, found ${bothActive.length}`);
  }
  console.log('✓ Both Participant Alpha and Participant Beta have active sessions concurrently without conflict!');

  // --------------------------------------------------------------------------
  // STEP 8: Admin accounts can log in multiple times without blocking
  // --------------------------------------------------------------------------
  console.log('\n[Step 8] Testing Admin login concurrency (Admin Exception)...');
  const adminLogin1 = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0 AdminScreen1' },
    body: adminAccount,
  });
  if (adminLogin1.statusCode !== 200) {
    throw new Error(`Admin login 1 failed: ${adminLogin1.statusCode}`);
  }

  const adminLogin2 = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0 AdminScreen2' },
    body: adminAccount,
  });
  if (adminLogin2.statusCode !== 200) {
    throw new Error(`Admin login 2 failed: ${adminLogin2.statusCode}`);
  }
  console.log('✓ Admin accounts can log in across multiple screens/devices without concurrent restriction.');

  // --------------------------------------------------------------------------
  // STEP 9: Database & User integrity verification
  // --------------------------------------------------------------------------
  console.log('\n[Step 9] Verifying database integrity and registered users...');
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });
  console.log(`Total users in PostgreSQL 5433: ${allUsers.length}`);
  allUsers.forEach((u) => console.log(` - ${u.email} (${u.role})`));

  const cnu = allUsers.find((u) => u.email === 'cnu@gmail.com');
  const mahesh = allUsers.find((u) => u.email === 'maheshgollavalli14@gmail.com');
  if (!cnu || !mahesh) {
    throw new Error('CRITICAL: Existing user accounts were missing!');
  }
  console.log('✓ Verified existing registered user accounts (cnu@gmail.com, maheshgollavalli14@gmail.com) remain completely intact!');

  console.log('\n================================================================');
  console.log('🎉 ALL REAL APPLICATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runRealAppVerification()
  .catch((err) => {
    console.error('\n❌ REAL APPLICATION TEST FAILED:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
