const initialState = {
  loading: false,
  history: [],
  error: null,
};

export const betHistoryReducer = (state = initialState, action) => {
  switch (action.type) {
    case "GET_BET_HISTORY_REQUEST":
      return { ...state, loading: true };

    case "GET_BET_HISTORY_SUCCESS":
      return {
        ...state,
        loading: false,
        history: action.payload,
      };

    case "GET_BET_HISTORY_FAIL":
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};