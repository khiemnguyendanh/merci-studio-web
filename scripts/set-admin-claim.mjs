import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const email = process.argv[2];
if (!raw || !email) {
  console.error('Usage: FIREBASE_SERVICE_ACCOUNT_JSON="..." node scripts/set-admin-claim.mjs admin@example.com');
  process.exit(1);
}

const account = JSON.parse(raw);
const app = getApps()[0] || initializeApp({
  credential: cert({
    projectId: account.project_id,
    clientEmail: account.client_email,
    privateKey: account.private_key.replace(/\\n/g, '\n')
  })
});
const auth = getAuth(app);
const user = await auth.getUserByEmail(email.toLowerCase());
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
console.log(`Admin claim set for ${user.email}. Ask the user to sign out and sign in again.`);
