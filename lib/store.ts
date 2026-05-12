// lib/store.ts
import { create } from "zustand";
import { personas, personasById, type Persona } from "./personas";

type PersonaState = {
  activePersona: Persona;
  setActivePersona: (id: string) => void;
};

export const usePersonaStore = create<PersonaState>((set) => ({
  activePersona: personas[0], // по умолчанию Соломир
  setActivePersona: (id) =>
    set(() => ({
      activePersona: personasById[id] ?? personas[0],
    })),
}));
