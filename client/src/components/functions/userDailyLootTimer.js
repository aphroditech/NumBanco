import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { getClickData } from "action/LotteryActions";

export default function useDailyLootTimer(user) {
    console.log("Daily Loot Timer Started");

    const dispatch = useDispatch();
    const timerRef = useRef(null);
    const userRef = useRef(user);

    // Keep userRef in sync with user prop
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        // Clear timer if user logs out
        if (!user) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        let remaining;

        const start = async () => {
            // Check user still exists before making API call
            if (!userRef.current) {
                return;
            }

            try {
                remaining = await getClickData(null, dispatch, true);

                // Check again after async call completes
                if (!userRef.current) {
                    return;
                }

                // Ensure remaining is a valid number
                if (remaining === undefined || remaining === null || isNaN(remaining)) {
                    console.error("Invalid remaining time received:", remaining);
                    remaining = 0; // Default to 0 if invalid
                }

                dispatch({
                    type: "SET_DAILY_LOOT_TIMER",
                    payload: remaining,
                });

                if (remaining <= 0) {
                    return;
                }

                timerRef.current = setInterval(() => {
                    // Check user still exists on each interval tick
                    if (!userRef.current) {
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                        }
                        return;
                    }

                    remaining -= 1000;

                    dispatch({
                        type: "SET_DAILY_LOOT_TIMER",
                        payload: remaining,
                    });

                    if (remaining <= 0) {
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                        }
                    }
                }, 1000);
            } catch (err) {
                // Silently handle 401 errors (user logged out)
                if (err.response?.status === 401) {
                    // User logged out, clear timer
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    return;
                }
                // For other errors, log but don't crash
                console.error("Error fetching daily loot timer:", err);
            }
        };

        start();

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [user,dispatch]);
}
