import React, { useMemo, useRef, useLayoutEffect, useState, useCallback } from "react";
import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import { ALPHA_TREE_STEP_LETTERS } from "constants/alphaTreeSteps";

/**
 * 3-row tree layout (matches game steps):
 *       B   E   H   K   N   Q   T   W
 *   A   C   F   I   L   O   R   U   X   Z
 *       D   G   J   M   P   S   V   Y
 */
const ROW_TOP = ["", "B", "E", "H", "K", "N", "Q", "T", "W", ""];
const ROW_MID = ["A", "C", "F", "I", "L", "O", "R", "U", "X", "Z"];
const ROW_BOT = ["", "D", "G", "J", "M", "P", "S", "V", "Y", ""];

const EPS = 1e-9;

/** Line color by step result: bust 0 → red | (0.1,1) → blue | (1, max) → yellow */
export function lineColorForStepValue(v) {
    const x = Number(v);
    if (!Number.isFinite(x) || x <= EPS) return "#E74C3C";
    if (x < 1 - EPS) return "#00D4FF";
    return "#FFD700";
}

/** Build fan segments: from parent letter → each option at this step, with meta for draw */
function buildBranchSegmentMeta(pathSteps) {
    const list = [];
    for (const entry of pathSteps) {
        if (!entry.letterResults || entry.step < 2) continue;
        const step = entry.step;
        const allowed = ALPHA_TREE_STEP_LETTERS[step - 1];
        if (!allowed?.length) continue;

        let fromLetter;
        if (step === 2) {
            fromLetter = "A";
        } else if (step === 10) {
            fromLetter = pathSteps.find((p) => p.step === 9)?.letter;
        } else {
            fromLetter = pathSteps.find((p) => p.step === step - 1)?.letter;
        }
        if (!fromLetter) continue;

        for (const letter of allowed) {
            const v = entry.letterResults[letter];
            if (typeof v !== "number") continue;
            const emphasized = entry.letter === letter;
            const color = lineColorForStepValue(v);
            list.push({
                key: `s${step}-${fromLetter}-${letter}`,
                from: fromLetter,
                to: letter,
                color,
                emphasized,
            });
        }
    }
    return list;
}

function useBranchLines(pathSteps, containerRef, letterRefs) {
    const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
    const [segments, setSegments] = useState([]);

    const measure = useCallback(() => {
        const wrap = containerRef.current;
        if (!wrap) return;
        const br = wrap.getBoundingClientRect();
        setSvgSize({ w: br.width, h: br.height });

        const meta = buildBranchSegmentMeta(pathSteps);
        const resolved = meta
            .map((seg) => {
                const elFrom = letterRefs.current[seg.from];
                const elTo = letterRefs.current[seg.to];
                if (!elFrom || !elTo) return null;
                const crFrom = elFrom.getBoundingClientRect();
                const crTo = elTo.getBoundingClientRect();
                return {
                    ...seg,
                    x1: crFrom.left + crFrom.width / 2 - br.left,
                    y1: crFrom.top + crFrom.height / 2 - br.top,
                    x2: crTo.left + crTo.width / 2 - br.left,
                    y2: crTo.top + crTo.height / 2 - br.top,
                };
            })
            .filter(Boolean);

        resolved.sort((a, b) => {
            if (a.emphasized === b.emphasized) return 0;
            return a.emphasized ? 1 : -1;
        });
        setSegments(resolved);
    }, [pathSteps, containerRef, letterRefs]);

    useLayoutEffect(() => {
        measure();
        const id2 = requestAnimationFrame(() => requestAnimationFrame(measure));
        window.addEventListener("resize", measure);
        return () => {
            window.removeEventListener("resize", measure);
            cancelAnimationFrame(id2);
        };
    }, [measure]);

    return { svgSize, segments };
}

/** Game step (1–10) for diagram column index */
export function columnStepForDiagramCol(colIdx) {
    if (colIdx === 0) return 1;
    if (colIdx === 9) return 10;
    return colIdx + 1;
}

/** Which column (0–9) matches the current game step */
export function getAlphaTreeDiagramHighlightCol(phase, step) {
    if (phase === "await_a") return 0;
    if (phase === "await_cashout") return 9;
    if (phase === "playing" && step >= 2 && step <= 10) return step - 1;
    return 0;
}

