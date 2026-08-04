'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const HomeClient = dynamic(() => import('./HomeClient'), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-slate-50 px-6 py-20 text-slate-900">
      <section className="mx-auto max-w-4xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">Photo · Makeup · Bridal</p>
        <h1 className="mt-5 font-serif text-4xl font-semibold md:text-6xl">Chụp ảnh cưới đẹp & váy cưới Douyin</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600">
          Merci Studio cung cấp dịch vụ chụp ảnh cưới, phóng sự đám cưới, makeup cô dâu và váy cưới
          Douyin tại Hà Nội, Bắc Ninh. Khám phá album ảnh cưới đẹp, kinh nghiệm chọn váy cưới xinh và
          đặt lịch tư vấn concept phù hợp với câu chuyện của bạn.
        </p>
        <nav className="mt-8 flex flex-wrap justify-center gap-4 text-sm font-semibold">
          <Link href="/bo-su-tap">Bộ sưu tập ảnh cưới</Link>
          <Link href="/video">Phim phóng sự cưới</Link>
          <Link href="/blog">Kinh nghiệm cưới</Link>
          <Link href="/feedback">Feedback khách hàng</Link>
          <Link href="/dat-lich">Đặt lịch tư vấn</Link>
        </nav>
      </section>
    </main>
  )
});

export default function ClientOnlyHome() {
  return <HomeClient />;
}
