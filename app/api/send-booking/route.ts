export const runtime = 'nodejs';

export async function POST() {
  return Response.json(
    { error: 'Endpoint này đã được thay thế bởi /api/bookings.' },
    { status: 410 }
  );
}
