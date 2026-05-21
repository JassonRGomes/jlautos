import { Suspense } from 'react';
import VehicleDetailsClient from './VehicleDetailsClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground text-xl font-bold">Loading...</div>}>
      <VehicleDetailsClient />
    </Suspense>
  );
}
