'use client';

import { Suspense } from 'react';
import VehicleDetailsClient from '@/app/vehicle/VehicleDetailsClient';

function DetailsContent() {
  return <VehicleDetailsClient />;
}

export default function DetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground text-xl font-bold">
          Loading vehicle details...
        </div>
      }
    >
      <DetailsContent />
    </Suspense>
  );
}
