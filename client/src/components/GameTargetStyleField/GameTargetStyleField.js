import React from 'react';
import {
    Box,
    Flex,
    Input,
    Button,
    HStack,
    VStack,
    IconButton,
    Text,
} from '@chakra-ui/react';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import GradientBorder from 'components/GradientBorder/GradientBorder';

const SEGMENT_BORDER = '1px solid rgba(255, 255, 255, 0.1)';

function presetChipLabel(pv) {
    const n = Number(pv);
    if (!Number.isFinite(n)) return String(pv);
    if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
    return n.toFixed(2);
}

/**
 * Pumping "Target"-style row: GradientBorder, /2, ×2, vertical step buttons.
 * Parent controls the string `value`; `applyNumeric` commits a clamped number (e.g. set state toFixed).
 * Optional `quickPresets` renders a chip row below (same look as amount presets).
 */
export default function GameTargetStyleField({
    value,
    onChange,
    onBlur,
    min,
    max,
    disabled = false,
    placeholder,
    suffix,
    step = 0.01,
    applyNumeric,
    quickPresets,
}) {
    const cur = () => {
        const n = parseFloat(value || min);
        return Number.isFinite(n) ? n : min;
    };

    /** Snap to cents so /2 ×2 and step arrows never leave long float tails in the input. */
    const snap2 = (x) => Math.round(Number(x) * 100) / 100;

    const half = () =>
        applyNumeric?.(snap2(Math.max(min, Math.min(max, cur() / 2))));
    const dbl = () =>
        applyNumeric?.(snap2(Math.max(min, Math.min(max, cur() * 2))));
    const up = () =>
        applyNumeric?.(snap2(Math.max(min, Math.min(max, cur() + step))));
    const down = () =>
        applyNumeric?.(snap2(Math.max(min, Math.min(max, cur() - step))));

    const downDisabled = disabled || cur() <= min + 1e-7;

    const presetRow =
        Array.isArray(quickPresets) && quickPresets.length > 0 ? (
            <HStack spacing="8px" mt="10px" w="100%">
                {quickPresets.map((pv) => (
                    <Button
                        key={String(pv)}
                        size="sm"
                        flex="1"
                        minW="0"
                        h="36px"
                        fontSize="xs"
                        fontWeight="700"
                        bg="#2a2d2e"
                        color="rgba(255,255,255,0.88)"
                        borderRadius="8px"
                        border="1px solid rgba(255,255,255,0.06)"
                        _hover={{ bg: '#35393b' }}
                        isDisabled={disabled}
                        onClick={() => applyNumeric?.(snap2(pv))}
                    >
                        {presetChipLabel(pv)}
                    </Button>
                ))}
            </HStack>
        ) : null;

    return (
        <Box w="100%">
        <GradientBorder borderRadius="20px" w="100%">
            <Flex
                w="100%"
                align="center"
                justify="space-between"
                bg="#323738"
                borderRadius="18px"
                h="46px"
                pl="16px"
                pr="0"
                minW={0}
            >
                <HStack flex="1" minW={0} spacing={1} align="center">
                    <Input
                        bg="transparent"
                        border="transparent"
                        fontSize="xl"
                        fontWeight="bold"
                        h="auto"
                        p="0"
                        color="white"
                        type="text"
                        inputMode="decimal"
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        placeholder={placeholder}
                        _focus={{ boxShadow: 'none' }}
                        flex="1"
                        minW={0}
                        isDisabled={disabled}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') e.target.blur();
                        }}
                    />
                    {suffix ? (
                        <Text
                            color="rgba(255,255,255,0.5)"
                            fontWeight="700"
                            fontSize="sm"
                            pr={1}
                            flexShrink={0}
                        >
                            {suffix}
                        </Text>
                    ) : null}
                </HStack>
                <HStack spacing="0" align="stretch" h="100%">
                    <Button
                        size="sm"
                        h="100%"
                        minW="36px"
                        px="8px"
                        bg="transparent"
                        color="#fff"
                        fontSize="xs"
                        fontWeight="normal"
                        borderRadius="0"
                        borderLeft={SEGMENT_BORDER}
                        _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                        onClick={half}
                        isDisabled={disabled}
                    >
                        /2
                    </Button>
                    <Button
                        size="sm"
                        h="100%"
                        minW="36px"
                        px="8px"
                        bg="transparent"
                        color="#fff"
                        fontSize="xs"
                        fontWeight="normal"
                        borderRadius="0"
                        borderLeft={SEGMENT_BORDER}
                        borderRight={SEGMENT_BORDER}
                        _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                        onClick={dbl}
                        isDisabled={disabled}
                    >
                        ×2
                    </Button>
                    <Box borderRadius="12px" overflow="hidden">
                        <VStack spacing="4px" align="center">
                            <IconButton
                                aria-label="Increase value"
                                icon={<KeyboardArrowUpIcon style={{ fontSize: 14 }} />}
                                size="xs"
                                h="18px"
                                w="24px"
                                minW="24px"
                                bg="transparent"
                                color="#fff"
                                borderRadius="0"
                                _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                onClick={up}
                                isDisabled={disabled}
                            />
                            <IconButton
                                aria-label="Decrease value"
                                icon={<KeyboardArrowDownIcon style={{ fontSize: 14 }} />}
                                size="xs"
                                h="18px"
                                w="24px"
                                minW="24px"
                                bg="transparent"
                                color="#fff"
                                borderRadius="0"
                                _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                onClick={down}
                                isDisabled={downDisabled}
                            />
                        </VStack>
                    </Box>
                </HStack>
            </Flex>
        </GradientBorder>
        {presetRow}
        </Box>
    );
}
