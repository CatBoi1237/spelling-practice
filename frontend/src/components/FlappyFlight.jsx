import { useEffect, useRef, useState } from "react";

export default function FlappyFlight({ onFinish }) {
  const state = useRef({ y: 150, velocity: 0, x: 610 });
  const [frame, setFrame] = useState(state.current);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const area = useRef(null);
  const done = useRef(false);
  const flap = () => { if (!done.current && ready && !paused) state.current.velocity = -180; };
  useEffect(() => {
    const hide = () => { if (document.hidden) setPaused(true); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  useEffect(() => {
    if (paused || !ready) return;
    let request, last;
    const step = time => {
      if (done.current) return;
      const dt = Math.min((time - (last || time)) / 1000, 0.035); last = time;
      const s = state.current;
      s.velocity += 380 * dt; s.y += s.velocity * dt; s.x -= 70 * dt;
      const collided = s.y < 13 || s.y > 287 || (s.x < 105 && s.x + 46 > 75 && (s.y < 73 || s.y > 227));
      if (collided || s.x < 22) { done.current = true; onFinish(!collided); return; }
      setFrame({ ...s }); request = requestAnimationFrame(step);
    };
    request = requestAnimationFrame(step);
    return () => cancelAnimationFrame(request);
  }, [paused, ready, onFinish]);
  return <div className="space-y-3">
    <p>Wider gates and a longer flight give you more space between words. Tap or press Space to flap. Start each flight when you are ready.</p>
    <button ref={area} type="button" aria-label="Flight area: press Space or tap to flap" onPointerDown={e => { e.preventDefault(); flap(); }} onKeyDown={e => { if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap(); } }} className="block w-full touch-none overflow-hidden rounded-2xl border-2 border-amber-400 focus:outline focus:outline-4 focus:outline-white">
      <svg viewBox="0 0 480 300" className="w-full" role="img" aria-label="Bee flying through a garden gate">
        <rect width="480" height="300" fill="#0c4a6e" />
        <circle cx="390" cy="48" r="27" fill="#fde68a" />
        <path d="M0 275 Q100 230 200 280 T480 260 V300 H0Z" fill="#166534" />
        <rect x={frame.x} y="0" width="46" height="60" rx="12" fill="#4ade80" />
        <rect x={frame.x} y="240" width="46" height="60" rx="12" fill="#4ade80" />
        <ellipse cx="90" cy={frame.y - 12} rx="11" ry="8" fill="#e0f2fe" />
        <ellipse cx="90" cy={frame.y} rx="15" ry="12" fill="#fbbf24" />
        <path d={`M86 ${frame.y - 11}v22 M94 ${frame.y - 10}v20`} stroke="#422006" strokeWidth="4" />
        <circle cx="100" cy={frame.y - 3} r="2" fill="#0f172a" />
        {(!ready || paused) && <text x="240" y="150" textAnchor="middle" fill="white" fontSize="24">{ready ? "Paused" : "Ready when you are"}</text>}
      </svg>
    </button>
    <button className="tool-button" onClick={() => { if (!ready) { setReady(true); state.current.velocity = -100; } else setPaused(!paused); area.current?.focus(); }}>{!ready ? "Start flight" : paused ? "Resume" : "Pause"}</button>
    <button className="tool-button" onClick={() => { if (!done.current) { done.current = true; onFinish(true); } }}>Skip flight · spelling only</button>
  </div>;
}
