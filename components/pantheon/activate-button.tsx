// components/pantheon/activate-button.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ActivateButton({ personaId }: { personaId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    
    try {
      // 1. Отправляем "нулевой" запрос
      await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          personaId: personaId,
          messages: [{ role: "user", content: "Инициация протокола. Жду твоего слова." }],
        }),
      });

      // 2. Летим в чат конкретного духа
      // Это направит тебя в app/chat/[personaId]/page.tsx
      router.push(`/chat/${personaId}`);
    } catch (e) {
      console.error("Ошибка активации:", e);
      setLoading(false);
    }
  };

  return (
    <button onClick={handleActivate} disabled={loading}>
      {loading ? "Синхронизация..." : "Активировать Протокол"}
    </button>
  );
}
