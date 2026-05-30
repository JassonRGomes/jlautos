'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import VehicleDetailsClient from '@/app/vehicle/VehicleDetailsClient';

function DetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  useEffect(() => {
    if (searchParams && !id) {
      router.push('/');
    }
  }, [id, router, searchParams]);

  if (!id) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground text-xl font-bold">Loading...</div>;
  }

  return <VehicleDetailsClient vehicleId={id} />;
}

export default function DetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground text-xl font-bold">Loading...</div>}>
      <DetailsContent />
    </Suspense>
  );
}
