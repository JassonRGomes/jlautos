import VehicleDetailsClient from './VehicleDetailsClient';

export function generateStaticParams() {
  return [{ id: 'dummy' }]; 
}

export default function Page() {
  return <VehicleDetailsClient />;
}