export default function AlphaTreeLetterDiagram({ phase, step, pathSteps = [] }) {
    const highlightCol = useMemo(() => getAlphaTreeDiagramHighlightCol(phase, step), [phase, step]);
    const wrapRef = useRef(null);
    const letterRefs = useRef({});

    const setLetterRef = useCallback((letter, el) => {
        if (!letter) return;
        if (el) letterRefs.current[letter] = el;
        else delete letterRefs.current[letter];
    }, []);

    const { svgSize, segments } = useBranchLines(pathSteps, wrapRef, letterRefs);

    const showLines = svgSize.w > 0 && svgSize.h > 0 && segments.length > 0;

    return (
        <Box
            w="100%"
            mt="12px"
            pt="14px"
            borderTop="1px solid rgba(0, 212, 255, 0.25)"
        >
            <Text
                fontSize="10px"
                color="rgba(255,255,255,0.5)"
                textAlign="center"
                mb="10px"
                letterSpacing="0.06em"
            >
                A–Z path — branches:{" "}
                <Text as="span" color="#E74C3C">
                    0
                </Text>{" "}
                ·{" "}
                <Text as="span" color="#00D4FF">
                    (0.1,1)
                </Text>{" "}
                ·{" "}
                <Text as="span" color="#FFD700">
                    (1,max)
                </Text>
            </Text>
            <Box ref={wrapRef} position="relative" w="100%" overflow="visible" minH="88px">
                {showLines ? (
                    <svg
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: "100%",
                            height: "100%",
                            pointerEvents: "none",
                            zIndex: 0,
                            overflow: "visible",
                        }}
                        viewBox={`0 0 ${svgSize.w} ${svgSize.h}`}
                        preserveAspectRatio="none"
                    >
                        {segments.map((s) => (
                            <line
                                key={s.key}
                                x1={s.x1}
                                y1={s.y1}
                                x2={s.x2}
                                y2={s.y2}
                                stroke={s.color}
                                strokeWidth={s.emphasized ? 4 : 2}
                                opacity={s.emphasized ? 1 : 0.38}
                                strokeLinecap="round"
                            />
                        ))}
                    </svg>
                ) : null}
                <Flex
                    position="relative"
                    zIndex={1}
                    justify="space-between"
                    align="flex-start"
                    gap={{ base: "6px", sm: "10px" }}
                    flexWrap="nowrap"
                    overflowX="hidden"
                    pb="4px"
                    px="2px"
                    sx={{
                        // No horizontal scrolling (keep A→Z visible from the start).
                        "&::-webkit-scrollbar": { height: "0px" },
                    }}
                >
                    {ROW_MID.map((_, colIdx) => (
                        <LetterColumn
                            key={colIdx}
                            colIdx={colIdx}
                            top={ROW_TOP[colIdx]}
                            mid={ROW_MID[colIdx]}
                            bot={ROW_BOT[colIdx]}
                            highlight={highlightCol === colIdx}
                            pathSteps={pathSteps}
                            setLetterRef={setLetterRef}
                        />
                    ))}
                </Flex>
            </Box>
        </Box>
    );
}

function pickForStep(pathSteps, stepNum) {
    return pathSteps.find((p) => p.step === stepNum);
}

function LetterColumn({ colIdx, top, mid, bot, highlight, pathSteps, setLetterRef }) {
    const stepNum = columnStepForDiagramCol(colIdx);

    return (
        <Flex
            direction="column"
            align="center"
            justify="space-between"
            minW={{ base: "26px", sm: "30px" }}
            minH="76px"
            px="3px"
            py="4px"
            borderRadius="8px"
            borderWidth="0px"
            borderColor="transparent"
            bg="transparent"
            boxShadow="none"
        >
            <VStack spacing="1px" minH="64px" justify="space-between" w="100%">
                <LetterSlot
                    ch={top}
                    stepNum={stepNum}
                    pathSteps={pathSteps}
                    setLetterRef={setLetterRef}
                />
                <LetterSlot
                    ch={mid}
                    stepNum={stepNum}
                    pathSteps={pathSteps}
                    setLetterRef={setLetterRef}
                    gold={mid === "A" || mid === "Z"}
                />
                <LetterSlot
                    ch={bot}
                    stepNum={stepNum}
                    pathSteps={pathSteps}
                    setLetterRef={setLetterRef}
                />
            </VStack>
        </Flex>
    );
}

function LetterSlot({ ch, stepNum, pathSteps, setLetterRef, gold }) {
    const has = ch && ch.length > 0;
    const picked = pickForStep(pathSteps, stepNum);
    const lr = picked?.letterResults;

    let sub = null;
    let subColor = "rgba(255,255,255,0.45)";
    let subWeight = "normal";

    if (has && lr && typeof lr[ch] === "number") {
        sub = Number(lr[ch]).toFixed(2);
        subColor = picked.letter === ch ? "#FFD700" : "rgba(255,255,255,0.72)";
        subWeight = picked.letter === ch ? "bold" : "normal";
    } else if (has && picked) {
        if (picked.letter === ch) {
            sub = Number(picked.value).toFixed(2);
            subColor = "#FFD700";
            subWeight = "bold";
        } else {
            sub = "—";
            subColor = "rgba(255,255,255,0.35)";
        }
    }

    return (
        <Box
            ref={(el) => {
                if (ch) setLetterRef(ch, el);
            }}
            textAlign="center"
            minH="22px"
            borderRadius="4px"
            bg={picked?.letter === ch && has ? "rgba(255, 215, 0, 0.12)" : "transparent"}
            px="1px"
            py="0"
        >
            <Text
                fontSize={{ base: "10px", sm: "11px" }}
                fontWeight={picked?.letter === ch && has ? "black" : gold ? "black" : "semibold"}
                color={
                    has
                        ? picked?.letter === ch
                            ? "#FFD700"
                            : gold
                              ? "#FFD700"
                              : "rgba(255,255,255,0.88)"
                        : "transparent"
                }
                lineHeight="1.1"
                textAlign="center"
                userSelect="none"
            >
                {has ? ch : "\u00a0"}
            </Text>
            {sub != null ? (
                <Text
                    fontSize="9px"
                    lineHeight="1.1"
                    color={subColor}
                    fontWeight={subWeight}
                    mt="1px"
                >
                    {sub}
                </Text>
            ) : (
                <Text fontSize="9px" opacity={0} mt="1px">
                    &nbsp;
                </Text>
            )}
        </Box>
    );
}
