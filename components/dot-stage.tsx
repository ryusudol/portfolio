"use client";

import { useEffect, useRef } from "react";

import { DotEngine } from "@/lib/dots/engine";
import { scenes } from "@/lib/dots/scenes";

/** The single full-viewport canvas every chapter draws into. */
export function DotStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = document.getElementById("chapters");
    if (!canvas || !root) return;
    let engine: DotEngine;
    try {
      engine = new DotEngine(canvas, root, scenes);
    } catch {
      return;
    }
    engine.start();
    return () => engine.destroy();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="stage"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
