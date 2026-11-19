'use client';

import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';

const HomeClient = lazy(() => import('./HomeClient'));

export default function ClientOnlyHome({ ssrContent }: { ssrContent: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <>{ssrContent}</>;

  return (
    <Suspense fallback={ssrContent}>
      <HomeClient />
    </Suspense>
  );
}
