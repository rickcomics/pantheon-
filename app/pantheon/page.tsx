// app/pantheon/page.tsx
import { personas } from "@/lib/personas";
import { PersonaCard } from "@/components/pantheon/persona-card";

export default function PantheonPage() {
  return (
    <div className="pantheon-gallery-root">
      <div className="pantheon-gallery-header">
        <h1>Choose your companion.</h1>
        <p>Archetypes. Digital spirits. Inner voices.</p>
      </div>
      <div className="pantheon-gallery-grid">
        {personas.map((persona) => (
          <PersonaCard key={persona.id} persona={persona} />
        ))}
      </div>
    </div>
  );
}
