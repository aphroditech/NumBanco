import axiosInstance from "../api/axiosConfig";

export const checkDoveWin = async (data, dispatch) => {
    try {
        const res = await axiosInstance.post('/dove/checkDoveWin', data); //  data contains bet, level, multiplier, isStart
        if (res.data.balance != null) {
            dispatch({
                type: 'SET_BALANCE',
                payload: res.data.balance
            });
        }
        return res.data.M1uXj3sZpU; // if win 1 or lose 0
    } catch (error) {
        console.error(error);
        return null;
    }
}

// Map UI difficulty to backend key (backend uses "hard" not "difficult")
export const getDifficultyKey = (difficulty) =>
    difficulty === "difficult" ? "hard" : difficulty;

export const getDovePrefix = async () => {
    try {
        const res = await axiosInstance.get('/dove/getPrefix');
        return res.data; // contains a, b value for easy, med, hard, ace
    } catch (error) {
        console.error(error);
        return null;
    }
}

export const getDoveView = async (history) => {
    try {
        const res = await axiosInstance.get('/dove/getDoveView');
        return res.data?.data ?? res.data ?? [];
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return [];
    }
};

export const getMyDoveHistory = async (history) => {
    try {
        const res = await axiosInstance.get('/dove/getMyDoveHistory');
        return res.data?.data ?? [];
    } catch (err) {
        console.error(err);
        if (err.response?.status === 401 && history) {
            history.push("/auth/landing");
        }
        return [];
    }
};

export const getDoveEarnings = async (data, dispatch) => {
    const winAmount = (data.bet || 0) * (data.multiplier || 1);
    dispatch({
        type: 'UPDATE_USER_BALANCE',
        payload: winAmount
    });
    try {
        const res = await axiosInstance.post('/dove/getDoveEarnings', data);
        dispatch({
            type: 'SET_BALANCE',
            payload: res.data.balance
        });
    } catch (error) {
        console.error(error);
        dispatch({
            type: 'UPDATE_USER_BALANCE',
            payload: -winAmount
        });
        return null;
    }
}

export const reportDoveFail = async (data) => {
    try {
        await axiosInstance.post('/dove/reportDoveFail', data);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}