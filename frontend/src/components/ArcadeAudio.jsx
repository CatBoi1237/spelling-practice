import { useCallback, useEffect, useRef, useState } from "react";
import { speak, cancelSpeech, isSpeechSupported } from "@/lib/speech";

export default function ArcadeAudio({ text, settings, autoPlay = false, label = "Hear word" }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const request = useRef(0), startTimer = useRef(null);
  const { rate, voiceName, voiceLang } = settings;
  const stop = useCallback(() => {
    request.current++;
    clearTimeout(startTimer.current);
    cancelSpeech();
  }, []);
  const play = useCallback((speed = rate, preferLocal = false) => {
    const id = ++request.current;
    clearTimeout(startTimer.current);
    if (!isSpeechSupported()) { setStatus("error"); setMessage("Speech is unavailable in this browser. Try Edge or Chrome with an installed English voice."); return; }
    setStatus("loading"); setMessage("");
    const failed = () => {
      if (id !== request.current) return;
      clearTimeout(startTimer.current);
      setStatus("error");
      setMessage("The voice did not start. Try the audio button again or Try installed voice. If it stays silent, check that this browser tab is not muted and choose another voice in Settings.");
    };
    startTimer.current = setTimeout(() => { if (id === request.current) { cancelSpeech(); failed(); } }, 4000);
    speak(text, {
      rate: speed, voiceName: preferLocal ? null : voiceName, voiceLang: preferLocal ? "auto" : voiceLang, preferLocal,
      onStart: () => { if (id === request.current) { clearTimeout(startTimer.current); setStatus("playing"); } },
      onEnd: () => { if (id === request.current) { clearTimeout(startTimer.current); setStatus("idle"); } },
      onError: failed,
    });
  }, [text, rate, voiceName, voiceLang]);
  useEffect(() => {
    setStatus("idle"); setMessage("");
    if (autoPlay) play();
    return stop;
  }, [autoPlay, play, stop]);
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <button type="button" className="tool-button" onClick={() => play()}>{label}</button>
      <button type="button" className="tool-button" onClick={() => play("slow")}>Hear slowly</button>
      {(status === "playing" || status === "loading") && <button type="button" className="tool-button" onClick={() => { stop(); setStatus("idle"); setMessage(""); }}>Stop audio</button>}
      <button type="button" className="tool-button" onClick={() => play(rate, true)}>Try installed voice</button>
    </div>
    <p role="status" className="text-sm">{message || (status === "playing" ? "Playing audio…" : status === "loading" ? "Starting audio…" : "Use the audio buttons if you did not hear it.")}</p>
  </div>;
}
