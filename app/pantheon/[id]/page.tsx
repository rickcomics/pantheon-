// app/pantheon/[id]/page.tsx
'use server';
import { personasById } from "@/lib/personas";
import { PersonaProfile } from "@/components/pantheon/persona-profile";

export default async function PersonaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persona = personasById[id];

  if (!persona) return <div>Persona not found.</div>;

  return <PersonaProfile persona={persona} />;
}



