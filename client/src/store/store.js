import { configureStore } from "@reduxjs/toolkit";
import { userReducer } from "./userSlice";
import { betHistoryReducer } from "../reducers/betReducer";
import { betWinsReducer } from "../reducers/betWinsReducer";
import { currentReducer } from "../reducers/currentReducer";
import { notificationReducer } from "../reducers/notificationReducer";
import { myBetIdsReducer } from "../reducers/myBetIdsReducer";
import { slideIndexReducer } from "../reducers/slideIndexReducer";
import { upDownReducer } from "../reducers/upDownReducer";

const store = configureStore({
  reducer: {
    user: userReducer,
    betHistory: betHistoryReducer,
    betWins: betWinsReducer,
    currentbets: currentReducer,
    myBetIds: myBetIdsReducer,
    notifications: notificationReducer,
    slideIndex: slideIndexReducer,
    upDown: upDownReducer,
  },

  // 🔐 Disable Redux DevTools in production
  devTools: process.env.MY_REACRT_VAR !== "production",

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: true,
      serializableCheck: false,
      immutableCheck: false,
    }),
});

export default store;
