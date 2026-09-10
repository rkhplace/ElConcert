"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { playerState } from "@/game/state/playerState";
import { InputManager } from "@/game/input/InputManager";
import { useGame } from "@/game/state/gameState";

/** Routes E / Enter / interaction-button presses to the active prompt. */
export function InteractionSystem() {
  useFrame(() => {
    if (InputManager.consumeInteract()) {
      const p = useGame.getState().prompt;
      if (p) p.onInteract();
    }
  });
  return null;
}

interface ProximityProps {
  x: number;
  z: number;
  radius: number;
  once?: boolean;
  onEnter?: () => void;
  onExit?: () => void;
  enabled?: boolean;
}

/** Fires callbacks when the player enters / leaves a circle on the ground. */
export function ProximityTrigger({
  x,
  z,
  radius,
  once = false,
  onEnter,
  onExit,
  enabled = true,
}: ProximityProps) {
  const inside = useRef(false);
  const done = useRef(false);

  useFrame(() => {
    if (!enabled || (once && done.current)) return;
    const dx = playerState.position.x - x;
    const dz = playerState.position.z - z;
    const near = dx * dx + dz * dz <= radius * radius;
    if (near && !inside.current) {
      inside.current = true;
      done.current = true;
      onEnter?.();
    } else if (!near && inside.current) {
      inside.current = false;
      onExit?.();
    }
  });

  return null;
}

interface PromptZoneProps {
  x: number;
  z: number;
  radius: number;
  label: string;
  onInteract: () => void;
  enabled?: boolean;
}

/** Shows an interaction prompt while the player stands inside the zone. */
export function PromptZone({
  x,
  z,
  radius,
  label,
  onInteract,
  enabled = true,
}: PromptZoneProps) {
  const inside = useRef(false);
  const setPrompt = useGame((s) => s.setPrompt);
  const cb = useRef(onInteract);
  cb.current = onInteract;

  useFrame(() => {
    if (!enabled) {
      if (inside.current) {
        inside.current = false;
        setPrompt(null);
      }
      return;
    }
    const dx = playerState.position.x - x;
    const dz = playerState.position.z - z;
    const near = dx * dx + dz * dz <= radius * radius;
    if (near && !inside.current) {
      inside.current = true;
      setPrompt({ label, onInteract: () => cb.current() });
    } else if (!near && inside.current) {
      inside.current = false;
      setPrompt(null);
    }
  });

  useEffect(() => {
    return () => {
      if (inside.current) setPrompt(null);
    };
  }, [setPrompt]);

  return null;
}

/** Fires once when the player walks past a given Z line (progress gate). */
export function ZGate({
  z,
  dir = -1,
  onCross,
  enabled = true,
}: {
  z: number;
  dir?: 1 | -1;
  onCross: () => void;
  enabled?: boolean;
}) {
  const done = useRef(false);
  useFrame(() => {
    if (!enabled || done.current) return;
    const crossed = dir === -1 ? playerState.position.z <= z : playerState.position.z >= z;
    if (crossed) {
      done.current = true;
      onCross();
    }
  });
  return null;
}
