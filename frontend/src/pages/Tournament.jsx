import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DIFFICULTY_META } from "@/data/words";
import { api, apiError } from "@/lib/api";
import { weekStart } from "@/lib/learningTools";

export default function Tournament() {
  const [level, setLevel] = useState("grade5"), [rows, setRows] = useState([]), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true; setLoading(true); setError("");
    api.get("/leaderboards", { params: { period: "weekly", metric: "score", difficulty: level, tournament: true } }).then(({ data }) => { if (alive) setRows(data.entries || []); }).catch(e => { if (alive) setError(apiError(e, "Tournament board unavailable.")); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [level, reload]);
  return <div className="space-y-6"><h1 className="text-4xl font-black">Weekly tournament</h1><p>Week beginning {weekStart()} · resets Monday at 00:00 UTC.</p><p>Ten words, 25 seconds each, no hints. Every level has its own board. Your best score this week counts.</p><label>Choose your bracket<select className="tool-input" value={level} onChange={e => setLevel(e.target.value)}>{Object.entries(DIFFICULTY_META).map(([id, meta]) => <option key={id} value={id}>{meta.label}</option>)}</select></label><p>Entering is optional. Completed results appear on the board with your player name.</p><Link className="tool-button" to={`/practice?mode=weekly&difficulty=${level}`}>Enter {DIFFICULTY_META[level].label} tournament</Link><button className="tool-button" onClick={() => setReload(v => v + 1)}>Refresh board</button>
    {loading ? <p role="status">Loading results…</p> : error ? <p role="alert">{error}</p> : <section className="tool-card"><h2 className="text-2xl font-bold">{DIFFICULTY_META[level].label} board</h2>{!rows.length && <p>No entries yet. Set the first score!</p>}<ol className="space-y-3">{rows.map(row => <li key={row.player_id}>{row.rank}. {row.name} · {row.value} points · {row.accuracy}%</li>)}</ol></section>}
  </div>;
}
