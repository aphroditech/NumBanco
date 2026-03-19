import React, { useMemo, useEffect } from "react";
import { Flex, Grid, Text } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import Card from "components/Card/Card";
import CardHeader from "components/Card/CardHeader";

import { getBetWins } from "action/BetActions";
import MyHistoryRow from "components/Tables/MyHistoryRow";

import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";

export default function BetWins({ value: BET_ID }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const history = useHistory();
  const Level = useMemo(() => {
    if (location.pathname.includes("/tierA")) return 0;
    if (location.pathname.includes("/tierB")) return 1;
    if (location.pathname.includes("/tierC")) return 2;
    return null;
  }, [location.pathname]);
  useEffect(() => {
    if (!BET_ID || Level === null) return;

    dispatch(
      getBetWins({
        betId: Number(BET_ID - 1),
        level: Level,
        type: "users",
        history,
      })
    );
  }, [BET_ID, Level, dispatch]);
  const { wins } = useSelector(
    (state) => state.betWins
  );
  return (
    <Grid>
      <Card>
        <CardHeader mb="20px" ps="22px">
          <Flex direction="column" alignSelf="flex-start">
            <Text color="#00D4FF"
              fontWeight="bold" m="auto" width="auto" fontSize="25px" display="flex" alignItems="center" justifyContent="center" marginBottom="30px">
              <EmojiEventsRoundedIcon style={{ fontSize: "40px", color: "#00D4FF", marginRight: "8px" }} />Bet Wins
            </Text>
            {wins !== null && <MyHistoryRow value={wins} level={Level} />}
          </Flex>
        </CardHeader>
      </Card>
    </Grid>
  );
}
