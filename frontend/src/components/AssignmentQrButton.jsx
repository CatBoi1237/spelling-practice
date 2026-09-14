import { useState } from "react";
import { Copy, QrCode, X } from "lucide-react";
import { toast } from "sonner";

export default function AssignmentQrButton({ code, title }) {
  const [open, setOpen] = useState(false);
  const assignmentUrl = `${window.location.origin}/assignment/${code}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(assignmentUrl)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(assignmentUrl);
      toast.success("Assignment link copied.");
    } catch {
      toast.error("Could not copy the assignment link.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10"
      >
        <QrCode className="h-3.5 w-3.5" /> QR code
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-emerald-500/25 bg-slate-900 p-6 shadow-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Assignment QR</div>
                <h2 className="mt-2 font-heading text-2xl font-black text-slate-50">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">Students scan once and land directly on this assignment.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assignment QR"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-800 text-slate-400 hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-3 shadow-lg shadow-black/20">
              <img
                src={qrSrc}
                alt={`QR code for assignment ${code}`}
                width="250"
                height="250"
                className="h-[250px] w-[250px] max-w-full"
              />
            </div>

            <div className="mt-5 text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Assignment code</div>
              <div className="mt-1 font-mono text-3xl font-black tracking-[0.26em] text-amber-300">{code}</div>
            </div>

            <button
              type="button"
              onClick={copy}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400"
            >
              <Copy className="h-4 w-4" /> Copy assignment link
            </button>
          </div>
        </div>
      )}
    </>
  );
}
