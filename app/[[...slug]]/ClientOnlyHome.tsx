'use client';

import dynamic from 'next/dynamic';

const HomeClient = dynamic(() => import('./HomeClient'), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
      Đang tải Merci Studio...
    </main>
  )
});

export default function ClientOnlyHome() {
  return <HomeClient />;
}
