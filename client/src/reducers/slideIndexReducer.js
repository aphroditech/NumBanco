const initialState = {
  index: 0,
};

export const slideIndexReducer = (state = initialState, action) => {
  switch (action.type) {
    case "SET_SLIDE_INDEX":
      return {
        ...state,
        index: action.payload,
      };

    default:
      return state;
  }
};