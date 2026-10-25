// app/api/chat/route.ts — ФИНАЛЬНАЯ ИНТЕЛЛЕКТУАЛЬНАЯ ПОСТРОЙКА
import { NextResponse } from "next/server";
import { personasById } from "@/lib/personas";
import personaControls from "@/layer/persona_controls.json";
import fs from "fs";
import path from "path";
import { Index } from "flexsearch";
import { pipeline } from "@xenova/transformers";

// --- 1. ЯДРО СЕМАНТИКИ (Transformers.js) ---
let embedder: any = null;
async function getEmbedder() {
  if (!embedder) {
    // Модель all-MiniLM-L6-v2: идеальный баланс веса (45мб) и ума
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0, mA = 0, mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i]; mB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

// --- 2. ЛИНГВИСТИКА (Стемминг и Теги) ---
function stem(word: string): string {
  return word.toLowerCase().replace(/s$/, "").replace(/(иями|иям|иях|ия|ию|ие|ий|ии|ых|ыми|ов|ам|ами|ах|ен|ий|и|ь|ю|я)$/g, "");
}

function extractTags(text: string): string[] {
  const words = text.toLowerCase().match(/[а-яёa-z]{3,}/g) || [];
  const stopWords = new Set(["меня", "тебе", "этот", "когда", "если", "хотя", "было", "есть", "быть", "того", "выдохнуть"]);
  return Array.from(new Set(words.filter(w => !stopWords.has(w)).map(w => stem(w))));
}

function simpleSearchScore(text: string, queryTags: string[]): number {
  const textStems = extractTags(text);
  let score = 0;
  for (const q of queryTags) { if (textStems.includes(q)) score += q.length > 5 ? 2 : 1; }
  return score;
}

// --- 3. ГИБРИДНЫЙ GRAPH RAG ДВИЖОК ---
async function getContextFromFiles(personaId: string, userMessage: string, maxEntries = 4): Promise<string> {
  const chatDir = path.resolve("./chats");
  const goldPath = path.join(chatDir, `${personaId}_gold.json`);
  const historyPath = path.join(chatDir, `${personaId}.json`);
  const queryTags = extractTags(userMessage);

  if (queryTags.length === 0) return "";

  const searchIndex = new Index({ preset: "memory", tokenize: "forward" });
  let allKnowledge: any[] = [];

  // Индексируем всё золото и историю
  [goldPath, historyPath].forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      const isGold = filePath.includes("gold");
      const data = safeReadJSON(filePath);
      data.forEach((entry: any) => {
        const id = allKnowledge.length;
        searchIndex.add(id, `${entry.user} ${entry.assistant} ${entry.tags?.join(" ")}`.toLowerCase());
        allKnowledge.push({ ...entry, weight: isGold ? 2.5 : 1, id });
      });
    }
  });

  if (allKnowledge.length === 0) return "";

  // А. Поиск по индексу (FlexSearch)
  const results = searchIndex.search(queryTags.join(" "), { limit: 15 });
  let scored = results.map(id => {
    const item = allKnowledge[id as number];
    return { ...item, finalScore: simpleSearchScore(item.user, queryTags) * item.weight };
  }).filter(e => e.finalScore > 0);

  // Б. Семантический добор (Transformers.js)
  if (scored.length < 2) {
    try {
      const generateEmbedding = await getEmbedder();
      const userVector = await generateEmbedding(userMessage, { pooling: 'mean', normalize: true });
      const userVecArray = Array.from(userVector.data as number[]);
      const candidates = allKnowledge.slice(-40); 
      for (const item of candidates) {
        if (scored.some(s => s.user === item.user)) continue;
        const itemVector = await generateEmbedding(item.user, { pooling: 'mean', normalize: true });
        const similarity = cosineSimilarity(userVecArray, Array.from(itemVector.data as number[]));
        if (similarity > 0.68) scored.push({ ...item, finalScore: similarity * item.weight * 4 });
      }
    } catch (e) { console.error("Semantics fail:", e); }
  }

  // В. GRAPH RAG LITE (Ассоциации)
  // Извлекаем все теги из того, что уже нашли
  const foundTags = new Set(scored.flatMap(s => s.tags || []));
  const associations = allKnowledge
    .filter(item => !scored.some(s => s.id === item.id) && item.tags?.some((t: string) => foundTags.has(t)))
    .sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0))
    .slice(0, 2); // Берем 2 мощных ассоциации по связям

  const finalContext = [...scored.sort((a, b) => b.finalScore - a.finalScore).slice(0, maxEntries), ...associations];

  return finalContext
    .map(e => {
      const type = associations.includes(e) ? "СВЯЗЬ" : (e.weight > 2 ? "ЗОЛОТО" : "ОПЫТ");
      return `[${type}] USER: ${e.user}\nASSISTANT: ${e.assistant}`;
    })
    .join("\n---\n");
}

