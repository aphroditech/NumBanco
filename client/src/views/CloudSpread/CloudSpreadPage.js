import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Grid, GridItem, HStack, Input, Text, VStack, useBreakpointValue } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
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
import CloudSpreadRealView from "./CloudSpreadItem/CloudSpreadRealView";

const multiplierForStep = (step) => 2 ** Number(step || 1);

/** Max amount when user clicks Max (capped; also limited by balance). */
const MAX_AMOUNT_USDT = 20;

/** Dark panel — neutral borders (no yellow outline). */
const S = {
  innerBg: "#262626",
  /** Subtle border for cards, inputs, buttons */
  border: "rgba(255, 255, 255, 0.14)",
  borderStrong: "rgba(255, 255, 255, 0.22)",
  panelBorder: "1px solid rgba(255, 255, 255, 0.12)",
  accentText: "#e2e8f0",
  playGreen: "#48bb78",
  playGreenHover: "#38a169",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.82)",
  radius: "10px",
};

/** Same idea as Gravity: stable keys for live feed rows. */
function dedupeCloudSpreadLive(rows) {
  const arr = Array.isArray(rows) ? rows : [];
  const map = new Map();
  for (const r of arr) {
    const betId = r?.betId;
    const amountRaw = r?.betAmount ?? r?.amount ?? "";
    const amountNum = Number(amountRaw);
    const amountKey = Number.isFinite(amountNum) ? amountNum.toFixed(2) : String(amountRaw);
    const key = betId
      ? `betId:${String(betId)}`
      : `${String(r?.userId ?? "")}|${String(r?.targetStep ?? "")}|${amountKey}`;
    if (!map.has(key)) map.set(key, r);
  }
  return [...map.values()];
}

