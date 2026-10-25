"use client";
import { useState, useRef, useEffect } from "react";
import { usePersonaStore } from "@/lib/store";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function ChatWindow() {
  const persona = usePersonaStore((s) => s.activePersona);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const playCrystal = () => {
    const audio = new Audio("/sounds/crystal.mp3");
    audio.volume = 0.4;
    audio.play().catch(() => {}); // Игнорим ошибки автоплея
  };

  // Функция ручной кристаллизации (исправленная)
  const crystalize = async (index: number) => {
    const assistantMsg = messages[index];
    const userMsg = messages[index - 1]; 

    if (!assistantMsg || !userMsg || assistantMsg.role !== "assistant") return;

    // ВАЖНО: Добавляем onlySave: true, чтобы сервер не вызывал Gemma заново
    await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        personaId: persona.id,
        messages: [userMsg, assistantMsg],
        isManualGold: true,
        onlySave: true, // Сигнал серверу: "просто сохрани"
      }),
    });
    
    playCrystal();
    // Можно добавить визуальный фидбек на кнопку, но пока оставим алерт
    alert(`Знание ${persona.name} запечатлено в камне 💎`);
  };

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    const currentHistory = [...messages, userMessage];

    setMessages(currentHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          personaId: persona.id,
          messages: currentHistory.slice(-10), // Шлем только хвост для экономии контекста
        }),
      });

      const data = await res.json().catch(() => ({ error: `Сервер ответил ${res.status}` }));
      const reply: ChatMessage = {
        role: "assistant",
        content: data.reply ?? `⚠️ ${data.error || "Дух молчит. Попробуй ещё раз."}`,
      };
      setMessages((m) => [...m, reply]);
    } catch (e) {
      console.error("Silence in the Pantheon...", e);
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Нет связи с сервером. Попробуй ещё раз." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-${m.role}`}>
            <div className="msg-content">{m.content}</div>
            {m.role === "assistant" && (
              <button className="crystal-btn" onClick={() => crystalize(i)}>
                💎
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={loading ? "Слышу шепот..." : `Говори, ${persona.name} слушает.`}
        />
        <button className="chat-send" onClick={send} disabled={loading}>
          {loading ? "..." : "Отправить"}
        </button>
      </div>
    </div>
  );
}

