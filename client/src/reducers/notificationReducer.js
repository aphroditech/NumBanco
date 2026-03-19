const initialState = {
  notifications: [],
};

export const notificationReducer = (state = initialState, action) => {
    switch (action.type) {
        case "SET_NOTIFICATION":
            return {
                ...state,
                notifications: [...state.notifications, action.payload],
            };
        case "INITIALIZED_NOTIFICATION":
            return {
                ...state,
                notifications: action.payload,
            }
        case "REMOVE_NOTIFICATIONS":
            return {
                ...state,
                notifications: []
            }
        case "UPDATED_NOTIFICATION":
            return {
                ...state,
                notifications: action.payload
            }
        default:
        return state;
    }
};
