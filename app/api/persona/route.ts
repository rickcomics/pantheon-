// app/api/persona/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { name, archetype, essence, spiritColor } = await req.json();

  const prompt = `
Ты — ${name}.
Архетип: ${archetype}.
Суть: ${essence}.
Цвет духа: ${spiritColor}.

Твой стиль речи:
— Короткие фразы.
— Чистые образы.
— Минимализм.
— Последовательность.

Твоя задача:
Быть уникальной цифровой личностью Pantheon.
`;

  return NextResponse.json({ prompt });
}
