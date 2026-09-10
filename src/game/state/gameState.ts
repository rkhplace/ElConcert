"use client";

import { create } from "zustand";

/**
 * The single source of truth for discrete game progression.
 * Per-frame values (position, velocity, joystick vector) live in
 * `playerState` (a plain module singleton) — never in here — so that
 * moving the character does not re-render React.
 */

export type GameState =
  | "INTRO"
  | "JOURNEY"
  | "ARRIVAL"
  | "EXPLORE_VENUE"
  | "CONCERT"
  | "INCIDENT"
  | "EXIT"
  | "WALK_HOME"
  | "TICKET"
  | "ENDING"
  | "DANCE"
  | "FINISHED";

/** Which scene root is mounted for a given game state. */
export type SceneId = "katapang" | "journey" | "venue" | "nightwalk";

export const SCENE_FOR_STATE: Record<GameState, SceneId> = {
  INTRO: "katapang",
  JOURNEY: "journey",
  ARRIVAL: "venue",
  EXPLORE_VENUE: "venue",
  CONCERT: "venue",
  INCIDENT: "venue",
  EXIT: "venue",
  WALK_HOME: "nightwalk",
  TICKET: "nightwalk",
  ENDING: "nightwalk",
  DANCE: "nightwalk",
  FINISHED: "nightwalk",
};

/**
 * Character animation override. Locomotion poses (IDLE/WALK/RUN/TURN) are
 * normally chosen by the Player controller from speed; a sequence may also
 * force any pose here while the body is frozen during a cutscene.
 */
export type PlayerAnim =
  | null
  | "IDLE"
  | "WALK"
  | "RUN"
  | "TURN"
  | "INTERACT"
  | "LOOK_AROUND"
  | "SURPRISED"
  | "HELP"
  | "DANCE"
  | "CELEBRATE";

export type CameraMode = "follow" | "cutscene";

export interface InteractionPrompt {
  label: string;
  /** Called when the player presses E / taps the interaction button. */
  onInteract: () => void;
}

export interface CinematicCue {
  id: number;
  lines: string[];
  /** ms each line stays before the next; last line lingers longer. */
  pace?: number;
  /** optional callback once the whole cue has been shown */
  onDone?: () => void;
}

interface GameStore {
  // ---- boot / loading ----
  assetsReady: boolean;
  started: boolean;
  setAssetsReady: (v: boolean) => void;
  startExperience: () => void;

  // ---- progression ----
  state: GameState;
  setState: (s: GameState) => void;

  objective: string;
  setObjective: (t: string) => void;

  // ---- world flags ----
  motorcycleRidden: boolean;
  incidentSeen: boolean;
  ticketPickedUp: boolean;
  setFlag: (k: "motorcycleRidden" | "incidentSeen" | "ticketPickedUp", v: boolean) => void;

  // ---- interaction prompt ----
  prompt: InteractionPrompt | null;
  setPrompt: (p: InteractionPrompt | null) => void;
  fireInteract: () => void;

  // ---- cinematic text ----
  cinematic: CinematicCue | null;
  showCinematic: (lines: string[], opts?: { pace?: number; onDone?: () => void }) => void;
  clearCinematic: () => void;

  // ---- camera / character ----
  cameraMode: CameraMode;
  setCameraMode: (m: CameraMode) => void;
  playerAnim: PlayerAnim;
  setPlayerAnim: (a: PlayerAnim) => void;
  /** disables player input during cutscenes */
  inputLocked: boolean;
  setInputLocked: (v: boolean) => void;

  // ---- screen veil (used to mask scene-root swaps; diegetic fades) ----
  veil: number;
  setVeil: (v: number) => void;

  // ---- options ----
  muted: boolean;
  toggleMuted: () => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;

  // ---- debug ----
  debug: boolean;
  setDebug: (v: boolean) => void;

  // ---- lifecycle ----
  restart: () => void;
}

let cueId = 0;

const INITIAL = {
  state: "INTRO" as GameState,
  objective: "",
  motorcycleRidden: false,
  incidentSeen: false,
  ticketPickedUp: false,
  prompt: null as InteractionPrompt | null,
  cinematic: null as CinematicCue | null,
  cameraMode: "follow" as CameraMode,
  playerAnim: null as PlayerAnim,
  inputLocked: false,
  veil: 0,
};

export const useGame = create<GameStore>((set, get) => ({
  assetsReady: false,
  started: false,
  setAssetsReady: (v) => set({ assetsReady: v }),
  startExperience: () => set({ started: true }),

  ...INITIAL,

  setState: (s) => set({ state: s }),
  setObjective: (t) => set({ objective: t }),

  setFlag: (k, v) => set({ [k]: v } as Partial<GameStore>),

  setPrompt: (p) => set({ prompt: p }),
  fireInteract: () => {
    const p = get().prompt;
    if (p) p.onInteract();
  },

  showCinematic: (lines, opts) =>
    set({
      cinematic: {
        id: ++cueId,
        lines,
        pace: opts?.pace,
        onDone: opts?.onDone,
      },
    }),
  clearCinematic: () => set({ cinematic: null }),

  setCameraMode: (m) => set({ cameraMode: m }),
  setPlayerAnim: (a) => set({ playerAnim: a }),
  setInputLocked: (v) => set({ inputLocked: v }),

  setVeil: (v) => set({ veil: v }),

  muted: false,
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  reducedMotion: false,
  setReducedMotion: (v) => set({ reducedMotion: v }),

  debug: false,
  setDebug: (v) => set({ debug: v }),

  restart: () =>
    set({
      ...INITIAL,
      // keep user options across restarts
    }),
}));

/** Convenience non-hook accessor for use inside useFrame / imperative code. */
export const game = () => useGame.getState();
