'use client';

import { Suspense, use } from 'react';
import VehicleDetailsClient from '@/app/vehicle/VehicleDetailsClient';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default function VehiclePage({ params }: PageProps) {
  const resolvedParams = params && typeof (params as any).then === 'function' 
    ? use(params as Promise<{ id: string }>) 
    : (params as { id: string });

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground text-xl font-bold">Loading...</div>}>
      <VehicleDetailsClient vehicleId={resolvedParams?.id} />
    </Suspense>
  );
}
