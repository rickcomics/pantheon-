// app/api/chat/route.ts — Vercel-safe patch
import { NextResponse } from "next/server";
import { personasById } from "@/lib/personas";
import personaControls from "@/layer/persona_controls.json";
import fs from "fs";
import path from "path";
import { Index } from "flexsearch";
import { pipeline } from "@xenova/transformers";

const CHAT_ROOT = process.env.VERCEL ? "/tmp/pantheon-chats" : path.resolve("./chats");

function getChatDir() {
  try {
    if (!fs.existsSync(CHAT_ROOT)) fs.mkdirSync(CHAT_ROOT, { recursive: true });
    return CHAT_ROOT;
  } catch {
    return "/tmp";
  }
}

// --- 1. ЯДРО СЕМАНТИКИ (Transformers.js) ---
let embedder: any = null;
async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0, mA = 0, mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
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
  for (const q of queryTags) {
    if (textStems.includes(q)) score += q.length > 5 ? 2 : 1;
  }
  return score;
}

// --- 3. ГИБРИДНЫЙ GRAPH RAG ДВИЖОК ---
async function getContextFromFiles(personaId: string, userMessage: string, maxEntries = 4): Promise<string> {
  const chatDir = getChatDir();
  const goldPath = path.join(chatDir, `${personaId}_gold.json`);
  const historyPath = path.join(chatDir, `${personaId}.json`);
  const queryTags = extractTags(userMessage);

  if (queryTags.length === 0) return "";

  const searchIndex = new Index({ preset: "memory", tokenize: "forward" });
  let allKnowledge: any[] = [];

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

  const results = searchIndex.search(queryTags.join(" "), { limit: 15 });
  let scored = results
    .map((id) => {
      const item = allKnowledge[id as number];
      return { ...item, finalScore: simpleSearchScore(item.user, queryTags) * item.weight };
    })
    .filter((e) => e.finalScore > 0);

  if (scored.length < 2) {
    try {
      const generateEmbedding = await getEmbedder();
      const userVector = await generateEmbedding(userMessage, { pooling: "mean", normalize: true });
      const userVecArray = Array.from(userVector.data as number[]);
      const candidates = allKnowledge.slice(-40);
      for (const item of candidates) {
        if (scored.some((s) => s.user === item.user)) continue;
        const itemVector = await generateEmbedding(item.user, { pooling: "mean", normalize: true });
        const similarity = cosineSimilarity(userVecArray, Array.from(itemVector.data as number[]));
        if (similarity > 0.68) scored.push({ ...item, finalScore: similarity * item.weight * 4 });
      }
    } catch (e) {
      console.error("Semantics fail:", e);
    }
  }

  const foundTags = new Set(scored.flatMap((s) => s.tags || []));
  const associations = allKnowledge
    .filter((item) => !scored.some((s) => s.id === item.id) && item.tags?.some((t: string) => foundTags.has(t)))
    .sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0))
    .slice(0, 2);

  const finalContext = [...scored.sort((a, b) => b.finalScore - a.finalScore).slice(0, maxEntries), ...associations];

  return finalContext
    .map((e) => {
      const type = associations.includes(e) ? "СВЯЗЬ" : e.weight > 2 ? "ЗОЛОТО" : "ОПЫТ";
      return `[${type}] USER: ${e.user}\nASSISTANT: ${e.assistant}`;
    })
    .join("\n---\n");
}

// --- 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function safeReadJSON(filePath: string): any[] {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : [];
  } catch {
    return [];
  }
}

function writeJSONFile(filePath: string, value: any) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
    return true;
  } catch (e) {
    console.error("JSON write fail:", filePath, e);
    return false;
  }
}

const MODELS = [
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemma-2-9b-it:free",
];

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

const sessionMemory: Record<string, { facts: string[] }> = {};

// --- 5. ОБРАБОТЧИК (POST) ---
export async function POST(req: Request) {
  const { personaId, messages, userId = "localUser", isManualGold, onlySave } = await req.json();

  if (onlySave && isManualGold) {
    const lastPair = messages.slice(-2);
    const userMsg = lastPair[0]?.content || "";
    const assistMsg = lastPair[1]?.content || "";
    const tags = extractTags(userMsg);

    const chatDir = getChatDir();
    const goldPath = path.join(chatDir, `${personaId}_gold.json`);
    let gold = safeReadJSON(goldPath);
    const entry = { timestamp: new Date().toISOString(), user: userMsg, assistant: assistMsg, tags };

    if (!gold.some((g: any) => g.user === userMsg)) {
      gold.push(entry);
      writeJSONFile(goldPath, gold.slice(-500));
    }

    return NextResponse.json({ status: "crystallized" });
  }

  const persona = personasById[personaId];
  if (!persona) return NextResponse.json({ error: "No persona" }, { status: 400 });

  const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";
  const currentTags = extractTags(lastUserMessage);

  if (!sessionMemory[userId]) sessionMemory[userId] = { facts: [] };
  sessionMemory[userId].facts = Array.from(new Set([...sessionMemory[userId].facts, ...currentTags])).slice(-30);

  const relevantContext = await withTimeout(getContextFromFiles(personaId, lastUserMessage), 8000).catch((e) => {
    console.error("RAG skipped:", e);
    return "";
  });

  const controls = personaControls[personaId as keyof typeof personaControls] || {};
  const systemPrompt = `
${persona.systemPrompt}
${relevantContext ? `ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ ПАНТЕОНА:\n${relevantContext}` : "История чиста."}`.trim();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY не задан" }, { status: 500 });
  }

  const modelCandidates = Array.from(new Set(MODELS.filter(Boolean)));
  let lastOpenRouterError: any = null;

  for (const model of modelCandidates) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.URL || "http://localhost:3000",
          "X-Title": "Pantheon",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
          ],
          temperature: (controls as any).temperature || 0.7,
        }),
      });

      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }

      if (!response.ok || !data?.choices?.[0]?.message) {
        const errText = data?.error?.message || rawText || `OpenRouter ответил ${response.status}`;
        console.error("OpenRouter model failed:", model, response.status, errText);
        lastOpenRouterError = { status: response.status, message: errText };
        continue;
      }

      const fullText: string = data.choices[0].message.content || data.choices[0].message.reasoning || "";
      const cleanReply = fullText.replace(/<thought>[\s\S]*?<\/thought>/g, "").trim();

      try {
        const chatDir = getChatDir();
        const entry = { timestamp: new Date().toISOString(), user: lastUserMessage, assistant: cleanReply, tags: currentTags };

        const historyPath = path.join(chatDir, `${personaId}.json`);
        const history = safeReadJSON(historyPath);
        history.push(entry);
        writeJSONFile(historyPath, history.slice(-100));

        if (isManualGold || cleanReply.length > (controls.gold_threshold || 500)) {
          const goldPath = path.join(chatDir, `${personaId}_gold.json`);
          const gold = safeReadJSON(goldPath);
          if (!gold.some((g: any) => g.user === lastUserMessage)) {
            gold.push(entry);
            writeJSONFile(goldPath, gold.slice(-500));
          }
        }
      } catch (e) {
        console.error("Memory write fail:", e);
      }

      return NextResponse.json({ reply: cleanReply });
    } catch (error) {
      console.error("OpenRouter request exception:", model, error);
      lastOpenRouterError = error;
    }
  }

  return NextResponse.json(
    {
      error: "OpenRouter unavailable",
      details: lastOpenRouterError ? String(lastOpenRouterError) : "No model responded",
    },
    { status: 502 }
  );
}

