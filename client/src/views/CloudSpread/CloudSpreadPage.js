import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Grid, GridItem, HStack, Input, Text, VStack } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import ablyClient from "../../ably/ablyClient";
import Card from "components/Card/Card";
import CardBody from "components/Card/CardBody";
import { offlineUser, onlineUser } from "action/BetActions";
import {
  cashOutCloudSpread,
  getCloudSpreadState,
  getMyCloudSpreadHistory,
  placeCloudSpreadBet,
} from "action/CloudSpreadActions";
import CloudSpreadCanvas from "./CloudSpreadItem/CloudSpreadCanvas";
import CloudSpreadBetHistory from "./CloudSpreadItem/CloudSpreadBetHistory";

const multiplierForStep = (step) => 2 ** Number(step || 1);

export default function CloudSpreadPage() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.user.userInfo) || {};
  const [state, setState] = useState(null);
  const [amount, setAmount] = useState("1");
  const [myHistory, setMyHistory] = useState([]);
  const [selectedCloudInfo, setSelectedCloudInfo] = useState(null);
  const roundIdRef = useRef(null);

  useEffect(() => {
    onlineUser(7);
    return () => {
      offlineUser(7);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [snapshot, history] = await Promise.all([getCloudSpreadState(), getMyCloudSpreadHistory()]);
        if (!mounted) return;
        setState(snapshot);
        setMyHistory(history || []);
      } catch {
        toast.error("Failed to load Cloud Spread");
      }
    })();

    const channel = ablyClient.channels.get("cloudSpreadGame");
    const onState = (msg) => {
      const data = msg?.data;
      if (!data) return;
      const incomingRoundId = data?.roundId;
      const isNewRound =
        typeof incomingRoundId !== "undefined" &&
        roundIdRef.current !== null &&
        String(incomingRoundId) !== String(roundIdRef.current);
      if (typeof incomingRoundId !== "undefined") {
        roundIdRef.current = incomingRoundId;
      }
      // Keep selected multiplier visible after click; clear only when a new round starts.
      if (isNewRound && data.phase === "betting") {
        setSelectedCloudInfo(null);
        setState((prev) => ({ ...(prev || {}), ...data, myBetCount: 0 }));
        return;
      }
      setState((prev) => ({ ...(prev || {}), ...data }));
    };
    const onBet = (msg) => {
      const data = msg?.data;
      if (!data) return;
      setState((prev) => {
        const merged = { ...(prev || {}), ...data };
        if (
          typeof data.userBetCount === "number" &&
          user?.userId != null &&
          String(data.userId) === String(user.userId)
        ) {
          merged.myBetCount = data.userBetCount;
        }
        return merged;
      });
    };
    const onResult = async () => {
      try {
        const history = await getMyCloudSpreadHistory();
        setMyHistory(history || []);
      } catch {
        // ignore
      }
    };
    channel.subscribe("CLOUD_SPREAD_STATE", onState);
    channel.subscribe("CLOUD_SPREAD_NEW_BET", onBet);
    channel.subscribe("CLOUD_SPREAD_RESULT", onResult);
    return () => {
      mounted = false;
      channel.unsubscribe("CLOUD_SPREAD_STATE", onState);
      channel.unsubscribe("CLOUD_SPREAD_NEW_BET", onBet);
      channel.unsubscribe("CLOUD_SPREAD_RESULT", onResult);
    };
  }, [user?.userId]);

  const maxBetsPerRound = Number(state?.maxBetsPerRound ?? state?.totalSteps ?? 8);
  const myBetCount = Number(state?.myBetCount ?? 0);
  const phaseBetting = state?.phase === "betting";
  const canBet = phaseBetting && myBetCount < maxBetsPerRound;
  /** Next bet must use this step (one bet per step: 1→2→…→8). */
  const nextBetStep = myBetCount < maxBetsPerRound ? myBetCount + 1 : maxBetsPerRound;
  const selectedMultiplier = useMemo(() => multiplierForStep(nextBetStep), [nextBetStep]);
  const potentialWin = (Number(amount || 0) * selectedMultiplier).toFixed(2);

  /** Ball target: local pick after bet, or last cloud in round from API/Ably (refresh / return to page). */
  const selectedCloudIndexForCanvas = useMemo(() => {
    const local = selectedCloudInfo?.cloud;
    if (local != null && local !== "") {
      const n = Number(local);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const trail = state?.selectedClouds;
    if (Array.isArray(trail) && trail.length > 0) {
      const last = trail[trail.length - 1];
      const n = Number(last);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }, [selectedCloudInfo?.cloud, state?.selectedClouds]);

  const handleBet = async () => {
    try {
      const res = await placeCloudSpreadBet(
        {
          amount: Number(amount),
          targetStep: nextBetStep,
        },
        dispatch
      );
      const selectedCloud = Number(res?.selectedCloud || 1);
      const selectedCloudStep = Number(res?.selectedCloudStep || 1);
      const selectedCloudMultiplier = Number(res?.selectedCloudMultiplier || 2);
      if (typeof res?.betsThisRound === "number") {
        setState((prev) => ({ ...(prev || {}), myBetCount: res.betsThisRound }));
      }
      setSelectedCloudInfo({
        cloud: selectedCloud,
        step: selectedCloudStep,
        multiplier: selectedCloudMultiplier,
      });
      toast.success(
        `Cloud #${selectedCloud} selected (x${selectedCloudMultiplier.toFixed(2)})`
      );
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to place bet");
    }
  };

  const handleCashOut = async () => {
    try {
      await cashOutCloudSpread();
      toast.success("Cashed out. Round ended.");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to cash out");
    }
  };

  return (
    <Box px={{ base: "8px", md: "16px" }} minH="100vh" mt="90px" w="100%">
      <Grid
        templateAreas={{ base: `"board" "history"`, xl: `"board board" "history history"` }}
        templateColumns="1fr"
        gap="10px"
      >
        <GridItem area="board">
          <Card p="10px" bg="rgba(20, 25, 30, 0.75)" border="1px solid rgba(255,255,255,0.06)">
            <CardBody flexDirection="column" alignItems="stretch">
              <VStack align="start" spacing="3" mb="10px">
                <Text color="white" fontSize="2xl" fontWeight="800">
                  Cloud Spread
                </Text>
                <Text color="rgba(255,255,255,0.85)">
                  Step {state?.currentStep || 0}/{state?.totalSteps || 8} | Clouds {state?.currentClouds || 0} |
                  Max x{Number(state?.maxMultiplier || 1).toFixed(2)} | Your plays: {myBetCount}/{maxBetsPerRound}{" "}
                  (one bet per step)
                </Text>
                {state?.phase === "result" && (
                  <Text color="#f6ad55" fontWeight="700">
                    Round ended at step {state?.crashStep}
                  </Text>
                )}
                {selectedCloudInfo && (
                  <Text color="#ffd166" fontWeight="700">
                    Selected cloud #{selectedCloudInfo.cloud} -> Step {selectedCloudInfo.step} -> x
                    {Number(selectedCloudInfo.multiplier).toFixed(2)}
                  </Text>
                )}
                {!!(state?.selectedClouds || []).length && (
                  <Text color="rgba(255,255,255,0.9)" fontSize="sm">
                    Selected cloud multipliers:{" "}
                    {(state.selectedClouds || [])
                      .slice(-8)
                      .map((idx) => {
                        const mul = Number(state?.cloudMultipliers?.[Number(idx) - 1] ?? 0);
                        return `#${idx}(x${mul.toFixed(2)})`;
                      })
                      .join(" -> ")}
                  </Text>
                )}
              </VStack>

              <CloudSpreadCanvas
                currentStep={state?.currentStep || 0}
                totalSteps={state?.totalSteps || 8}
                cloudsPerStep={state?.cloudsPerStep || 10}
                selectedCloudIndex={selectedCloudIndexForCanvas}
                selectedCloudIndices={state?.selectedClouds || []}
                cloudMultipliers={state?.cloudMultipliers || []}
                height={380}
              />

              <Grid mt="10px" templateColumns={{ base: "1fr", md: "1fr 1fr 1fr auto auto" }} gap="8px">
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  bg="#1b2025"
                  border="1px solid rgba(255,255,255,0.14)"
                  h="36px"
                  placeholder="Amount (USDT)"
                />
                <HStack
                  h="36px"
                  bg="#1b2025"
                  border="1px solid rgba(255,255,255,0.14)"
                  borderRadius="6px"
                  px="10px"
                  minW="0"
                >
                  <Text color="rgba(255,255,255,0.95)" fontSize="sm" noOfLines={1}>
                    {canBet
                      ? `Next bet: Step ${nextBetStep} (x${multiplierForStep(nextBetStep).toFixed(2)})`
                      : myBetCount >= maxBetsPerRound
                        ? `All ${maxBetsPerRound} steps played`
                        : `Step lock`}
                  </Text>
                </HStack>
                <HStack
                  h="36px"
                  bg="rgba(255,255,255,0.06)"
                  border="1px solid rgba(255,255,255,0.14)"
                  borderRadius="8px"
                  px="10px"
                >
                  <Text color="white" fontSize="sm">
                    Potential win: ${potentialWin}
                  </Text>
                </HStack>
                <Button
                  h="36px"
                  bg="linear-gradient(90deg, #60a5fa 0%, #38bdf8 100%)"
                  color="white"
                  onClick={handleBet}
                  isDisabled={!canBet}
                  title={
                    myBetCount >= maxBetsPerRound
                      ? `You played all ${maxBetsPerRound} steps — cash out or wait for the next round`
                      : `Bet uses step ${nextBetStep} (one play per step)`
                  }
                >
                  Bet Cloud Step
                </Button>
                <Button
                  h="36px"
                  bg="linear-gradient(90deg, #f97316 0%, #ef4444 100%)"
                  color="white"
                  onClick={handleCashOut}
                  isDisabled={!phaseBetting}
                >
                  Cash Out
                </Button>
              </Grid>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem area="history">
          <CloudSpreadBetHistory results={myHistory} />
        </GridItem>
      </Grid>
    </Box>
  );
}
