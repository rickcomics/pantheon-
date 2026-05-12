// lib/personas/index.ts
import { solomirPersona, SOLOMIR_ID } from "./solomir";
import { aegisPersona, AEGIS_ID } from "./aegis";
import { satoshiPersona, SATOSHI_ID } from "./satoshi";
import { sherlockPersona, SHERLOCK_ID } from "./sherlock"; 
import { masterPersona, MASTER_ID } from "./master"; 
import { hestiaPersona, HESTIA_ID } from "./hestia";
import { apolloPersona, APOLLO_ID } from "./apollo";
import { hadesPersona, HADES_ID } from "./hades";

export const personas = [solomirPersona, aegisPersona, satoshiPersona, sherlockPersona, masterPersona, hestiaPersona, apolloPersona, hadesPersona];

export type Persona = (typeof personas)[number];

export const personasById: Record<string, Persona> = {
  [SOLOMIR_ID]: solomirPersona,
  [AEGIS_ID]: aegisPersona,
  [SATOSHI_ID]: satoshiPersona,
  [SHERLOCK_ID]: sherlockPersona,
  [MASTER_ID]: masterPersona,
  [HESTIA_ID]: hestiaPersona,
  [APOLLO_ID]: apolloPersona,
  [HADES_ID]: hadesPersona,
};
