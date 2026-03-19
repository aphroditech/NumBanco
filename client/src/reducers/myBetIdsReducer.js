import { GET_MY_BETIDS_REQUEST, GET_MY_BETIDS_SUCCESS, GET_MY_BETIDS_FAIL } from "action/BetActions";

const initialState = {
  loading: false,
  betIds: [],
  error: null,
};

export const myBetIdsReducer = (state = initialState, action) => {
  switch (action.type) {
    case GET_MY_BETIDS_REQUEST:
      return { ...state, loading: true };

    case GET_MY_BETIDS_SUCCESS:
      return { ...state, loading: false, betIds: action.payload };

    case GET_MY_BETIDS_FAIL:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};