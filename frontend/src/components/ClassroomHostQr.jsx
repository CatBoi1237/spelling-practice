import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import { useAuth } from "@/context/AuthContext";
import ClassroomQrCard from "@/components/ClassroomQrCard";

export default function ClassroomHostQr() {
  const { code } = useParams();
  const { user } = useAuth();
  const roomCode = (code || "").toUpperCase();
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
      // The main Classroom page handles room errors.
    }
  }, [roomCode, playerId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 1500);
    return () => clearInterval(timer);
  }, [refresh]);

  if (room?.role !== "host" || room.status !== "lobby") {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30 sm:left-auto sm:right-6 sm:w-[430px] xl:top-24 xl:bottom-auto">
      <ClassroomQrCard roomCode={roomCode} />
    </div>
  );
}
