import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Grid,
  GridItem,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useBreakpointValue,
  useDisclosure,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import Card from "components/Card/Card";
import CardBody from "components/Card/CardBody";
import { cashOutCloudSpread, getCloudSpreadState, placeCloudSpreadBet } from "action/CloudSpreadActions";
import { getUserData } from "action";
import { useAblyCloudSpreadLive } from "hooks/useAblyCloudSpreadLive";
import WinFireworksEffect from "components/Effects/WinFireworksEffect";
import truncateToTwo from "variables/truncateToTwo";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
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
  /** True while cashing out — disables Cash Out to prevent double clicks. */
  const [cashOutBusy, setCashOutBusy] = useState(false);
  const playBusyTimerRef = useRef(null);
  const { liveRows: liveFeedRows, isInitialLoading: isLiveFeedLoading } = useAblyCloudSpreadLive();
  const [showCashOutFireworks, setShowCashOutFireworks] = useState(false);
  const [cashOutFireworksAmount, setCashOutFireworksAmount] = useState("0.00");
  const cashOutFireworksTimeoutRef = useRef(null);
  /** x0.00 after ball lands: "BANG" + shake overlay */
  const [zeroBangActive, setZeroBangActive] = useState(false);
  const zeroBangTimeoutRef = useRef(null);
  /** Hide ball only after it lands on x0.00 (canvas calls onZeroMultiplierLand) */
  const [hideBallAfterZero, setHideBallAfterZero] = useState(false);
  const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();

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
      if (zeroBangTimeoutRef.current) {
        clearTimeout(zeroBangTimeoutRef.current);
        zeroBangTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const rid = state?.roundId;
    if (rid == null) return;
    if (roundIdRef.current !== null && String(rid) !== String(roundIdRef.current)) {
      setSelectedCloudInfo(null);
      setHideBallAfterZero(false);
    }
    roundIdRef.current = rid;
  }, [state?.roundId]);

  const maxBetsPerRound = Number(state?.maxBetsPerRound ?? state?.totalSteps ?? 8);
  const myBetCount = Number(state?.myBetCount ?? 0);
  const phaseBetting = state?.phase === "betting";
  const lastWasZeroMultiplier = Number(selectedCloudInfo?.multiplier) === 0;
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

  const handleZeroMultiplierLand = useCallback(() => {
    setHideBallAfterZero(true);
    setZeroBangActive(true);
    if (zeroBangTimeoutRef.current) clearTimeout(zeroBangTimeoutRef.current);
    zeroBangTimeoutRef.current = setTimeout(() => {
      setZeroBangActive(false);
      zeroBangTimeoutRef.current = null;
    }, 1400);
  }, []);

  const handleBet = async () => {
    if (playBusy) return;
    if (lastWasZeroMultiplier) {
      try {
        const data = await cashOutCloudSpread(dispatch);
        if (data?.state) setState(data.state);
        setSelectedCloudInfo(null);
        setHideBallAfterZero(false);
        toast.info("New bet is ready.");
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to prepare new bet");
      }
      return;
    }
    setPlayBusy(true);
    setHideBallAfterZero(false);
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
      const rawCloudMult = res?.selectedCloudMultiplier;
      const selectedCloudMultiplier =
        rawCloudMult != null && rawCloudMult !== "" && Number.isFinite(Number(rawCloudMult))
          ? Number(rawCloudMult)
          : multiplierForStep(selectedCloudStep);

      const nextSelectedCloudInfo = {
        cloud: selectedCloud,
        step: selectedCloudStep,
        multiplier: selectedCloudMultiplier,
      };

      try {
        const snap = await getCloudSpreadState();
        if (snap) {
          // Update both together to avoid multiple heavy renders right as animation starts
          setState(snap);
          setSelectedCloudInfo(nextSelectedCloudInfo);
        } else {
          setSelectedCloudInfo(nextSelectedCloudInfo);
        }
      } catch {
        setSelectedCloudInfo(nextSelectedCloudInfo);
      }
      if (selectedCloudMultiplier === 0) {
        toast.warning(`Cloud #${selectedCloud} — x0.00. Play again!`);
      } else {
        toast.success(`Cloud #${selectedCloud} selected (x${selectedCloudMultiplier.toFixed(2)})`);
      }
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
    if (cashOutBusy) return;
    const previewWin = Number(state?.cashOutPayoutPreview ?? 0);
    setCashOutBusy(true);
    try {
      const data = await cashOutCloudSpread(dispatch);
      if (data?.state) setState(data.state);
      setSelectedCloudInfo(null);
      setHideBallAfterZero(false);
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
    } finally {
      setCashOutBusy(false);
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
        <GridItem area="board" minW={0} maxW="100%" display="flex" flexDirection="column">
          <Card
            h="100%"
            p={{ base: "14px", md: "18px" }}
            maxW="100%"
            border={S.panelBorder}
            borderRadius={S.radius}
            boxShadow="none"
          >
            <CardBody flexDirection="column" alignItems="stretch">
              <Box position="absolute" top="0" right="0" zIndex={2}>
                <IconButton
                  aria-label="How to play"
                  icon={<HelpOutlineIcon style={{ fontSize: 24 }} />}
                  size="md"
                  bg="transparent"
                  color="#00d4ff"
                  borderRadius="50%"
                  _hover={{ bg: "rgba(255,255,255,0.1)"}}
                  onClick={onHelpOpen}
                />
              </Box>
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
                {/* Hidden per request: selected cloud badge and trail text */}
              </VStack>

              <Box
                w="100%"
                maxW="100%"
                borderColor={S.border}
                borderRadius={S.radius}
                overflow="hidden"
                lineHeight={0}
                position="relative"
              >
                <style>{`
                  @keyframes cloud-spread-zero-shake {
                    0%, 100% { transform: translate(0, 0); }
                    12% { transform: translate(-8px, 3px); }
                    24% { transform: translate(8px, -3px); }
                    36% { transform: translate(-6px, -2px); }
                    48% { transform: translate(6px, 2px); }
                    60% { transform: translate(-4px, 1px); }
                    72% { transform: translate(4px, -1px); }
                    84% { transform: translate(-2px, 0); }
                  }
                  @keyframes cloud-spread-bang-pop {
                    0% { transform: translate(-50%, -50%) scale(0.35); opacity: 0; }
                    18% { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
                    55% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1.12); opacity: 0; }
                  }
                `}</style>
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
                  <Box
                    position="relative"
                    animation={zeroBangActive ? "cloud-spread-zero-shake 0.55s ease-out" : undefined}
                  >
                    <CloudSpreadCanvas
                      currentStep={state?.currentStep || 0}
                      totalSteps={state?.totalSteps || 8}
                      cloudsPerStep={state?.cloudsPerStep || 10}
                      selectedCloudIndex={selectedCloudIndexForCanvas}
                      selectedCloudIndices={state?.selectedClouds || []}
                      cloudMultipliers={state?.cloudMultipliers || []}
                      height={canvasHeight}
                      hideBall={hideBallAfterZero}
                      onZeroMultiplierLand={handleZeroMultiplierLand}
                    />
                    {zeroBangActive && (
                      <Text
                        position="absolute"
                        left="50%"
                        top="42%"
                        transform="translate(-50%, -50%)"
                        fontSize={{ base: "56px", md: "76px" }}
                        fontWeight="900"
                        letterSpacing="0.12em"
                        color="#ff3b30"
                        textShadow="0 0 28px rgba(255,59,48,0.85), 0 4px 0 rgba(0,0,0,0.5)"
                        pointerEvents="none"
                        zIndex={6}
                        userSelect="none"
                        sx={{
                          animation: "cloud-spread-bang-pop 1.35s ease-out forwards",
                          fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
                        }}
                      >
                        BANG
                      </Text>
                    )}
                  </Box>
                )}
              </Box>

              <Grid
                mt="14px"
                templateColumns={{ base: "1fr", lg: "minmax(0,1fr) minmax(220px, 320px)" }}
                gap="12px"
                alignItems="stretch"
              >
                <VStack align="center" spacing="8px" minW={0}>
                  <HStack spacing="8px" flexWrap="wrap" justify="center" w="100%">
                    <Button
                      size="xs"
                      h="36px"
                      px="14px"
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
                      h="36px"
                      maxW="140px"
                      borderRadius="8px"
                      textAlign="center"
                      fontWeight="700"
                      _placeholder={{ color: "rgba(255,255,255,0.35)" }}
                      _hover={{ borderColor: S.borderStrong }}
                      _focus={{ borderColor: S.borderStrong, boxShadow: "0 0 0 1px rgba(255,255,255,0.25)" }}
                      placeholder="0.1"
                    />
                    <Button
                      size="xs"
                      h="36px"
                      px="14px"
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

                  <HStack flexWrap="wrap" spacing="6px" justify="center" w="100%">
                    {["1", "5", "10", "20"].map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        h="34px"
                        minW="50px"
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

                </VStack>

                <VStack align="stretch" spacing="8px" w="100%" maxW={{ lg: "320px" }} justify="flex-end" justifySelf={{ base: "stretch", lg: "end" }}>
                  {myBetCount > 0 ? (
                    <HStack spacing="8px" w="100%" flexWrap="wrap">
                      <Button
                        h="56px"
                        flex={{ base: "1 1 100%", lg: "1 1 0" }}
                        bg={S.playGreen}
                        color="white"
                        borderRadius="10px"
                        fontWeight="800"
                        fontSize="xl"
                        whiteSpace="nowrap"
                        _hover={{ bg: S.playGreenHover }}
                        _active={{ bg: "#2f855a" }}
                        _disabled={{ opacity: 0.45, cursor: "not-allowed" }}
                        onClick={handleBet}
                        isDisabled={playBusy || (!canBet && !lastWasZeroMultiplier)}
                        isLoading={playBusy}
                      >
                        {lastWasZeroMultiplier ? "Play again!" : "Play"}
                      </Button>
                      <Button
                        h="56px"
                        flex={{ base: "1 1 100%", lg: "1 1 0" }}
                        minW={{ base: "100%", lg: "170px" }}
                        bg={S.innerBg}
                        color={S.text}
                        border="1px solid"
                        borderColor={S.border}
                        borderRadius="8px"
                        fontWeight="800"
                        fontSize="md"
                        px="10px"
                        whiteSpace="nowrap"
                        _hover={{ bg: "#333333", borderColor: S.borderStrong }}
                        onClick={handleCashOut}
                        isDisabled={!phaseBetting || lastWasZeroMultiplier || cashOutBusy}
                        isLoading={cashOutBusy}
                        title={
                          lastWasZeroMultiplier
                            ? "Cash out disabled after x0.00 — play again first"
                            : "End round and collect payout"
                        }
                      >
                        {`Cash Out $${potentialWin}`}
                      </Button>
                    </HStack>
                  ) : (
                    <Button
                      h="56px"
                      bg={S.playGreen}
                      color="white"
                      borderRadius="10px"
                      fontWeight="800"
                      fontSize="2xl"
                      _hover={{ bg: S.playGreenHover }}
                      _active={{ bg: "#2f855a" }}
                      _disabled={{ opacity: 0.45, cursor: "not-allowed" }}
                      onClick={handleBet}
                      isDisabled={!canBet || playBusy}
                      isLoading={playBusy}
                    >
                      Start
                    </Button>
                  )}
                </VStack>

              </Grid>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem area="live" minW={0} maxW="100%" display="flex" flexDirection="column" minH={0} alignSelf="stretch">
          {isLiveFeedLoading ? (
            <Card
              p="14px"
              h="100%"
              minH={{ base: "180px", xl: "0" }}
              border={S.panelBorder}
              borderRadius="14px"
              boxShadow="none"
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
      <Modal isOpen={isHelpOpen} onClose={onHelpClose} size="md" isCentered>
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent bg="#2a2d2e" border="1px solid #00d4ff">
          <ModalHeader color="white">Cloud Spread</ModalHeader>
          <ModalCloseButton color="#fff" _hover={{ color: S.playGreen }} />
          <ModalBody pb="6">
            <VStack align="start" spacing="3">
              <Text color="#00d4ff" fontWeight="700" fontSize="sm">
                How to play
              </Text>
              <Text color={S.textMuted} fontSize="sm" lineHeight="1.65">
                1) Click Start to pay your stake and begin at step 1.
              </Text>
              <Text color={S.textMuted} fontSize="sm" lineHeight="1.65">
                2) Click Play to move to the next step. One cloud is selected each step.
              </Text>
              <Text color={S.textMuted} fontSize="sm" lineHeight="1.65">
                3) The maximum multiplier increases every step (x2, x4, x8, x16, …).
              </Text>
              <Text color={S.textMuted} fontSize="sm" lineHeight="1.65">
                4) If the selected cloud is x0.00, the round ends immediately.
              </Text>
              <Text color={S.textMuted} fontSize="sm" lineHeight="1.65">
                5) Click Cash Out anytime before x0.00 to collect your current payout.
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
