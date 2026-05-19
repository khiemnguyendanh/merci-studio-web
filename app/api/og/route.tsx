import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const size = {
    width: 1200,
    height: 630
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get('title') || 'Merci Studio';
    const subtitle = searchParams.get('subtitle') || 'Merci Wedding Studio';
    const url = searchParams.get('url') || 'mercistudio.net';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 42%, #eaf2ff 100%)',
                    fontFamily: 'Arial, Helvetica, sans-serif'
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                            'radial-gradient(circle at 15% 20%, rgba(37,99,235,0.15), transparent 30%), radial-gradient(circle at 85% 85%, rgba(236,72,153,0.18), transparent 34%)'
                    }}
                />

                <div
                    style={{
                        position: 'absolute',
                        right: -90,
                        top: -80,
                        width: 390,
                        height: 390,
                        borderRadius: 999,
                        background: 'rgba(15,23,42,0.08)'
                    }}
                />

                <div
                    style={{
                        position: 'absolute',
                        left: -80,
                        bottom: -120,
                        width: 460,
                        height: 460,
                        borderRadius: 999,
                        background: 'rgba(37,99,235,0.10)'
                    }}
                />

                <div
                    style={{
                        position: 'absolute',
                        left: 74,
                        top: 72,
                        right: 74,
                        bottom: 72,
                        borderRadius: 52,
                        background: 'rgba(255,255,255,0.86)',
                        boxShadow: '0 28px 90px rgba(15,23,42,0.18)',
                        border: '1px solid rgba(255,255,255,0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        padding: '70px 82px'
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 22,
                            marginBottom: 42
                        }}
                    >
                        <div
                            style={{
                                width: 104,
                                height: 104,
                                borderRadius: 999,
                                background: '#0f172a',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 52,
                                boxShadow: '0 18px 45px rgba(15,23,42,0.28)'
                            }}
                        >
                            M
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div
                                style={{
                                    fontSize: 30,
                                    fontWeight: 800,
                                    color: '#2563eb',
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase'
                                }}
                            >
                                {subtitle}
                            </div>
                            <div
                                style={{
                                    marginTop: 8,
                                    fontSize: 26,
                                    color: '#64748b',
                                    fontWeight: 600
                                }}
                            >
                                {url}
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            fontSize: title.length > 28 ? 66 : 78,
                            fontWeight: 900,
                            lineHeight: 1.06,
                            color: '#0f172a',
                            letterSpacing: '-0.055em',
                            maxWidth: 900
                        }}
                    >
                        {title}
                    </div>

                    <div
                        style={{
                            marginTop: 42,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 18,
                            color: '#475569',
                            fontSize: 30,
                            fontWeight: 700
                        }}
                    >
                        <span>📸 Ảnh cưới</span>
                        <span>•</span>
                        <span>🎓 Kỷ yếu</span>
                        <span>•</span>
                        <span>💍 Wedding</span>
                    </div>
                </div>
            </div>
        ),
        size
    );
}
