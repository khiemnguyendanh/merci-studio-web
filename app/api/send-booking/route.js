export const runtime = 'nodejs';

export async function POST(request) {
    try {
        const { name, phone, service, date, notes } = await request.json();
        
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        
        if (!token || !chatId) {
            console.warn("TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID chưa được định nghĩa trong biến môi trường.");
            return Response.json({ error: "Telegram Bot chưa được cấu hình." }, { status: 500 });
        }
        
        const messageText = `🔔 *CÓ ĐƠN ĐẶT LỊCH MỚI!*\n\n👤 *Họ tên:* ${name}\n📞 *SĐT:* \`${phone}\`\n🛠 *Dịch vụ:* ${service}\n📅 *Ngày dự kiến:* ${date || 'Chưa chọn'}\n📝 *Ghi chú:* ${notes || 'Không có'}`;

        const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
        const res = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: messageText,
                parse_mode: 'Markdown'
            })
        });
        
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Telegram API error: ${errText}`);
        }
        
        return Response.json({ success: true });
    } catch (error) {
        console.error("Telegram notify error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
