export const runtime = 'nodejs';

// Keep the endpoint stable while serving the pre-rendered social image. Avoiding
// `next/og` removes its large WASM renderer from the Cloudflare Worker bundle.
export function GET(request: Request) {
    return Response.redirect(new URL('/og-merci-studio-v2.png', request.url), 307);
}
