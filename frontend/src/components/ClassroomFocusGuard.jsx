import { useEffect } from "react";
import { toast } from "sonner";

const ACTIVE_ANSWER_SELECTOR = 'input[placeholder="Type the word..."]';

function activeAnswerInput() {
  return document.querySelector(ACTIVE_ANSWER_SELECTOR);
}

export default function ClassroomFocusGuard() {
  useEffect(() => {
    let lastPasteNotice = 0;

    const blockPasteOrDrop = (event) => {
      const input = activeAnswerInput();
      if (!input || event.target !== input) return;

      event.preventDefault();
      const now = Date.now();
      if (now - lastPasteNotice > 1200) {
        lastPasteNotice = now;
        toast.warning("Paste is disabled during live Classroom spelling rounds.");
      }
    };

    const onVisibilityChange = () => {
      if (!document.hidden || !activeAnswerInput()) return;
      try {
        const key = "spellbee.classroom.focusLeaves";
        const next = Number(sessionStorage.getItem(key) || 0) + 1;
        sessionStorage.setItem(key, String(next));
      } catch {
        // Session storage may be unavailable in private browsing.
      }
    };

    document.addEventListener("paste", blockPasteOrDrop, true);
    document.addEventListener("drop", blockPasteOrDrop, true);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("paste", blockPasteOrDrop, true);
      document.removeEventListener("drop", blockPasteOrDrop, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
