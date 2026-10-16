"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Pookie } from "./mascot";
export function RunningPookie() {
  const root = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [foreground, setForeground] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => setReduced(media.matches);
    preference();
    media.addEventListener("change", preference);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    if (root.current) observer.observe(root.current);
    const image = new window.Image();
    let canceled = false;
    image.onload = () => {
      if (!canceled) setLoaded(true);
    };
    image.onerror = () => {
      if (!canceled) setLoaded(false);
    };
    image.src = "/pookie/pookie-run-cycle-v1.webp";
    const visibility = () => setForeground(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      canceled = true;
      observer.disconnect();
      media.removeEventListener("change", preference);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const animated = loaded && !reduced;
  const playing = animated && visible && foreground && !paused;
  return (
    <div ref={root} className="running-pookie">
      {animated ? (
        <div
          role="img"
          aria-label="Pookie out for a happy little run"
          className="pookie-run-sprite"
          style={{ animationPlayState: playing ? "running" : "paused" }}
        />
      ) : (
        <Pookie priority sizes="(max-width: 640px) 90vw, 580px" />
      )}
      {animated && (
        <button
          type="button"
          className="motion-toggle"
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
          {paused ? "Run, Pookie!" : "Pause Pookie"}
        </button>
      )}
    </div>
  );
}
