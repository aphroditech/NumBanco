import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useHistory } from "react-router-dom";
import {
    Flex,
    Grid,
} from "@chakra-ui/react";
import { useSelector } from "react-redux";
import axiosInstance from "../../api/axiosConfig";
import WinFireworksEffect from "components/Effects/WinFireworksEffect";
import BetChartGraph from "./BetItem/BetChartGraph";
import BetUser from "./BetItem/BetUser";
import BetHistory from "./BetItem/BetHistory";
import BetWins from "./BetItem/BetWins";
import Overview from "./BetItem/Overview";
import { getBetId } from "action/BetActions";
import { useAblyBetStart } from "hooks/useAblyBetStart";
import { useAblyInfoUpdates } from "hooks/useAblyInfoUpdates";
import Loading from "components/Loading/Loading";
import { useDispatch } from "react-redux";
import { setNotification } from "utils/localStorage";

function Tables() {

    const location = useLocation();
    const history = useHistory();
    const user = useSelector((state) => state.user.userInfo);
    const [betData, setBetData] = useState(null);
    const [betTicketData, setBetTicketData] = useState(null);
    const dispatch = useDispatch();

    const [isLoading, setIsLoading] = useState(true);
    useAblyInfoUpdates(true, false);
    const { tier, level } = useMemo(() => {
        const pathname = location.pathname;
        if (pathname.includes('/tierA')) return { tier: 'tierA', level: 0 };
        if (pathname.includes('/tierB')) return { tier: 'tierB', level: 1 };
        if (pathname.includes('/tierC')) return { tier: 'tierC', level: 2 };
        return { tier: null, level: null };
    }, [location.pathname]);

    const tiers = ["tierA", "tierB", "tierC"];
    const { betData: ablyBetData, betEndData } = useAblyBetStart(null, false, level);

    const effectDuration = 1200;
    const [winEffect, setWinEffect] = useState({ visible: false, amount: 0 });

    useEffect(() => {
        let isMounted = true;

        const fetchBetId = async () => {
            try {
                const result = await getBetId(level, history);
                if (!isMounted) return;
                if (result && result.BetData) {
                    setBetData({
                        level,
                        betId: result.BetData.betId,
                        differenceTime: result.differenceTime,
                        betData: result.betTicketData,
                    });
                    return;
                }
                if (result && result.betTicketData) {
                    setBetTicketData(result.betTicketData);
                }
            } catch (error) {
                console.error('Error fetching betId:', error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchBetId();

        return () => {
            isMounted = false;
        };
    }, [level]);

    useEffect(() => {
        if (!ablyBetData) return;
        if (level !== null && ablyBetData.level !== undefined && ablyBetData.level !== level) {
            return;
        }

        setBetData(prev => ({
            ...(prev || {}),
            ...ablyBetData,
            betStartTime: ablyBetData.betStartTime,
            betId: ablyBetData.betId,
            level: ablyBetData.level || prev?.level || level || 0,
        }));


    }, [ablyBetData, level]);

    useEffect(() => {
        if (!betEndData) return;

        (async () => {
            try {
                // Determine betId from sessionStorage (set on BET_START)
                const key = level === 0 ? 'currentBetIdA' : level === 1 ? 'currentBetIdB' : 'currentBetIdC';
                const betIdRaw = sessionStorage.getItem(key);
                const betId = betIdRaw ? Number(betIdRaw) : (betData?.betId || null);
                if (!betId) return;

                // Call server to get the bet record (this route requires auth via axiosInstance interceptor)
                const res = await axiosInstance.post('/bet/getMyHistory', { betId, level, type: 'users' });
                const betResults = res.data?.BetResults;
                if (!betResults || !betResults.betResult) return;

                // Ensure this returned record is for the current bet and that it has finished
                // (server saves `betEndTime` when a bet is finished)
                if (betResults.betId !== betId) return;
                if (!betResults.betEndTime) return;

                const { betResult } = betResults;

                // prize multipliers same as server-side: betOne 16, betTwo 8, betThree 4, betFour 2, betFive 1, betSix 0.2
                const multipliers = {
                    betOne: 16,
                    betTwo: 8,
                    betThree: 4,
                    betFour: 2,
                    betFive: 1,
                    betSix: 0.1,
                };

                const factor = level === 0 ? 1 : level === 1 ? 5 : 50;
                const meId = user?.userId || user?._id?.toString();

                let total = 0;
                for (const keyName of Object.keys(multipliers)) {
                    const arr = betResult[keyName]?.winUserId || [];
                    const count = arr.filter((id) => String(id) === String(meId)).length;
                    if (count > 0) {
                        total += count * multipliers[keyName] * factor;
                    }
                }

                // Add bonus for first place wins in specific tiers
                if (level === 1) { // tierB
                    const betOneWinners = betResult.betOne?.winUserId || [];
                    if (betOneWinners.length > 0 && String(betOneWinners[0]) === String(meId)) {
                        total += 10; // First place bonus for tierB
                    }
                } else if (level === 2) { // tierC
                    const betOneWinners = betResult.betOne?.winUserId || [];
                    if (betOneWinners.length > 0 && String(betOneWinners[0]) === String(meId)) {
                        total += 150; // First place bonus for tierC
                    }
                }

                // Round to one decimal for display
                const rounded = Number(total.toFixed(1));

                // Only show effect when user actually earned > 0 in this finished bet
                if (rounded > 0) {
                    setWinEffect({ visible: true, amount: rounded });
                    setNotification("You have earned " + "$" + rounded + " in bet " + betId + " of " + tiers[level], dispatch, "success")
                    setTimeout(() => setWinEffect((prev) => ({ ...prev, visible: false })), effectDuration + 200); // small buffer
                } else {
                    setWinEffect((prev) => ({ ...prev, visible: false }));
                }
            } catch (err) {
                console.error('Error fetching finished bet results', err);
            }
        })();

        // }, [betEndData, betData?.betId, dispatch, level, user]);
    }, [betEndData]);

    if (isLoading || (!betData && !betTicketData)) {
        return (
            <Loading />
        );
    }

    return (
        <Flex direction="column" pt={{ base: "120px", md: "75px" }}>
            <WinFireworksEffect
                isVisible={betEndData && winEffect.visible}
                totalEarn={winEffect.amount}
                duration={effectDuration}
            />
            <Overview level={level} betData={betData} />

            <Grid templateColumns={{ sm: "1fr", md: "1fr", "2lg": "1fr 1fr", "xl": "2fr 1fr" }} gap="18px" my="18px" templateRows="auto auto">
                <BetChartGraph
                    value={betData}
                    betTicketData={betTicketData}
                    betEndData={betEndData}
                />
                <BetUser value={betData?.betId} data={betData} />
                <BetHistory value={betData?.betId} />
                <BetWins value={betData?.betId} />
            </Grid>

            
        </Flex>
    );
}

export default Tables;
