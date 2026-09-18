import { downloadText } from "@/lib/learningTools";
import { buildOfflinePack } from "@/lib/offlineDocument";

export function downloadOfflinePack(title, words) {
  downloadText("spellbee-offline-pack.html", buildOfflinePack(title, words), "text/html");
}
