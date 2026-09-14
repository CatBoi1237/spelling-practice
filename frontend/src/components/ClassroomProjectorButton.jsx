import { useCallback, useEffect, useState } from "react";
import { ExternalLink, MonitorUp } from "lucide-react";
import { useParams } from "react-router-dom";

import { api } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import { useAuth } from "@/context/AuthContext";

export default function ClassroomProjectorButton() {
  const { code } = useParams();
  const roomCode = (code || "").toUpperCase();
  const { user } = useAuth();
  const playerId = user?.id || getPlayerId();
  const [room, setRoom] = useState(null);

  const refresh = useCallback(async () => {
    if (!roomCode) return;
    try {
      const { data } = await api.get(`/classrooms/${roomCode}`, {
        params: { player_id: playerId },
      });
      setRoom(data);
    } catch {
      // Main classroom handles errors.
    }
  }, [roomCode, playerId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [refresh]);

  if (room?.role !== "host" || room.status === "finished") return null;

  const openProjector = () => {
    window.open(`/classroom/${roomCode}/projector`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto mb-3 flex max-w-6xl justify-end">
      <button
        type="button"
        onClick={openProjector}
        className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-bold text-indigo-200 transition hover:border-indigo-400/60 hover:bg-indigo-500/20"
      >
        <MonitorUp className="h-4 w-4" />
        Projector Mode
        <ExternalLink className="h-3.5 w-3.5 text-indigo-300/70" />
      </button>
    </div>
  );
}
