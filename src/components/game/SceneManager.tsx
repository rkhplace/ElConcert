"use client";

import { useGame, SCENE_FOR_STATE } from "@/game/state/gameState";
import KatapangScene from "./scenes/KatapangScene";
import JourneyScene from "./scenes/JourneyScene";
import VenueScene from "./scenes/VenueScene";
import NightWalkScene from "./scenes/NightWalkScene";

/**
 * Mounts exactly one scene root for the current game state. Cross-scene
 * transitions are masked by the diegetic veil raised in the sequence
 * just before `setState`, and lowered again by the next scene's boot.
 */
export default function SceneManager() {
  const sceneId = useGame((s) => SCENE_FOR_STATE[s.state]);

  switch (sceneId) {
    case "katapang":
      return <KatapangScene key="katapang" />;
    case "journey":
      return <JourneyScene key="journey" />;
    case "venue":
      return <VenueScene key="venue" />;
    case "nightwalk":
      return <NightWalkScene key="nightwalk" />;
    default:
      return null;
  }
}
