// components/pantheon/persona-profile.tsx
"use client";
import { usePersonaStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import type { Persona } from "@/lib/personas";
import SpiritCore from "../three/SpiritCore";

export function PersonaProfile({ persona }: { persona: Persona }) {
  //const setActivePersona = usePersonaStore((s) => s.setActivePersona);
  const router = useRouter();

  const activate = () => {
    //setActivePersona(persona.id);
    router.push(`/chat/${persona.id}`)

  };
  return (
    <div className="persona-profile-root">
      <div className="persona-profile-block">
        <div className="persona-profile-symbol">
          <SpiritCore spiritColor={persona.spiritColor} />
        </div>

        <h1 className="persona-profile-name">{persona.name}</h1>
        <div className="persona-profile-title">{persona.title}</div>

        <p className="persona-profile-tagline">{persona.tagline}</p>

        <div className="persona-instruction">
          <p>{persona.info_role}</p>
          <p>{persona.info_task}</p>
          <p>{persona.info_ask}</p>
        </div>

        <button className="persona-activate-btn" onClick={activate}>
          Activate {persona.name} 
        </button>
      </div>
    </div>
  );
}
