# Merci Studio

Next.js 16 website for Merci Studio with public galleries, booking, customer image selection, blog tools and an admin promotion dashboard.

## Development

Copy `.env.example` to `.env.local`, fill the public Firebase values and server integrations, then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm test
npm run build
```

## Firebase Admin

Sensitive writes use authenticated server routes. Configure `FIREBASE_SERVICE_ACCOUNT_JSON`, or these equivalent variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Grant admin access to a Firebase user:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_JSON = '{...}'
npm run admin:set-claim -- admin@example.com
```

The user must sign out and sign in again to refresh the ID token. Firestore Rules authorize administrators through the `admin=true` custom claim. `ADMIN_EMAILS` is a temporary server fallback only.

## Deploy

1. Add all production variables from `.env.example` to Vercel.
2. Deploy Firestore Rules with `firebase deploy --only firestore:rules`.
3. Set the admin custom claim for each staff Firebase account.
4. Run `npm run build` before deploying.

Never commit `.env.local` or service-account credentials. Rotate Gemini and Telegram credentials if they have ever been exposed.

## Security Model

- Public visitors can read portfolio content and public wheel configuration.
- Booking, referral, loyalty-point and wheel-spin writes run through server routes.
- CMS, booking management, winner logs and customer lists require an admin token.
- Analytics and advertising scripts load only after consent.
- Client-selection pages remain shareable; owners control page updates and admin controls aggregate selection access.
