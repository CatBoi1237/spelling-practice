import { isMastered } from "@/lib/storage";

export function topicProgress(pack, stats) {
  const mastered = pack.words.filter(({ word }) => isMastered(stats[word]));
  const unmastered = pack.words.filter(({ word }) => !isMastered(stats[word]));
  const missed = unmastered.filter(({ word }) => stats[word]?.incorrect > 0);
  const attempted = pack.words.filter(({ word }) => stats[word]?.attempts > 0);
  return { mastered, unmastered, missed, attempted, total: pack.words.length };
}
