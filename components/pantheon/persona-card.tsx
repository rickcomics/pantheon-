// components/pantheon/persona-card.tsx
"use client";

import Link from "next/link";
import type { Persona } from "@/lib/personas";
import SpiritCore from "../three/SpiritCore";

type Props = {
  persona: Persona;
};

export function PersonaCard({ persona }: Props) {
  return (
    <Link href={`/pantheon/${persona.id}`} prefetch={false} className="persona-card">
      <div className="persona-symbol">
        <SpiritCore spiritColor={persona.spiritColor}  />
      </div>
      <div className="persona-name">{persona.name}</div>
      <div className="persona-title">{persona.title}</div>
      <div className="persona-tagline">{persona.tagline}</div>
    </Link>
  );
}

