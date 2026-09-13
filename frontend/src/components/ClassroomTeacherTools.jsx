import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BookOpen,
  Eye,
  Globe2,
  Loader2,
  MessageSquareQuote,
  Repeat2,
  SkipForward,
  Speaker,
  Turtle,
} from "lucide-react";

import { api, apiError } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import { pickSeededWords } from "@/lib/seeded";
import { cancelSpeech, speak } from "@/lib/speech";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";

export default function ClassroomTeacherTools() {
  const { code } = useParams();
  const roomCode = (code || "").toUpperCase();
  const { user } = useAuth();
  const { settings } = useApp();
  const playerId = user?.id || getPlayerId();

  const [room, setRoom] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!roomCode) return;

    try {
      const { data } = await api.get(`/classrooms/${roomCode}`, {
        params: { player_id: playerId },
      });
      setRoom(data);
    } catch {
      // The main Classroom page owns error handling.
    }
  }, [roomCode, playerId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  const hostWords = useMemo(() => {
    if (room?.role !== "host" || !room?.seed) return [];
    return pickSeededWords(room.seed, room.word_count, room.difficulty);
  }, [room?.role, room?.seed, room?.word_count, room?.difficulty]);

  const currentWord =
    room?.round_index >= 0 ? hostWords[room.round_index] : null;

  const say = (text, rate = settings.rate) => {
    if (!text) {
      toast.error("That clue is not available for this word.");
      return;
    }

    cancelSpeech();
    setTimeout(() => {
      speak(text, {
        rate,
        voiceName: settings.voiceName,
        voiceLang: settings.voiceLang,
      });
    }, 100);
  };

  const repeatWord = (rate = settings.rate) => {
    if (!room?.current_word) return;
    say(room.current_word, rate);
  };

  const playDefinition = () => {
    say(currentWord?.definition ? `Definition. ${currentWord.definition}` : "");
  };

  const playSentence = () => {
    say(currentWord?.example ? `Sentence. ${currentWord.example}` : "");
  };

  const playOrigin = () => {
    if (!currentWord) return;

    const origin = [currentWord.origin, currentWord.originNote]
      .filter(Boolean)
      .join(". ");

    say(origin ? `Origin. ${origin}` : "");
  };

  const revealWord = async () => {
    setBusy(true);
    cancelSpeech();

    try {
      const { data } = await api.post(`/classrooms/${roomCode}/reveal`);
      setRoom(data);
    } catch (e) {
      toast.error(apiError(e, "Could not reveal this word."));
    } finally {
      setBusy(false);
    }
  };

  const skipWord = async () => {
    if ((room?.answered_count || 0) > 0) {
      toast.error("You can only skip before a student submits an answer.");
      return;
    }

    setBusy(true);
    cancelSpeech();

    try {
      const { data: revealedRoom } = await api.post(
        `/classrooms/${roomCode}/reveal`
      );

      setRoom(revealedRoom);

      const isLastWord =
        revealedRoom.round_index >= revealedRoom.word_count - 1;

      if (isLastWord) {
        const { data: finishedRoom } = await api.post(
          `/classrooms/${roomCode}/finish`
        );
        setRoom(finishedRoom);
        toast.success("Final word skipped. Game finished.");
        return;
      }

      const nextIndex = revealedRoom.round_index + 1;
      const nextWord = hostWords[nextIndex];

      if (!nextWord) {
        toast.error("Could not find the next word.");
        return;
      }

      const { data: nextRoom } = await api.post(
        `/classrooms/${roomCode}/round/start`,
        { word: nextWord.word }
      );

      setRoom(nextRoom);
      toast.success("Word skipped.");

      setTimeout(() => {
        speak(nextWord.word, {
          rate: settings.rate,
          voiceName: settings.voiceName,
          voiceLang: settings.voiceLang,
        });
      }, 700);
    } catch (e) {
      toast.error(apiError(e, "Could not skip this word."));
    } finally {
      setBusy(false);
    }
  };

  if (
    !room ||
    room.role !== "host" ||
    room.status !== "running" ||
    room.revealed ||
    !currentWord
  ) {
    return null;
  }

  const skipDisabled = busy || (room.answered_count || 0) > 0;

  const toolButton =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-amber-500/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex justify-center sm:inset-x-6 sm:bottom-5">
      <div className="pointer-events-auto w-full max-w-5xl rounded-2xl border border-amber-500/30 bg-slate-950/95 p-3 shadow-2xl shadow-black/50 backdrop-blur sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">
              Teacher spelling-bee controls
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Audio plays only on this teacher device.
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-400">
            {room.answered_count}/{room.students.length} answered
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          <button type="button" onClick={playDefinition} className={toolButton}>
            <BookOpen className="h-4 w-4" /> Definition
          </button>

          <button type="button" onClick={playSentence} className={toolButton}>
            <MessageSquareQuote className="h-4 w-4" /> Sentence
          </button>

          <button type="button" onClick={playOrigin} className={toolButton}>
            <Globe2 className="h-4 w-4" /> Origin
          </button>

          <button type="button" onClick={() => repeatWord()} className={toolButton}>
            <Repeat2 className="h-4 w-4" /> Repeat
          </button>

          <button type="button" onClick={() => repeatWord("slow")} className={toolButton}>
            <Turtle className="h-4 w-4" /> Slow
          </button>

          <button type="button" onClick={() => repeatWord("verySlow")} className={toolButton}>
            <Turtle className="h-4 w-4" /> Very slow
          </button>

          <button
            type="button"
            onClick={skipWord}
            disabled={skipDisabled}
            title={skipDisabled && (room.answered_count || 0) > 0 ? "A student has already answered" : "Skip this word"}
            className={`${toolButton} border-rose-500/30 text-rose-200 hover:border-rose-400 hover:text-rose-100`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SkipForward className="h-4 w-4" />
            )}
            Skip word
          </button>

          <button
            type="button"
            onClick={revealWord}
            disabled={busy}
            className={`${toolButton} border-indigo-500/40 bg-indigo-500/10 text-indigo-200 hover:border-indigo-400 hover:text-indigo-100`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Reveal
          </button>
        </div>

        {(room.answered_count || 0) > 0 && (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
            <Speaker className="h-3.5 w-3.5" />
            Skip is locked after the first submitted answer so nobody loses earned points.
          </div>
        )}
      </div>
    </div>
  );
}
