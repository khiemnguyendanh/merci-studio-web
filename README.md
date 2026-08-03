# Merci Studio

Next.js 16 website for Merci Studio with public galleries, booking, customer image selection, blog tools and an admin analytics dashboard.

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

## Firebase server access

Sensitive writes use authenticated server routes. Configure `FIREBASE_SERVICE_ACCOUNT_JSON`, or these equivalent variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

The Worker runtime calls Firestore through its REST API and verifies Firebase ID
tokens with Web Crypto. This avoids Node-only code generation in
`firebase-admin/firestore`, which Cloudflare Workers does not allow.
`firebase-admin` remains a development-only dependency for the claim-management
command below.

Grant admin access to a Firebase user:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_JSON = '{...}'
npm run admin:set-claim -- admin@example.com
```

The user must sign out and sign in again to refresh the ID token. Firestore Rules authorize administrators through the `admin=true` custom claim. `ADMIN_EMAILS` is a temporary server fallback only.

## Cloudflare Workers

This is a full-stack Next.js application, so deploy it to **Cloudflare Workers**
with OpenNext rather than using a static Cloudflare Pages export.

Test a production build in the Cloudflare runtime:

```powershell
Copy-Item .dev.vars.example .dev.vars
npm run preview
```

Keep the same public build values in `.env.local`. `.dev.vars` supplies secrets
and runtime values to the local Worker; neither file is committed.

Deploy from a Cloudflare-authenticated machine:

```bash
npm run deploy
```

For Git-based Workers Builds, use `npm run deploy` as the deploy command. Add
the `NEXT_PUBLIC_...` values as build variables because Next.js embeds them
during the build. Add `FIREBASE_SERVICE_ACCOUNT_JSON`, the Gemini and Telegram
credentials, and `ADMIN_EMAILS` as encrypted Worker secrets.

Before the first production deployment:

1. Copy every required key from `.env.example` into Cloudflare build variables
   or Worker secrets. Do not commit their values.
2. Deploy Firestore Rules with `firebase deploy --only firestore:rules`.
3. Set the admin custom claim for each staff Firebase account.
4. Run `npm run preview` and verify the API routes locally.
5. Attach `mercistudio.net` as a Workers custom domain, verify traffic, and only
   then disconnect the domain from Vercel.

Never commit `.env.local` or service-account credentials. Rotate Gemini and Telegram credentials if they have ever been exposed.

## Security Model

- Public visitors can read portfolio content and public wheel configuration.
- Booking, referral, loyalty-point and wheel-spin writes run through server routes.
- CMS, booking management, winner logs and customer lists require an admin token.
- Analytics and advertising scripts load only after consent.
- Client-selection pages remain shareable; owners control page updates and admin controls aggregate selection access.
