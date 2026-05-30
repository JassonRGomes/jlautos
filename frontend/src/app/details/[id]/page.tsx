import { Suspense } from 'react';
import VehicleDetailsClient from '@/app/vehicle/VehicleDetailsClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VehiclePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground text-xl font-bold">Loading...</div>}>
      <VehicleDetailsClient vehicleId={id} />
    </Suspense>
  );
}
