import { redirect } from 'next/navigation';

export default async function RedirectVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/details/${id}`);
}