// --- 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function safeReadJSON(filePath: string): any[] {
  try { return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : []; }
  catch (e) { return []; }
}

// Бесплатная модель OpenRouter по умолчанию (можно переопределить через OPENROUTER_MODEL)
const DEFAULT_MODEL = "openrouter/free";

const sessionMemory: Record<string, { facts: string[] }> = {};

// --- 5. ОБРАБОТЧИК (POST) ---
export async function POST(req: Request) {
  const { personaId, messages, userId = "localUser", isManualGold, onlySave} = await req.json();

  // --- БЛОК БЫСТРОГО СОХРАНЕНИЯ ---
if (onlySave && isManualGold) {
  const lastPair = messages.slice(-2); // Берем User и Assistant сообщения
  const userMsg = lastPair[0].content;
  const assistMsg = lastPair[1].content;
  const tags = extractTags(userMsg); // Генерим теги для графа связей

  const chatDir = path.resolve("./chats");
  const goldPath = path.join(chatDir, `${personaId}_gold.json`);
  let gold = safeReadJSON(goldPath);

  const entry = { timestamp: new Date().toISOString(), user: userMsg, assistant: assistMsg, tags };
  
  if (!gold.some((g: any) => g.user === userMsg)) {
    gold.push(entry);
    try { fs.writeFileSync(goldPath, JSON.stringify(gold.slice(-500), null, 2)); }
    catch (e) { console.error("Gold write fail:", e); }
  }
  return NextResponse.json({ status: "crystallized" });
}
  const persona = personasById[personaId];
  if (!persona) return NextResponse.json({ error: "No persona" }, { status: 400 });

  const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";
  const currentTags = extractTags(lastUserMessage);

  // Обновляем память сессии (теги)
  if (!sessionMemory[userId]) sessionMemory[userId] = { facts: [] };
  sessionMemory[userId].facts = Array.from(new Set([...sessionMemory[userId].facts, ...currentTags])).slice(-30);

  // Запуск гибридного RAG
  const relevantContext = await getContextFromFiles(personaId, lastUserMessage);
  const controls = personaControls[personaId as keyof typeof personaControls] || {};
  
  const systemPrompt = `
${persona.systemPrompt}
${relevantContext ? `ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ ПАНТЕОНА:\n${relevantContext}` : "История чиста."}`.trim();

  // --- LLM через OpenRouter ---
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENROUTER_API_KEY не задан" }, { status: 500 });

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.URL || "http://localhost:3000",
      "X-Title": "Pantheon",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
      ],
      temperature: (controls as any).temperature || 0.7,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.choices?.[0]?.message) {
    console.error("OpenRouter error:", response.status, data?.error);
    return NextResponse.json(
      { error: data?.error?.message || `OpenRouter ответил ${response.status}` },
      { status: 502 }
    );
  }
  const fullText: string = data.choices[0].message.content || "";

  const cleanReply = fullText.replace(/<thought>[\s\S]*?<\/thought>/g, "").trim();

  // Логирование и самообучение (на Netlify файловая система только для чтения — ошибки записи не роняют ответ)
  try {
    const chatDir = path.resolve("./chats");
    if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir);
    const entry = { timestamp: new Date().toISOString(), user: lastUserMessage, assistant: cleanReply, tags: currentTags };

    // Пишем в основную память
    let history = safeReadJSON(path.join(chatDir, `${personaId}.json`));
    history.push(entry);
    fs.writeFileSync(path.join(chatDir, `${personaId}.json`), JSON.stringify(history.slice(-100), null, 2));

    // Умная кристаллизация (Золотой Фонд)
    if (isManualGold || cleanReply.length > (controls.gold_threshold || 500)) {
      let gold = safeReadJSON(path.join(chatDir, `${personaId}_gold.json`));
      if (!gold.some((g: any) => g.user === lastUserMessage)) {
        gold.push(entry);
        fs.writeFileSync(path.join(chatDir, `${personaId}_gold.json`), JSON.stringify(gold.slice(-500), null, 2));
      }
    }
  } catch (e) { console.error("Memory write fail:", e); }

  return NextResponse.json({ reply: cleanReply });
}

