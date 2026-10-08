const TOKEN_KEY = "formbuilder.token";
const RESPONDENT_KEY = "formbuilder.respondent";

export const SESSION_EXPIRED_EVENT = "formbuilder:session-expired";

export function getToken() {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

// crypto.randomUUID only exists in secure contexts (HTTPS or localhost).
function uuid() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getRespondentKey() {
  let key = window.localStorage.getItem(RESPONDENT_KEY);
  if (!key) {
    key = uuid();
    window.localStorage.setItem(RESPONDENT_KEY, key);
  }

  return key;
}
