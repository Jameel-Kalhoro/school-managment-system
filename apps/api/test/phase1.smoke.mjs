const BASE = 'http://localhost:4000/api';
let pass = 0, fail = 0;

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

function check(label, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}  ${extra}`); }
}

const login = (email, password) => req('POST', '/auth/login', { body: { email, password } });

console.log('\n1. Super admin login');
const sa = await login('superadmin@sms.local', 'ChangeMe123!');
check('super admin logs in', sa.status === 200, JSON.stringify(sa.json));
const SA = sa.json.accessToken;

console.log('\n2. Create + list plans');
const plan = await req('POST', '/platform/plans', { token: SA, body: { name: 'Pro Monthly', pricePkr: 12000, maxStudents: 800, maxTeachers: 60 } });
check('plan created', plan.status === 201, JSON.stringify(plan.json));
const planId = plan.json.id;
const plans = await req('GET', '/platform/plans', { token: SA });
check('plans list paginated', Array.isArray(plans.json.data) && typeof plans.json.total === 'number');

console.log('\n3. Onboard Alpha school');
const onboard = await req('POST', '/platform/schools', { token: SA, body: {
  school: { name: 'Alpha School', slug: 'alpha', city: 'Lahore' },
  admin: { name: 'Alpha Admin', email: 'admin@alpha.sms.local' },
  planId,
} });
check('school onboarded (201)', onboard.status === 201, JSON.stringify(onboard.json));
const tempPassword = onboard.json.tempPassword;
check('temp password returned', typeof tempPassword === 'string' && tempPassword.length >= 8);
const alphaSchoolId = onboard.json.school.id;

console.log('\n4. Alpha admin logs in with temp password');
const a1 = await login('admin@alpha.sms.local', tempPassword);
check('temp-password login works', a1.status === 200, JSON.stringify(a1.json));
check('mustChangePassword flag is true', a1.json.user?.mustChangePassword === true);
let ALPHA = a1.json.accessToken;

console.log('\n5. Change password');
const chg = await req('PATCH', '/auth/password', { token: ALPHA, body: { currentPassword: tempPassword, newPassword: 'AlphaNew123!' } });
check('password change 204', chg.status === 204, JSON.stringify(chg.json));
const oldLogin = await login('admin@alpha.sms.local', tempPassword);
check('old temp password now rejected (401)', oldLogin.status === 401);
const newLogin = await login('admin@alpha.sms.local', 'AlphaNew123!');
check('new password works', newLogin.status === 200);
check('mustChangePassword now false', newLogin.json.user?.mustChangePassword === false);
ALPHA = newLogin.json.accessToken;

console.log('\n6. Alpha admin creates users');
const teacher = await req('POST', '/users', { token: ALPHA, body: { name: 'Ali Teacher', email: 't1@alpha.sms.local', role: 'TEACHER' } });
check('teacher created', teacher.status === 201, JSON.stringify(teacher.json));
check('teacher got temp password', typeof teacher.json.tempPassword === 'string');
const student = await req('POST', '/users', { token: ALPHA, body: { name: 'Sara Student', email: 's1@alpha.sms.local', role: 'STUDENT' } });
check('student created', student.status === 201);
const badRole = await req('POST', '/users', { token: ALPHA, body: { name: 'Hacker', email: 'h@alpha.sms.local', role: 'SUPER_ADMIN' } });
check('creating SUPER_ADMIN blocked (400/403)', badRole.status === 400 || badRole.status === 403, `got ${badRole.status}`);

console.log('\n7. List + deactivate users (scoped)');
const list = await req('GET', '/users', { token: ALPHA });
const emails = list.json.data.map((u) => u.email).sort();
check('alpha sees exactly its 3 users', list.json.total === 3, JSON.stringify(emails));
const deact = await req('PATCH', `/users/${student.json.user.id}/status`, { token: ALPHA, body: { status: 'INACTIVE' } });
check('deactivate user works', deact.status === 200 && deact.json.status === 'INACTIVE');

console.log('\n8. Academic years');
const ay1 = await req('POST', '/school/academic-years', { token: ALPHA, body: { name: '2024-2025', startDate: '2024-08-01', endDate: '2025-06-30' } });
const ay2 = await req('POST', '/school/academic-years', { token: ALPHA, body: { name: '2025-2026', startDate: '2025-08-01', endDate: '2026-06-30', isCurrent: true } });
check('two academic years created', ay1.status === 201 && ay2.status === 201);
await req('PATCH', `/school/academic-years/${ay1.json.id}/set-current`, { token: ALPHA });
const ayList = await req('GET', '/school/academic-years', { token: ALPHA });
const currents = ayList.json.filter((y) => y.isCurrent);
check('exactly one academic year is current', currents.length === 1 && currents[0].id === ay1.json.id, JSON.stringify(currents.map(c=>c.name)));

console.log('\n9. School settings');
await req('PATCH', '/school', { token: ALPHA, body: { city: 'Karachi', phone: '+92-300-1234567' } });
const school = await req('GET', '/school', { token: ALPHA });
check('school settings updated', school.json.city === 'Karachi' && school.json.phone === '+92-300-1234567');

console.log('\n10. Tenant isolation + role guards');
const onboardB = await req('POST', '/platform/schools', { token: SA, body: {
  school: { name: 'Beta School', slug: 'beta', city: 'Multan' },
  admin: { name: 'Beta Admin', email: 'admin@beta.sms.local' },
  planId,
} });
check('beta onboarded', onboardB.status === 201);
const betaLogin = await login('admin@beta.sms.local', onboardB.json.tempPassword);
const BETA = betaLogin.json.accessToken;
const betaUsers = await req('GET', '/users', { token: BETA });
const betaEmails = betaUsers.json.data.map((u) => u.email);
check('beta admin sees only beta users', betaUsers.json.total === 1 && betaEmails[0] === 'admin@beta.sms.local', JSON.stringify(betaEmails));
const alphaAY = await req('GET', '/school/academic-years', { token: BETA });
check('beta admin sees no alpha academic years', Array.isArray(alphaAY.json) && alphaAY.json.length === 0);
const alphaToPlatform = await req('GET', '/platform/schools', { token: ALPHA });
check('alpha admin blocked from /platform (403)', alphaToPlatform.status === 403, `got ${alphaToPlatform.status}`);
const saUnauth = await req('GET', '/platform/schools');
check('no token on /platform (401)', saUnauth.status === 401);

console.log(`\n──────────────\nRESULT: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
