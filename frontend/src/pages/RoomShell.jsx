import { Copy, Share2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import Room from "@/pages/Room";
import {
  buildCustomRacePath,
  getActiveGameCustomList,
} from "@/lib/customWordLists";

export default function RoomShell() {
  const { code } = useParams();
  const roomCode = (code || "").toUpperCase();
  const customList = getActiveGameCustomList();

  if (!customList) {
    return <Room />;
  }

  const inviteUrl = `${window.location.origin}${buildCustomRacePath(roomCode, customList)}`;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Custom race invite copied!");
    } catch {
      toast.error("Could not copy the invite link.");
    }
  };

  const shareInvite = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "SpellBee Custom Race",
          text: `🐝 Join my custom SpellBee race: ${customList.name}`,
          url: inviteUrl,
        });
      } else {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success("Invite link copied!");
      }
    } catch (e) {
      if (e?.name !== "AbortError") {
        toast.error("Could not share the custom race.");
      }
    }
  };

  return (
    <div className="custom-race-shell space-y-5">
      <section className="mx-auto max-w-6xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
              Custom list race
            </div>
            <div className="mt-1 font-heading text-xl font-bold text-slate-50">
              {customList.name} · {customList.words.length} words
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-amber-100/70">
              Share the special invite link below. The 6-character room code by itself does not carry a custom word list to another device.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyInvite}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-slate-950/70 px-4 py-2.5 text-sm font-bold text-amber-200 hover:bg-slate-900"
            >
              <Copy className="h-4 w-4" /> Copy custom invite
            </button>
            <button
              type="button"
              onClick={shareInvite}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </div>
      </section>

      <Room />

      <style>{`
        .custom-race-shell [data-testid="copy-invite-button"],
        .custom-race-shell [data-testid="share-invite-button"] {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
