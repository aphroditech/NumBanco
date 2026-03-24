import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Grid, GridItem, HStack, Input, Text, VStack, useBreakpointValue } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import Card from "components/Card/Card";
import CardBody from "components/Card/CardBody";
import { cashOutCloudSpread, getCloudSpreadState, placeCloudSpreadBet } from "action/CloudSpreadActions";
import { getUserData } from "action";
import { useAblyCloudSpreadLive } from "hooks/useAblyCloudSpreadLive";
import WinFireworksEffect from "components/Effects/WinFireworksEffect";
import truncateToTwo from "variables/truncateToTwo";
import CloudSpreadCanvas from "./CloudSpreadItem/CloudSpreadCanvas";
import CloudSpreadBetHistory from "./CloudSpreadItem/CloudSpreadBetHistory";
import CloudSpreadLiveFeed from "./CloudSpreadItem/CloudSpreadLiveFeed";

const multiplierForStep = (step) => 2 ** Number(step || 1);

/** Max amount when user clicks Max (capped; also limited by balance). */
const MAX_AMOUNT_USDT = 20;

/** Must match `FLIGHT_MS` in `CloudSpreadCanvas.js` (ball arc duration). */
const BALL_FLIGHT_MS = 1120;

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

export default function CloudSpreadPage() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.user.userInfo) || {};
  const canvasHeight = useBreakpointValue({ base: 300, sm: 340, md: 380 }) ?? 380;
  const [state, setState] = useState(null);
  const [amount, setAmount] = useState("1");
  const [selectedCloudInfo, setSelectedCloudInfo] = useState(null);
  const roundIdRef = useRef(null);
  /** True while placing bet + ball flying — disables Play to prevent double bets. */
  const [playBusy, setPlayBusy] = useState(false);
  const playBusyTimerRef = useRef(null);
  const { liveRows: liveFeedRows, isInitialLoading: isLiveFeedLoading } = useAblyCloudSpreadLive();
  const [showCashOutFireworks, setShowCashOutFireworks] = useState(false);
  const [cashOutFireworksAmount, setCashOutFireworksAmount] = useState("0.00");
  const cashOutFireworksTimeoutRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        await getUserData(dispatch);
        const snapshot = await getCloudSpreadState();
        if (!mounted) return;
        setState(snapshot);
        if (snapshot?.roundId != null) roundIdRef.current = snapshot.roundId;
      } catch (e) {
        if (e?.response?.status === 401) {
          toast.error("Please log in to play Cloud Spread");
        } else {
          toast.error("Failed to load Cloud Spread");
        }
      }
    };
    load();

    return () => {
      mounted = false;
    };
  }, [user?.userId]);

  /** Rounds saved on user doc (`cloudSpreadHistory`) — newest first. */
  const myHistory = useMemo(() => {
    const h = user?.cloudSpreadHistory;
    if (!Array.isArray(h) || h.length === 0) return [];
    return [...h].sort((a, b) => {
      const ta = new Date(a.createAt || a.createdAt || 0).getTime();
      const tb = new Date(b.createAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [user?.cloudSpreadHistory]);

  useEffect(() => {
    return () => {
      if (playBusyTimerRef.current) {
        clearTimeout(playBusyTimerRef.current);
        playBusyTimerRef.current = null;
      }
      if (cashOutFireworksTimeoutRef.current) {
        clearTimeout(cashOutFireworksTimeoutRef.current);
        cashOutFireworksTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const rid = state?.roundId;
    if (rid == null) return;
    if (roundIdRef.current !== null && String(rid) !== String(roundIdRef.current)) {
      setSelectedCloudInfo(null);
    }
    roundIdRef.current = rid;
  }, [state?.roundId]);

  const maxBetsPerRound = Number(state?.maxBetsPerRound ?? state?.totalSteps ?? 8);
  const myBetCount = Number(state?.myBetCount ?? 0);
  const phaseBetting = state?.phase === "betting";
  const canBet = phaseBetting && myBetCount < maxBetsPerRound;
  /** Next bet must use this step (one bet per step: 1→2→…→8). */
  const nextBetStep = myBetCount < maxBetsPerRound ? myBetCount + 1 : maxBetsPerRound;
  const selectedMultiplier = useMemo(() => multiplierForStep(nextBetStep), [nextBetStep]);
  /** Stake × cloud mult product (cash-out). Before first paid play, estimate step 1 line only. */
  const potentialWin = useMemo(() => {
    const preview = state?.cashOutPayoutPreview;
    if (myBetCount > 0 && preview != null && Number.isFinite(Number(preview))) {
      return Number(preview).toFixed(2);
    }
    if (myBetCount === 0) {
      return (Number(amount || 0) * selectedMultiplier).toFixed(2);
    }
    return "0.00";
  }, [state?.cashOutPayoutPreview, myBetCount, amount, selectedMultiplier]);

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
    if (playBusy) return;
    setPlayBusy(true);
    try {
      const res = await placeCloudSpreadBet(
        {
          amount: myBetCount === 0 ? Number(amount) : 0,
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
        if (snap) setState(snap);
      } catch {
        /* ignore */
      }
      toast.success(
        `Cloud #${selectedCloud} selected (x${selectedCloudMultiplier.toFixed(2)})`
      );
      if (playBusyTimerRef.current) clearTimeout(playBusyTimerRef.current);
      playBusyTimerRef.current = setTimeout(() => {
        setPlayBusy(false);
        playBusyTimerRef.current = null;
      }, BALL_FLIGHT_MS);
    } catch (e) {
      setPlayBusy(false);
      if (playBusyTimerRef.current) {
        clearTimeout(playBusyTimerRef.current);
        playBusyTimerRef.current = null;
      }
      toast.error(e?.response?.data?.message || "Failed to place bet");
    }
  };

  const handleCashOut = async () => {
    const previewWin = Number(state?.cashOutPayoutPreview ?? 0);
    try {
      const data = await cashOutCloudSpread(dispatch);
      if (data?.state) setState(data.state);
      if (data?.alreadySettled) {
        toast.info(data?.message || "Round already ended");
      } else {
        toast.success("Cashed out. Round ended.");
        let winAmt = Number.isFinite(previewWin) ? previewWin : 0;
        const hist = data?.user?.cloudSpreadHistory;
        if (Array.isArray(hist) && hist.length > 0) {
          const last = hist[hist.length - 1];
          const w = Number(last?.win ?? last?.winAmount);
          if (Number.isFinite(w)) winAmt = w;
        }
        setCashOutFireworksAmount(truncateToTwo(Math.max(0, winAmt)));
        setShowCashOutFireworks(true);
        if (cashOutFireworksTimeoutRef.current) clearTimeout(cashOutFireworksTimeoutRef.current);
        cashOutFireworksTimeoutRef.current = setTimeout(() => {
          setShowCashOutFireworks(false);
          cashOutFireworksTimeoutRef.current = null;
        }, 2200);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to cash out");
    }
  };

  const bal = Number(user?.balance ?? 0);
  const isCloudsLoading = !state;

  return (
    <Box px={{ base: "8px", md: "16px" }} minH="100vh" mt="90px" w="100%" maxW="100%" overflowX="hidden" bg={S.pageBg} pb="24px">
      <WinFireworksEffect
        isVisible={showCashOutFireworks}
        totalEarn={cashOutFireworksAmount}
        duration={2200}
      />
      <Grid
        templateAreas={{
          base: `"board" "live" "history"`,
          xl: `"board live" "history history"`,
        }}
        templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) minmax(260px, 300px)" }}
        gap="14px"
        w="100%"
        maxW="100%"
        alignItems="stretch"
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
                  Pay once · then play each step free · Cash out to finish · Step {state?.currentStep || 0}/{state?.totalSteps || 8}{" "}
                  · Clouds {state?.currentClouds || 0} · Max x{Number(state?.maxMultiplier || 1).toFixed(2)} · Plays{" "}
                  {myBetCount}/{maxBetsPerRound}
                  {Number(state?.sessionStake) > 0 && (
                    <> · Stake ${Number(state.sessionStake).toFixed(2)}</>
                  )}
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
                w="100%"
                maxW="100%"
                borderColor={S.border}
                borderRadius={S.radius}
                overflow="hidden"
                lineHeight={0}
              >
                {isCloudsLoading ? (
                  <HStack
                    h={`${canvasHeight}px`}
                    align="center"
                    justify="center"
                    bg={S.innerBg}
                    border="1px solid"
                    borderColor={S.border}
                  >
                    <Text color={S.textMuted} fontSize="sm" fontWeight="700">
                      Loading clouds...
                    </Text>
                  </HStack>
                ) : (
                  <CloudSpreadCanvas
                    currentStep={state?.currentStep || 0}
                    totalSteps={state?.totalSteps || 8}
                    cloudsPerStep={state?.cloudsPerStep || 10}
                    selectedCloudIndex={selectedCloudIndexForCanvas}
                    selectedCloudIndices={state?.selectedClouds || []}
                    cloudMultipliers={state?.cloudMultipliers || []}
                    height={canvasHeight}
                  />
                )}
              </Box>

              <Grid
                mt="14px"
                templateColumns={{ base: "1fr", md: "1fr 1fr", lg: "1fr 1fr 1fr auto auto" }}
                gap="10px"
                alignItems="center"
              >
                <HStack spacing="8px" flexWrap="wrap">
                  <Text color={S.textMuted} fontSize="xs" fontWeight="700" whiteSpace="nowrap">
                    {myBetCount > 0 ? "Stake:" : "Pay once:"}
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
                    isDisabled={myBetCount > 0}
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
                    isDisabled={myBetCount > 0}
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
                  value={
                    myBetCount > 0 && state?.sessionStake != null
                      ? String(Number(state.sessionStake))
                      : amount
                  }
                  onChange={(e) => setAmount(e.target.value)}
                  isDisabled={myBetCount > 0}
                  title={myBetCount > 0 ? "Stake locked — next steps are free until cash out" : "Amount to pay on first play only"}
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
                  placeholder="USDT (first play)"
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
                      isDisabled={myBetCount > 0}
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
                  <Text color={S.accentText} fontSize="sm" fontWeight="800" title="Stake × product of cloud multipliers (paid once at first play)">
                    {myBetCount > 0 ? "Cash-out payout" : "If you start"}: ${potentialWin}
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
                  isDisabled={!canBet || playBusy}
                  isLoading={playBusy}
                  title={
                    playBusy
                      ? "Wait for the ball to land…"
                      : myBetCount >= maxBetsPerRound
                        ? `All ${maxBetsPerRound} steps done — cash out`
                        : myBetCount === 0
                          ? `Pay ${Number(amount || 0).toFixed(2)} USDT and play step ${nextBetStep}`
                          : `Free play — step ${nextBetStep}`
                  }
                >
                  {myBetCount === 0 ? "Start" : "Play"}
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
                  isDisabled={!phaseBetting || myBetCount === 0}
                  title={myBetCount === 0 ? "Pay and play at least once before cash out" : "End round and collect payout"}
                >
                  Cash Out
                </Button>
              </Grid>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem area="live" minW={0} maxW="100%" display="flex" flexDirection="column" minH={0} alignSelf="stretch">
          {isLiveFeedLoading ? (
            <Card
              p="14px"
              h={{ xl: "100%" }}
              minH={{ base: "180px", xl: "0" }}
              border={S.panelBorder}
              borderRadius="14px"
              boxShadow="0 8px 24px rgba(0,0,0,0.35)"
              bg="#2b2b2b"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text color={S.textMuted} fontSize="sm" fontWeight="700">
                Loading cloud history...
              </Text>
            </Card>
          ) : (
            <CloudSpreadLiveFeed rows={liveFeedRows} title="Cloud history" maxRows={15} />
          )}
        </GridItem>

        <GridItem area="history" minW={0} maxW="100%">
          <CloudSpreadBetHistory results={myHistory} />
        </GridItem>
      </Grid>
    </Box>
  );
}
