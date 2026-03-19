const initialState = {
  loading: false,
  data: [],
  error: null,
};

export const myBetHistoryReducer = (state = initialState, action) => {
  switch (action.type) {
    case "MY_BET_HISTORY_REQUEST":
      return { ...state, loading: true, error: null };

    case "MY_BET_HISTORY_SUCCESS":
      return {
        ...state,
        loading: false,
        data: action.payload, // 👈 saved here
      };

    case "MY_BET_HISTORY_FAIL":
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};