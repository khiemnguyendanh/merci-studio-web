// Thêm domain web vào authorizedDomains của Firebase Auth và bật Google sign-in.
// Usage: FIREBASE_SERVICE_ACCOUNT_JSON="..." node scripts/update-firebase-config.mjs
//    hoặc: node scripts/update-firebase-config.mjs <đường dẫn file service-account.json>
import fs from 'fs';
import { google } from 'googleapis';

const serviceAccountPath = process.argv[2];
const raw = serviceAccountPath ? fs.readFileSync(serviceAccountPath, 'utf8') : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) {
  console.error('Usage: FIREBASE_SERVICE_ACCOUNT_JSON="..." node scripts/update-firebase-config.mjs  |  node scripts/update-firebase-config.mjs service-account.json');
  process.exit(1);
}
const account = JSON.parse(raw);

async function run() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: account.client_email,
        private_key: account.private_key,
        project_id: account.project_id
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    // Get config
    const res = await fetch(`https://identitytoolkit.googleapis.com/v2/projects/${account.project_id}/config`, {
      headers: {
        'Authorization': `Bearer ${token.token}`
      }
    });
    const config = await res.json();
    
    console.log("Current authorized domains:", config.authorizedDomains);
    
    // Add domains
    const domains = new Set(config.authorizedDomains || []);
    domains.add('mercistudio.net');
    domains.add('www.mercistudio.net');
    domains.add('mercistudio-cloud.khiemnguyendanh.workers.dev');
    
    // Enable Google Provider
    const signIn = config.signIn || {};
    if (!signIn.google) signIn.google = {};
    signIn.google.enabled = true;

    // We MUST NOT pass read-only fields back or Google API will throw error.
    // Actually, patching only the authorizedDomains is safer.
    
    const patchRes = await fetch(`https://identitytoolkit.googleapis.com/v2/projects/${account.project_id}/config?updateMask=authorizedDomains,signIn.google.enabled`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        authorizedDomains: Array.from(domains),
        signIn: {
          google: {
            enabled: true
          }
        }
      })
    });
    
    const patchResult = await patchRes.json();
    console.log("Update result:", patchResult);
    
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
