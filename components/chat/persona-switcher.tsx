// components/chat/persona-switcher.tsx
"use client";

import { personas } from "@/lib/personas";
import { usePersonaStore } from "@/lib/store";

export function PersonaSwitcher() {
  const active = usePersonaStore((s) => s.activePersona.id);
  const setActive = usePersonaStore((s) => s.setActivePersona);

  return (
    <div className="persona-switcher">
      {personas.map((p) => (
        <button
          key={p.id}
          className={`persona-switcher-item ${p.id === active ? "active" : ""}`}
          onClick={() => setActive(p.id)}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
