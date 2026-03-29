import { redirect } from 'next/navigation';

/** Redireciona para a nova estrutura: usuarios/[id]/editar (fluxo igual ao de motoristas). */
export default async function EquipeIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/usuarios/${id}/editar`);
}
