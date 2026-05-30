'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RedirectVehiclePage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/details?id=${params.id}`);
    } else {
      router.replace('/');
    }
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="animate-pulse flex flex-col items-center">
        <div className="text-sm font-semibold tracking-widest uppercase mb-4 text-gray-400">J&L Autos</div>
        <div className="text-xl font-bold tracking-wider">Redirecting to Vehicle Details...</div>
      </div>
    </div>
  );
}
