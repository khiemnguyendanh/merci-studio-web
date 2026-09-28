export const runtime = 'nodejs';

// Keep the endpoint stable while serving the pre-rendered social image. Avoiding
// `next/og` removes its large WASM renderer from the Cloudflare Worker bundle.
// Dùng origin cố định (không dùng request.url) để tránh open-redirect theo Host header.
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mercistudio.net';

export function GET() {
    return Response.redirect(new URL('/og-merci-studio-v2.png', SITE_ORIGIN), 307);
}
