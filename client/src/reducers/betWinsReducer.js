import {
  BET_WINS_REQUEST,
  BET_WINS_SUCCESS,
  BET_WINS_FAIL,
} from "../action/BetActions";

const SET_SLIDE_INDEX = "SET_SLIDE_INDEX"

const initialState = {
  loading: false,
  wins: null,
  error: null,
};

export const betWinsReducer = (state = initialState, action) => {
  switch (action.type) {
    case BET_WINS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case BET_WINS_SUCCESS:
      return {
        ...state,
        loading: false,
        wins: action.payload, // ✅ DATA FROM BACKEND
      };

    case BET_WINS_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };


    default:
      return state;
  }
};
