import axiosInstance from "../api/axiosConfig";
import { setNotification } from "utils/localStorage";

// Action Types
export const UPDOWN_PLACE_BET_REQUEST = "UPDOWN_PLACE_BET_REQUEST";
export const UPDOWN_PLACE_BET_SUCCESS = "UPDOWN_PLACE_BET_SUCCESS";
export const UPDOWN_PLACE_BET_FAIL = "UPDOWN_PLACE_BET_FAIL";

export const UPDOWN_ADD_BET = "UPDOWN_ADD_BET";
export const UPDOWN_CLEAR_BETS = "UPDOWN_CLEAR_BETS";

/**
 * Place a bet on UpDown game
 * @param {number} roundId
 * @param {string} direction
 * @param {number} amount
 * @param {function} dispatch
 */
export const placeBetUpDown = async (roundId, direction, amount, dispatch) => {
    try {
        dispatch({ type: UPDOWN_PLACE_BET_REQUEST });

        const response = await axiosInstance.post("/updown/bet", {
            roundId,
            direction,
            amount,
        });

        if (response.data?.success) {
            dispatch({
                type: UPDOWN_PLACE_BET_SUCCESS,
                payload: response.data.data,
            });

            // Update user balance in Redux to reflect the bet deduction immediately
            dispatch({ type: "UPDATE_USER_BALANCE", payload: -amount });

            const side = direction === "up" ? "Up" : "Down";
            setNotification(`You selected ${side} in Round ${roundId}. Amount: $${amount}`, dispatch, "success");

            return response.data;
        } else {
            // throw new Error(response.data?.message || "Failed to place bet");
            return;
        }
    } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || "Failed to place bet";
        dispatch({ type: UPDOWN_PLACE_BET_FAIL, payload: errorMessage });
        // Suppress the specific server message for duplicate same-side bets so no notification appears
        const suppressed = [
            "You already have a bet on this side in this round",
        ];
        const shouldSuppress = suppressed.some((s) => typeof errorMessage === 'string' && errorMessage.includes(s));

        // Only log server response when it's not a suppressed/expected validation
        if (err.response && !shouldSuppress) {
            console.error("Bet placement response:", err.response.status, err.response.data);
        }

        if (!shouldSuppress) {
            setNotification(errorMessage, dispatch, "error");
        }
        return;
    }
};

export const addBetToDisplay = (bet, dispatch) => {
    dispatch({ type: UPDOWN_ADD_BET, payload: bet });
};

export const clearUpDownBets = (dispatch) => {
    dispatch({ type: UPDOWN_CLEAR_BETS });
};
