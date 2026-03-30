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
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
} from '@chakra-ui/react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import truncateToTwo from 'variables/truncateToTwo';

const SEGMENT_BORDER = '1px solid rgba(255, 255, 255, 0.1)';

/**
 * Mines-style amount row plus optional `quickPresets` (e.g. 1/5/10/20 chips under the field).
 */
export default function GamePillAmountField({
    value,
    onChange,
    onBlur,
    minAmount,
    maxAmount,
    disabled = false,
    onApplyAmount,
    placeholder,
    quickPresets,
}) {
    const half = () => {
        const cur = parseFloat(value || minAmount);
        const next = Math.max(minAmount, Math.min(maxAmount, cur / 2));
        onApplyAmount?.(next);
    };

    const dbl = () => {
        const cur = parseFloat(value || minAmount);
        const next = Math.min(maxAmount, cur * 2);
        onApplyAmount?.(next);
    };

    const sliderValRaw = parseFloat(value || minAmount);
    const sliderVal = Math.min(
        maxAmount,
        Math.max(minAmount, Number.isFinite(sliderValRaw) ? sliderValRaw : minAmount)
    );

    const ph = placeholder ?? Number(minAmount).toFixed(2);

    const presetRow =
        Array.isArray(quickPresets) && quickPresets.length > 0 ? (
            <HStack spacing="8px" mt="10px" w="100%">
                {quickPresets.map((pv) => (
                    <Button
                        key={pv}
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
                        onClick={() => onApplyAmount?.(pv)}
                    >
                        {String(pv)}
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
                <Input
                    bg="transparent"
                    border="transparent"
                    fontSize="xl"
                    fontWeight="bold"
                    h="auto"
                    p="0"
                    color="white"
                    type="text"
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={ph}
                    _focus={{ boxShadow: 'none' }}
                    flex="1"
                    minW={0}
                    isDisabled={disabled}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') e.target.blur();
                    }}
                />
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
                        _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                        onClick={dbl}
                        isDisabled={disabled}
                    >
                        ×2
                    </Button>
                    <Popover placement="bottom-end" closeOnBlur>
                        <PopoverTrigger>
                            <Box
                                borderLeft={SEGMENT_BORDER}
                                borderTopRightRadius="18px"
                                borderBottomRightRadius="18px"
                                overflow="hidden"
                                cursor={disabled ? 'not-allowed' : 'pointer'}
                                opacity={disabled ? 0.5 : 1}
                                pointerEvents={disabled ? 'none' : 'auto'}
                            >
                                <VStack spacing="0" align="center" h="100%">
                                    <IconButton
                                        aria-label="Open amount slider"
                                        icon={<KeyboardArrowDownIcon style={{ fontSize: 14 }} />}
                                        size="xs"
                                        h="100%"
                                        w="24px"
                                        minW="24px"
                                        bg="transparent"
                                        color="#fff"
                                        borderRadius="0"
                                        _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                        isDisabled={disabled}
                                    />
                                </VStack>
                            </Box>
                        </PopoverTrigger>
                        <PopoverContent
                            bg="#323738"
                            border="1px solid rgba(255, 255, 255, 0.2)"
                            borderRadius="12px"
                            w="300px"
                            _focus={{ boxShadow: 'none' }}
                        >
                            <PopoverBody p="16px">
                                <Flex align="center" gap="12px" w="100%">
                                    <Text
                                        color="#fff"
                                        fontSize="sm"
                                        fontWeight="bold"
                                        minW="30px"
                                        cursor="pointer"
                                        onClick={() => onApplyAmount?.(minAmount)}
                                    >
                                        Min
                                    </Text>
                                    <Box flex="1" position="relative">
                                        <Slider
                                            aria-label="Amount slider"
                                            min={minAmount}
                                            max={maxAmount}
                                            step={0.01}
                                            value={sliderVal}
                                            onChange={(val) => onApplyAmount?.(val)}
                                            focusThumbOnChange={false}
                                            isDisabled={disabled}
                                        >
                                            <SliderTrack bg="#2a2d2e" h="6px" borderRadius="3px">
                                                <SliderFilledTrack bg="transparent" />
                                            </SliderTrack>
                                            <SliderThumb
                                                bg="#fff"
                                                w="12px"
                                                h="24px"
                                                borderRadius="6px"
                                                border="none"
                                                boxShadow="none"
                                                _focus={{ boxShadow: 'none' }}
                                                position="relative"
                                            >
                                                <Box
                                                    position="absolute"
                                                    top="50%"
                                                    left="50%"
                                                    transform="translate(-50%, -50%)"
                                                    w="8px"
                                                    h="12px"
                                                    display="flex"
                                                    flexDirection="column"
                                                    justifyContent="space-between"
                                                    pointerEvents="none"
                                                >
                                                    <Box w="100%" h="1px" bg="rgba(0, 0, 0, 0.2)" />
                                                    <Box w="100%" h="1px" bg="rgba(0, 0, 0, 0.2)" />
                                                    <Box w="100%" h="1px" bg="rgba(0, 0, 0, 0.2)" />
                                                </Box>
                                            </SliderThumb>
                                        </Slider>
                                        <Box
                                            position="absolute"
                                            top="50%"
                                            left="0"
                                            right="0"
                                            transform="translateY(-50%)"
                                            h="6px"
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                            px="6px"
                                            pointerEvents="none"
                                        >
                                            {[0, 1, 2, 3, 4].map((i) => (
                                                <Box key={i} w="2px" h="2px" borderRadius="50%" bg="rgba(255, 255, 255, 0.3)" />
                                            ))}
                                        </Box>
                                    </Box>
                                    <Text
                                        color="#fff"
                                        fontSize="sm"
                                        fontWeight="bold"
                                        minW="30px"
                                        textAlign="right"
                                        cursor="pointer"
                                        onClick={() => {
                                            const m = truncateToTwo(maxAmount);
                                            const n = typeof m === 'number' ? m : parseFloat(m);
                                            onApplyAmount?.(Number.isFinite(n) ? n : maxAmount);
                                        }}
                                    >
                                        Max
                                    </Text>
                                </Flex>
                            </PopoverBody>
                        </PopoverContent>
                    </Popover>
                </HStack>
            </Flex>
        </GradientBorder>
        {presetRow}
        </Box>
    );
}
