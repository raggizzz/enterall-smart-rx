export const FORCE_REFRESH_EVENT = "enmeta-force-refresh";

export const dispatchForceRefresh = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FORCE_REFRESH_EVENT));
};
