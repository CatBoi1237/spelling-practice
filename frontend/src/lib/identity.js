// Guest identity: lets players use Daily + Multiplayer without signing in.

const ID_KEY = "sb.playerId.v1";
const NAME_KEY = "sb.playerName.v1";

const ADJ = ["Swift", "Clever", "Bold", "Bright", "Keen", "Nimble", "Sharp", "Brave"];
const NOUN = ["Speller", "Scribe", "Wordsmith", "Lexicon", "Quill", "Bee", "Scholar"];

export function getPlayerId() {
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = `g_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function getPlayerName() {
  let name = localStorage.getItem(NAME_KEY);
  if (!name) {
    name = `${ADJ[Math.floor(Math.random() * ADJ.length)]}${NOUN[Math.floor(Math.random() * NOUN.length)]}`;
    localStorage.setItem(NAME_KEY, name);
  }
  return name;
}

export function setPlayerName(name) {
  localStorage.setItem(NAME_KEY, (name || "").trim().slice(0, 24));
}