export default function CloudSpreadPage() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.user.userInfo) || {};
  const canvasHeight = useBreakpointValue({ base: 300, sm: 340, md: 380 }) ?? 380;
  const [state, setState] = useState(null);
  const [amount, setAmount] = useState("1");
  const [myHistory, setMyHistory] = useState([]);
  const [selectedCloudInfo, setSelectedCloudInfo] = useState(null);
  const roundIdRef = useRef(null);
  const gameWrapRef = useRef(null);
  const gameSceneHeightRef = useRef(null);
  const [gameSceneHeight, setGameSceneHeight] = useState(null);

  useEffect(() => {
    onlineUser(7);
    return () => {
      offlineUser(7);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [snapshot, history] = await Promise.all([getCloudSpreadState(), getMyCloudSpreadHistory()]);
        if (!mounted) return;
        setState(snapshot);
        setMyHistory(history || []);
        if (snapshot?.roundId != null) roundIdRef.current = snapshot.roundId;
      } catch {
        toast.error("Failed to load Cloud Spread");
      }
    };
    load();

    return () => {
      mounted = false;
    };
  }, [user?.userId]);

  /** Refresh live users + state periodically (no Ably on Cloud Spread). */
  useEffect(() => {
    let id;
    const tick = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      try {
        const snap = await getCloudSpreadState();
        if (snap) setState((prev) => ({ ...(prev || {}), ...snap }));
      } catch {
        /* ignore */
      }
    };
    id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [user?.userId]);

  /** Match Dove: real-view column height ≈ canvas block height. */
  useEffect(() => {
    const node = gameWrapRef.current;
    if (!node) return undefined;

    const updateHeight = () => {
      const nextHeight = node.clientHeight || null;
      if (nextHeight !== gameSceneHeightRef.current) {
        gameSceneHeightRef.current = nextHeight;
        setGameSceneHeight(nextHeight);
      }
    };

    updateHeight();
    let rafId = null;
    const onResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateHeight();
        rafId = null;
      });
    };
    window.addEventListener("resize", onResize);
    const t1 = setTimeout(updateHeight, 100);
    const t2 = setTimeout(updateHeight, 400);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(t1);
      clearTimeout(t2);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [canvasHeight]);

  useEffect(() => {
    const rid = state?.roundId;
    const phase = state?.phase;
    if (rid == null) return;
    if (roundIdRef.current !== null && String(rid) !== String(roundIdRef.current) && phase === "betting") {
      setSelectedCloudInfo(null);
    }
    roundIdRef.current = rid;
  }, [state?.roundId, state?.phase]);

  const maxBetsPerRound = Number(state?.maxBetsPerRound ?? state?.totalSteps ?? 8);
  const myBetCount = Number(state?.myBetCount ?? 0);
  const phaseBetting = state?.phase === "betting";
  const canBet = phaseBetting && myBetCount < maxBetsPerRound;
  /** Next bet must use this step (one bet per step: 1→2→…→8). */
  const nextBetStep = myBetCount < maxBetsPerRound ? myBetCount + 1 : maxBetsPerRound;
  const selectedMultiplier = useMemo(() => multiplierForStep(nextBetStep), [nextBetStep]);
  const potentialWin = (Number(amount || 0) * selectedMultiplier).toFixed(2);

  /** Ball target: local pick after bet, or last cloud in round from API (refresh / return to page). */
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
      setSelectedCloudInfo({
        cloud: selectedCloud,
        step: selectedCloudStep,
        multiplier: selectedCloudMultiplier,
      });
      try {
        const snap = await getCloudSpreadState();
        if (snap) setState((prev) => ({ ...(prev || {}), ...snap }));
        const hist = await getMyCloudSpreadHistory();
        setMyHistory(hist || []);
      } catch {
        /* ignore */
      }
      toast.success(
        `Cloud #${selectedCloud} selected (x${selectedCloudMultiplier.toFixed(2)})`
      );
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to place bet");
    }
  };

  const handleCashOut = async () => {
    try {
      const data = await cashOutCloudSpread();
      if (data?.state) setState((prev) => ({ ...(prev || {}), ...data.state }));
      try {
        const hist = await getMyCloudSpreadHistory();
        setMyHistory(hist || []);
      } catch {
        /* ignore */
      }
      if (data?.alreadySettled) {
        toast.info(data?.message || "Round already ended");
      } else {
        toast.success("Cashed out. Round ended.");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to cash out");
    }
  };

  const bal = Number(user?.balance ?? 0);
  const liveRows = useMemo(() => dedupeCloudSpreadLive(state?.liveUsers), [state?.liveUsers]);

  return (
    <Box px={{ base: "8px", md: "16px" }} minH="100vh" mt="90px" w="100%" maxW="100%" overflowX="hidden" bg={S.pageBg} pb="24px">
      <Grid
        templateAreas={{
          base: `"board" "realview" "history"`,
          md: `"board realview" "history history"`,
        }}
        templateColumns={{ base: "1fr", md: "minmax(0,6fr) minmax(260px,1.35fr)" }}
        gap={{ base: "14px", md: "18px" }}
        w="100%"
        maxW="100%"
        alignItems="start"
      >
        <GridItem area="board" minW={0} maxW="100%">
          <Card
            p={{ base: "14px", md: "18px" }}
            maxW="100%"
            border={S.panelBorder}
            borderRadius={S.radius}
            boxShadow="0 8px 32px rgba(0,0,0,0.45)"
          >
            <CardBody flexDirection="column" alignItems="stretch">
              <VStack align="start" spacing="3" mb="12px">
                <Text color={S.text} fontSize="2xl" fontWeight="800" letterSpacing="-0.02em">
                  Cloud Spread
                </Text>
                <Text color={S.textMuted} fontSize="sm" fontWeight="600">
                  Step {state?.currentStep || 0}/{state?.totalSteps || 8} · Clouds {state?.currentClouds || 0} · Max x
                  {Number(state?.maxMultiplier || 1).toFixed(2)} · Plays {myBetCount}/{maxBetsPerRound} (one per step)
                </Text>
                {state?.phase === "result" && (
                  <Text color={S.accentText} fontWeight="700" fontSize="sm">
                    Round ended at step {state?.crashStep}
                  </Text>
                )}
                {selectedCloudInfo && (
                  <HStack
                    spacing="2"
                    flexWrap="wrap"
                    bg="rgba(255, 255, 255, 0.06)"
                    border="1px solid"
                    borderColor={S.border}
                    borderRadius="8px"
                    px="12px"
                    py="6px"
                  >
                    <Text color={S.text} fontWeight="800" fontSize="sm" bg="rgba(255,255,255,0.12)" px="8px" py="1px" borderRadius="6px">
                      x{Number(selectedCloudInfo.multiplier).toFixed(2)}
                    </Text>
                    <Text color={S.text} fontSize="sm" fontWeight="600">
                      Cloud #{selectedCloudInfo.cloud} · Step {selectedCloudInfo.step}
                    </Text>
                  </HStack>
                )}
                {!!(state?.selectedClouds || []).length && (
                  <Text color={S.textMuted} fontSize="xs" lineHeight="1.5">
                    Trail:{" "}
                    {(state.selectedClouds || [])
                      .slice(-8)
                      .map((idx) => {
                        const mul = Number(state?.cloudMultipliers?.[Number(idx) - 1] ?? 0);
                        return `#${idx}(x${mul.toFixed(2)})`;
                      })
                      .join(" → ")}
                  </Text>
                )}
              </VStack>

              <Box
                ref={gameWrapRef}
                w="100%"
                maxW="100%"
                borderColor={S.border}
                borderRadius={S.radius}
                overflow="hidden"
                lineHeight={0}
              >
                <CloudSpreadCanvas
                  currentStep={state?.currentStep || 0}
                  totalSteps={state?.totalSteps || 8}
                  cloudsPerStep={state?.cloudsPerStep || 10}
                  selectedCloudIndex={selectedCloudIndexForCanvas}
                  selectedCloudIndices={state?.selectedClouds || []}
                  cloudMultipliers={state?.cloudMultipliers || []}
                  height={canvasHeight}
                />
              </Box>

              <Grid
                mt="14px"
                templateColumns={{ base: "1fr", md: "1fr 1fr", lg: "1fr 1fr 1fr auto auto" }}
                gap="10px"
                alignItems="center"
              >
                <HStack spacing="8px" flexWrap="wrap">
                  <Text color={S.textMuted} fontSize="xs" fontWeight="700" whiteSpace="nowrap">
                    Amount:
                  </Text>
                  <Button
                    size="xs"
                    h="32px"
                    px="10px"
                    bg={S.innerBg}
                    border="1px solid"
                    borderColor={S.border}
                    color={S.text}
                    borderRadius="8px"
                    fontWeight="700"
                    onClick={() => setAmount("0.1")}
                  >
                    Min
                  </Button>
                  <Button
                    size="xs"
                    h="32px"
                    px="10px"
                    bg={S.innerBg}
                    border="1px solid"
                    borderColor={S.border}
                    color={S.text}
                    borderRadius="8px"
                    fontWeight="700"
                    onClick={() =>
                      setAmount(
                        String(
                          Math.min(MAX_AMOUNT_USDT, Math.max(0.1, Number.isFinite(bal) ? bal : 0.1))
                        )
                      )
                    }
                  >
                    Max
                  </Button>
                </HStack>

                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  bg={S.innerBg}
                  border="1px solid"
                  borderColor={S.border}
                  color={S.text}
                  h="40px"
                  borderRadius="8px"
                  fontWeight="700"
                  _placeholder={{ color: "rgba(255,255,255,0.35)" }}
                  _hover={{ borderColor: S.borderStrong }}
                  _focus={{ borderColor: S.borderStrong, boxShadow: "0 0 0 1px rgba(255,255,255,0.25)" }}
                  placeholder="USDT"
                />

                <HStack flexWrap="wrap" spacing="6px">
                  {["1", "5", "10", "20"].map((v) => (
                    <Button
                      key={v}
                      size="sm"
                      h="32px"
                      minW="44px"
                      bg={S.innerBg}
                      border="1px solid"
                      borderColor={S.border}
                      color={S.text}
                      borderRadius="8px"
                      fontWeight="800"
                      onClick={() => setAmount(v)}
                    >
                      {v}
                    </Button>
                  ))}
                </HStack>

                <HStack
                  minH="40px"
                  bg={S.innerBg}
                  border="1px solid"
                  borderColor={S.border}
                  borderRadius="8px"
                  px="12px"
                  minW="0"
                  flex="1"
                >
                  <Text color={S.text} fontSize="sm" fontWeight="700" noOfLines={2}>
                    {canBet
                      ? `Next: Step ${nextBetStep} (x${multiplierForStep(nextBetStep).toFixed(2)})`
                      : myBetCount >= maxBetsPerRound
                        ? `All ${maxBetsPerRound} steps done`
                        : "—"}
                  </Text>
                </HStack>

                <HStack
                  minH="40px"
                  bg={S.innerBg}
                  border="1px solid"
                  borderColor={S.border}
                  borderRadius="8px"
                  px="12px"
                >
                  <Text color={S.accentText} fontSize="sm" fontWeight="800">
                    Win: ${potentialWin}
                  </Text>
                </HStack>

                <Button
                  h="42px"
                  bg={S.playGreen}
                  color="white"
                  borderRadius="8px"
                  fontWeight="800"
                  fontSize="md"
                  _hover={{ bg: S.playGreenHover }}
                  _active={{ bg: "#2f855a" }}
                  _disabled={{ opacity: 0.45, cursor: "not-allowed" }}
                  onClick={handleBet}
                  isDisabled={!canBet}
                  title={
                    myBetCount >= maxBetsPerRound
                      ? `You played all ${maxBetsPerRound} steps — cash out or wait for the next round`
                      : `Bet uses step ${nextBetStep} (one play per step)`
                  }
                >
                  Play
                </Button>
                <Button
                  h="42px"
                  bg={S.innerBg}
                  color={S.text}
                  border="1px solid"
                  borderColor={S.border}
                  borderRadius="8px"
                  fontWeight="800"
                  _hover={{ bg: "#333333", borderColor: S.borderStrong }}
                  onClick={handleCashOut}
                  isDisabled={!phaseBetting}
                >
                  Cash Out
                </Button>
              </Grid>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem
          area="realview"
          minH={{ base: "auto", md: "250px" }}
          maxW={{ md: "340px" }}
          justifySelf={{ base: "stretch", md: "stretch" }}
          w="100%"
          display="flex"
        >
          <CloudSpreadRealView rows={liveRows} sceneHeight={gameSceneHeight} />
        </GridItem>

        <GridItem area="history" minW={0} maxW="100%">
          <CloudSpreadBetHistory results={myHistory} />
        </GridItem>
      </Grid>
    </Box>
  );
}
