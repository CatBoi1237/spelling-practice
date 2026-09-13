import { Copy, QrCode } from "lucide-react";
import { toast } from "sonner";

export default function ClassroomQrCard({ roomCode }) {
  const joinUrl = `${window.location.origin}/classroom/${roomCode}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(joinUrl)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast.success("Student join link copied!");
    } catch {
      toast.error("Could not copy the join link.");
    }
  };

  return (
    <section className="rounded-3xl border border-amber-500/25 bg-slate-900/60 p-5 sm:p-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="rounded-2xl bg-white p-3 shadow-lg shadow-black/20">
          <img
            src={qrSrc}
            alt={`QR code to join classroom ${roomCode}`}
            width="190"
            height="190"
            className="h-[190px] w-[190px]"
          />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-300">
            <QrCode className="h-4 w-4" />
            Scan to join
          </div>

          <div className="mt-3 font-mono text-4xl font-black tracking-[0.28em] text-slate-50">
            {roomCode}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Students can scan this QR code with their phone camera. It opens this classroom directly, then they only need to enter their name and join.
          </p>

          <button
            type="button"
            onClick={copyLink}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-300"
          >
            <Copy className="h-4 w-4" />
            Copy join link
          </button>
        </div>
      </div>
    </section>
  );
}
