import { combineReducers } from "redux";
import { betHistoryReducer } from "./betReducer";
import { betWinsReducer } from "./betWinsReducer";
import { currentReducer } from "./currentReducer";
import { myBetIdsReducer } from "./myBetIdsReducer";
import { slideIndexReducer } from "./slideIndexReducer"; 
import { miningHistoryReducer } from "./miningHistoryReducer";
export default combineReducers({
  betHistory: betHistoryReducer,
  betWins: betWinsReducer, 
  currentBets: currentReducer,
  myBetIds: myBetIdsReducer,
  slideIndex: slideIndexReducer,
  miningHistory: miningHistoryReducer,
});
