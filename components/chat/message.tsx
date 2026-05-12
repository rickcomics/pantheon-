// components/chat/message.tsx
export function Message({ role, text }: { role: string; text: string }) {
  return (
    <div className={`chat-msg chat-${role}`}>
      {text}
    </div>
    
  );
}
