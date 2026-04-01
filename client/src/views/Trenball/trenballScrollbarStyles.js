/**
 * Shared scrollbar styling (Firefox scrollbar-color + WebKit) for Trenball UI.
 * Neutral gray track + thumb.
 */

const TRACK = "rgba(255,255,255,0.06)";
const TRACK_DEEP = "rgba(0,0,0,0.22)";

const THUMB = "linear-gradient(180deg, #6b7075 0%, #4a4f54 45%, #3d4247 100%)";
const THUMB_HOVER = "linear-gradient(180deg, #858a90 0%, #5c6268 45%, #4d5359 100%)";

const webkitY = {
  "&::-webkit-scrollbar-corner": { background: "transparent" },
  "&::-webkit-scrollbar": { width: "8px", height: "8px" },
  "&::-webkit-scrollbar-track": {
    background: `linear-gradient(90deg, ${TRACK} 0%, ${TRACK_DEEP} 100%)`,
    borderRadius: "100px",
    marginBlock: "6px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: THUMB,
    borderRadius: "100px",
    border: "2px solid rgba(12,14,18,0.9)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    background: THUMB_HOVER,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
  },
};

/** Live player lists (bear / bull) */
export const trenballScrollbarY = {
  scrollbarGutter: "stable",
  scrollbarWidth: "thin",
  scrollbarColor: `#5a5f64 ${TRACK}`,
  WebkitOverflowScrolling: "touch",
  ...webkitY,
};

/** Help / scrollable modals — avoid stable gutter shift inside dialog */
export const trenballScrollbarYModal = {
  scrollbarGutter: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: `#555a5f ${TRACK}`,
  WebkitOverflowScrolling: "touch",
  ...webkitY,
};

/** Round history strip (horizontal) */
export const trenballScrollbarXStrip = {
  scrollbarWidth: "thin",
  scrollbarColor: `#5a5f64 ${TRACK_DEEP}`,
  WebkitOverflowScrolling: "touch",
  "&::-webkit-scrollbar": { height: "6px" },
  "&::-webkit-scrollbar-track": {
    background: TRACK_DEEP,
    borderRadius: "100px",
    marginInline: "8px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "linear-gradient(90deg, #4d5257 0%, #6a6f75 50%, #4d5257 100%)",
    borderRadius: "100px",
    border: "1px solid rgba(0,0,0,0.35)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    background: "linear-gradient(90deg, #5a6066 0%, #7a8086 50%, #5a6066 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
  },
};

/** Bet history table area (vertical + horizontal) */
export const trenballScrollbarBoth = {
  scrollbarGutter: "stable",
  scrollbarWidth: "thin",
  scrollbarColor: `#555a5f ${TRACK}`,
  WebkitOverflowScrolling: "touch",
  "&::-webkit-scrollbar-corner": {
    background: "rgba(0,0,0,0.15)",
    borderRadius: "4px",
  },
  "&::-webkit-scrollbar": { width: "8px", height: "8px" },
  "&::-webkit-scrollbar-track": {
    background: `linear-gradient(180deg, ${TRACK} 0%, ${TRACK_DEEP} 100%)`,
    borderRadius: "100px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: THUMB,
    borderRadius: "100px",
    border: "2px solid rgba(12,14,18,0.9)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    background: THUMB_HOVER,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
  },
};
