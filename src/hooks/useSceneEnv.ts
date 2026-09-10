"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

interface SceneEnvOpts {
  bg: string;
  fogColor?: string;
  fogDensity?: number;
}

/** Imperatively drive scene-level background + exponential fog per scene. */
export function useSceneEnv({ bg, fogColor, fogDensity = 0.02 }: SceneEnvOpts) {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color(bg);
    scene.fog = new THREE.FogExp2(fogColor ?? bg, fogDensity);
    gl.setClearColor(new THREE.Color(bg), 1);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene, gl, bg, fogColor, fogDensity]);
}
