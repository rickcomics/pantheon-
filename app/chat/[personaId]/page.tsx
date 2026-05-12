// app/chat/[personaId]/page.tsx
"use client";
import { use } from "react";
import { useEffect } from "react";
import { usePersonaStore } from "@/lib/store";
import { ChatWindow } from "@/components/chat/chat-window";
import SpiritCore from "@/components/three/SpiritCore";

export default function ChatPage({ params }: { params: Promise<{ personaId: string }> }) {
  const { personaId } = use(params); // ← вот ключ
  const setActivePersona = usePersonaStore(s => s.setActivePersona);
  const persona = usePersonaStore(s => s.activePersona);

  useEffect(() => {
    setActivePersona(personaId);
  }, [personaId]);

  return (
    <div className="chat-root">
      <div className="chat-header">
        <div className="chat-symbol">
          <SpiritCore spiritColor={persona.spiritColor} />
        </div>
        <div className="chat-meta">
          <div className="chat-name">{persona.name}</div>
          <div className="chat-title">{persona.title}</div>
        </div>
      </div>

      <ChatWindow />
    </div>
  );
}
