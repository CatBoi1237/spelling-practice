import { useEffect, useRef, useState } from "react";

export default function FlappyFlight({ onFinish }) {
  const state = useRef({ y: 150, velocity: 0, x: 430 });
  const [frame, setFrame] = useState(state.current);
  const [paused, setPaused] = useState(false);
  const done = useRef(false);
  const flap = () => { if (!done.current) state.current.velocity = -180; };
  useEffect(() => {
    const hide = () => { if (document.hidden) setPaused(true); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  useEffect(() => {
    if (paused) return;
    let request, last;
    const step = time => {
      if (done.current) return;
      const dt = Math.min((time - (last || time)) / 1000, 0.035); last = time;
      const s = state.current;
      s.velocity += 380 * dt; s.y += s.velocity * dt; s.x -= 85 * dt;
      const collided = s.y < 13 || s.y > 287 || (s.x < 105 && s.x + 46 > 75 && (s.y < 97 || s.y > 203));
      if (collided || s.x < 22) { done.current = true; onFinish(!collided); return; }
      setFrame({ ...s }); request = requestAnimationFrame(step);
    };
    request = requestAnimationFrame(step);
    return () => cancelAnimationFrame(request);
  }, [paused, onFinish]);
  return <div className="space-y-3">
    <p>Tap or press Space to flap through the flower gate. Then spell a word to keep flying.</p>
    <button type="button" aria-label="Flight area: press Space or tap to flap" onPointerDown={e => { e.preventDefault(); flap(); }} onKeyDown={e => { if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap(); } }} className="block w-full touch-none overflow-hidden rounded-2xl border-2 border-amber-400 focus:outline focus:outline-4 focus:outline-white">
      <svg viewBox="0 0 480 300" className="w-full" role="img" aria-label="Bee flying through a garden gate">
        <rect width="480" height="300" fill="#0c4a6e" />
        <circle cx="390" cy="48" r="27" fill="#fde68a" />
        <path d="M0 275 Q100 230 200 280 T480 260 V300 H0Z" fill="#166534" />
        <rect x={frame.x} y="0" width="46" height="84" rx="12" fill="#4ade80" />
        <rect x={frame.x} y="216" width="46" height="84" rx="12" fill="#4ade80" />
        <ellipse cx="90" cy={frame.y - 12} rx="11" ry="8" fill="#e0f2fe" />
        <ellipse cx="90" cy={frame.y} rx="15" ry="12" fill="#fbbf24" />
        <path d={`M86 ${frame.y - 11}v22 M94 ${frame.y - 10}v20`} stroke="#422006" strokeWidth="4" />
        <circle cx="100" cy={frame.y - 3} r="2" fill="#0f172a" />
        {paused && <text x="240" y="150" textAnchor="middle" fill="white" fontSize="24">Paused</text>}
      </svg>
    </button>
    <button className="tool-button" onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}</button>
    <button className="tool-button" onClick={() => { done.current = true; onFinish(true); }}>Skip flight · spelling only</button>
  </div>;
}
