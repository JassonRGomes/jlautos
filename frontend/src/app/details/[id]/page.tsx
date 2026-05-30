'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import VehicleDetailsClient from '@/app/vehicle/VehicleDetailsClient';

export default function VehiclePage() {
  const params = useParams();
  const id = params?.id as string;

  if (!id) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground text-xl font-bold">Loading...</div>;
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground text-xl font-bold">Loading...</div>}>
      <VehicleDetailsClient vehicleId={id} />
    </Suspense>
  );
}
