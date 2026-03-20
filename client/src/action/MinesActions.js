import axiosInstance from "../api/axiosConfig";

/**
 * Get the user's current in-progress Mines game (for restore after refresh).
 * @returns {Promise<{ gameId, amount, mode, minesCount, gridSize, revealedIndices } | null>}
 */
export const minesGetActiveGame = async () => {
    try {
        const res = await axiosInstance.get("/mines/active");
        if (res.data?.success) return res.data.data || null;
        return null;
    } catch (err) {
        return null;
    }
};

/**
 * Start a Mines game (deducts balance on server).
 * @param {number} amount
 * @param {string} mode - "easy" | "normal" | "hard" | "ace"
 * @param {function} dispatch
 * @returns {Promise<{ gameId: string } | null>}
 */
export const minesStartGame = async (amount, mode, dispatch) => {
    try {
        const res = await axiosInstance.post("/mines/start", { amount, mode });
        if (res.data?.success && res.data?.data?.gameId) {
            dispatch({ type: "UPDATE_USER_BALANCE", payload: -amount });
            return res.data.data;
        }
        return null;
    } catch (err) {
        const msg = err.response?.data?.message || err.message || "Failed to start game";
        throw new Error(msg);
    }
};

/**
 * Reveal a tile (server-authoritative).
 * @param {string} gameId
 * @param {number} tileIndex
 * @param {function} dispatch - unused for now; balance only changes on cash-out or lose
 * @returns {Promise<{ isMine: boolean, gameOver?: boolean, multiplier?: number, mineIndices?: number[] }>}
 */
export const minesReveal = async (gameId, tileIndex, dispatch) => {
    try {
        const res = await axiosInstance.post("/mines/reveal", { gameId, tileIndex });
        if (res.data?.success) return res.data.data;
        throw new Error(res.data?.message || "Reveal failed");
    } catch (err) {
        const msg = err.response?.data?.message || err.message || "Failed to reveal";
        throw new Error(msg);
    }
};

/**
 * Cash out and credit winnings.
 * @param {string} gameId
 * @param {function} dispatch
 * @returns {Promise<{ winAmount: number, multiplier: number, profit: number }>}
 */
export const minesCashOut = async (gameId, dispatch) => {
    try {
        const res = await axiosInstance.post("/mines/cash-out", { gameId });
        if (res.data?.success && res.data?.data) {
            const { winAmount } = res.data.data;
            dispatch({ type: "UPDATE_USER_BALANCE", payload: winAmount });
            return res.data.data;
        }
        throw new Error(res.data?.message || "Cash out failed");
    } catch (err) {
        const msg = err.response?.data?.message || err.message || "Failed to cash out";
        throw new Error(msg);
    }
};

/**
 * Get recent global Mines results for right-side live feed (DB-backed).
 * @returns {Promise<Array>}
 */
export const getMinesResults = async () => {
    try {
        const res = await axiosInstance.get("/mines/results");
        if (res.data?.success && Array.isArray(res.data.data)) {
            return res.data.data;
        }
        return [];
    } catch (err) {
        console.error("getMinesResults error:", err);
        return [];
    }
};

