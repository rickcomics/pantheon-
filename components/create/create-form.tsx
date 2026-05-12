// components/create/create-form.tsx
"use client";

import { useState } from "react";

export function CreateForm() {
  const [name, setName] = useState("");
  const [archetype, setArchetype] = useState("");
  const [essence, setEssence] = useState("");
  const [result, setResult] = useState("");

  const generate = async () => {
    const res = await fetch("/api/persona", {
      method: "POST",
      body: JSON.stringify({ name, archetype, essence }),
    });

    const data = await res.json();
    setResult(data.prompt);
  };

  return (
    <div className="create-form">
      <input
        className="create-input"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="create-input"
        placeholder="Archetype"
        value={archetype}
        onChange={(e) => setArchetype(e.target.value)}
      />

      <textarea
        className="create-textarea"
        placeholder="Essence (1–2 sentences)"
        value={essence}
        onChange={(e) => setEssence(e.target.value)}
      />

      <button className="create-btn" onClick={generate}>
        Generate Persona
      </button>

      {result && (
        <pre className="create-result">
          {result}
        </pre>
      )}
    </div>
  );
}
