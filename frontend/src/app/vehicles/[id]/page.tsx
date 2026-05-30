import { redirect } from 'next/navigation';

export default async function RedirectVehiclesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/details/${id}`);
}
