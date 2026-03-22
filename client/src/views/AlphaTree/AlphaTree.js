import React from "react";
import ForestIcon from '@mui/icons-material/Forest';


export default function AlphaTreePage() {
    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            <Result />
            <Grid
                templateAreas={{
                    sm: '"panel" "game" "empty"',
                    md: '"panel empty" "game game"',
                    '1550px': '"panel game empty"'
                }}
                templateColumns={{
                    sm: '1fr',
                    md: '1fr 1fr',
                    '1550px': '3fr 6fr 2fr'
                }}
                templateRows={{
                    base: 'auto auto auto',
                    md: 'auto auto',
                    '1550px': 'auto'
                }}
                gap={{ base: '16px', md: '24px' }}
                w="100%"
            >
                <GridItem area="panel" minW={"350px"}>
                    <Card pt="30px" pb="22px" px="22px" overflow="visible" minH="450px">
                        <Box position="absolute" top="0px" right="0px" zIndex={2}>
                            <IconButton
                                aria-label="Help"
                                icon={<HelpOutlineIcon style={{ fontSize: 24 }} />}
                                size="md"
                                bg="transparent"
                                color="#00d4ff"
                                borderRadius="50%"
                                _hover={{ bg: 'rgba(255,255,255,0.1)', color: '#00D4FF' }}
                            />
                        </Box>
                        <CardHeader mb="20px">
                            <Flex direction="column" alignSelf="flex-start">
                                <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                                    <ForestIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />Panel
                                </Text>
                            </Flex>
                        </CardHeader>
                        <CardBody overflow="visible" display="flex" alignItems="center" justifyContent="center" minH="100%">
                            <VStack spacing="24px" align="center" w="100%">
                                <FormControl w="100%" maxW={{ base: "100%", sm: "300px" }}>
                                    <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                        Bet
                                    </FormLabel>
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
                                        >
                                            <Input
                                                name="amount"
                                                bg="transparent"
                                                border="transparent"
                                                fontSize="xl"
                                                fontWeight="bold"
                                                h="auto"
                                                p="0"
                                                color="white"
                                                type="text"
                                                inputMode="decimal"
                                                min={MIN_AMOUNT}
                                                max={maxAmount}
                                                step="0.01"
                                                value={amount}
                                                onChange={handleAmountChange}
                                                onBlur={handleAmountBlur}
                                                placeholder="0.10"
                                                _focus={{ boxShadow: 'none' }}
                                                flex="1"
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
                                                    borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                    onClick={() => {
                                                        const current = parseFloat(amount || MIN_AMOUNT);
                                                        const newValue = Math.min(maxAmount, current / 2);
                                                        setAmount(Math.max(MIN_AMOUNT, newValue).toFixed(2));
                                                    }}
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
                                                    borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                    onClick={() => {
                                                        const current = parseFloat(amount || MIN_AMOUNT);
                                                        const newValue = Math.min(maxAmount, current * 2);
                                                        setAmount(newValue.toFixed(2));
                                                    }}
                                                >
                                                    ×2
                                                </Button>
                                                <Popover placement="bottom-end" closeOnBlur={true}>
                                                    <PopoverTrigger>
                                                        <Box
                                                            borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                            borderTopRightRadius="18px"
                                                            borderBottomRightRadius="18px"
                                                            overflow="hidden"
                                                            cursor="pointer"
                                                        >
                                                            <VStack spacing="0" align="center" h="100%">
                                                                <IconButton
                                                                    aria-label="Open slider dropdown"
                                                                    icon={<KeyboardArrowDownIcon style={{ fontSize: 14 }} />}
                                                                    size="xs"
                                                                    h="100%"
                                                                    w="24px"
                                                                    minW="24px"
                                                                    bg="transparent"
                                                                    color="#fff"
                                                                    borderRadius="0"
                                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
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
                                                                    onClick={() => setAmount(MIN_AMOUNT.toFixed(2))}
                                                                >
                                                                    Min
                                                                </Text>
                                                                <Box flex="1" position="relative">
                                                                    <Slider
                                                                        aria-label="Amount slider"
                                                                        min={MIN_AMOUNT}
                                                                        max={maxAmount}
                                                                        step={0.01}
                                                                        value={parseFloat(amount || MIN_AMOUNT)}
                                                                        onChange={(val) => setAmount(val.toFixed(2))}
                                                                        focusThumbOnChange={false}
                                                                    >
                                                                        <SliderTrack
                                                                            bg="#2a2d2e"
                                                                            h="6px"
                                                                            borderRadius="3px"
                                                                        >
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
                                                                    {/* Indicator dots */}
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
                                                                            <Box
                                                                                key={i}
                                                                                w="2px"
                                                                                h="2px"
                                                                                borderRadius="50%"
                                                                                bg="rgba(255, 255, 255, 0.3)"
                                                                            />
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
                                                                    onClick={() => setAmount(maxAmount.toFixed(2))}
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
                                </FormControl>
                                <FormControl w="100%" maxW={{ base: "100%", sm: "300px" }} mt="5">
                                    <Grid templateColumns="1fr 1fr" gap="8px">
                                        <ClickButton
                                            w="100%"
                                            h="46px"
                                            fontSize={{ base: 'md', sm: 'md' }}
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg={"#00D4FF"}
                                            color="#fff"
                                            border={"1px solid rgba(0, 212, 255, 0.3)"}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            onClick={
                                                () => {
                                                    setBet(1)
                                                    handleBet(1)
                                                }
                                            }
                                            label="BET"
                                        />
                                        <ClickButton
                                            w="100%"
                                            h="46px"
                                            fontSize={{ base: 'md', sm: 'md' }}
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg={isMultiBetActive ? "#E74C3C" : "#00D4FF"}
                                            color="#fff"
                                            border={isMultiBetActive ? "2px solid #E74C3C" : bet === 2 ? "2px solid #00D4FF" : "1px solid rgba(0, 212, 255, 0.3)"}
                                            _hover={{
                                                borderColor: isMultiBetActive ? "#C0392B" : "#00D4FF",
                                                transform: "translateY(-2px)",
                                                boxShadow: isMultiBetActive ? "0 4px 12px rgba(231, 76, 60, 0.4)" : "0 4px 12px rgba(0, 212, 255, 0.3)"
                                            }}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            onClick={
                                                () => {
                                                    if (isMultiBetActive) {
                                                        stopMultiBet();
                                                    } else {
                                                        startMultiBet();
                                                    }
                                                }
                                            }
                                            label={isMultiBetActive ? "STOP" : "Multi BET"}
                                        />
                                    </Grid>
                                </FormControl>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem area="game" minH={'450px'}>
                    <Card pt="30px" pb="22px" px="22px" minH="100%" alignItems="center" w="100%">
                        <CardBody minH="100%" w={{ base: '100%' }} minW="450px" maxW="450px" mx="auto" overflow="visible" position="relative">
                            <Box
                                position="absolute"
                                top="19px"
                                left="31px"
                                w="127px"
                                h="289px"
                                backgroundImage={`url(${hammer})`}
                                backgroundSize="contain"
                                backgroundRepeat="no-repeat"
                                backgroundPosition="center"
                                zIndex="5"
                                transformOrigin="bottom center"
                                animation={isHammerAnimating ? `${hammerStrike} 2.0s ease-in-out forwards` : 'none'}
                                style={{ transform: isHammerAnimating ? undefined : 'rotate(10deg)' }}
                            />
                            {showBang && (
                                <Text
                                    position="absolute"
                                    top={`${WEIGHT_BOTTOM - 20}px`}
                                    left="305px"
                                    fontSize="35px"
                                    fontWeight="bold"
                                    color="#FF7A2E"
                                    textShadow="0 0 12px #FF7A2E"
                                    zIndex="6"
                                    animation={`${bangPop} 0.9s ease-out forwards`}
                                    pointerEvents="none"
                                >
                                    BANG
                                </Text>
                            )}
                            <Box
                                position="absolute"
                                top="0"
                                right="30px"
                                w="130px"
                                h="400px"
                                backgroundImage={`url(${tower})`}
                                backgroundSize="contain"
                                backgroundRepeat="no-repeat"
                                backgroundPosition="center"
                                zIndex="3"
                            />
                            <Text
                                position="absolute"
                                top="67px"
                                right="73px"
                                fontSize="15px"
                                fontWeight="bold"
                                color={winLit ? "#FF7A2E" : "whiteAlpha.600"}
                                textShadow={winLit ? "0 0 10px #FF7A2E" : "none"}
                                letterSpacing="1px"
                                zIndex="4"
                            >
                                WIN!
                            </Text>
                            <Box
                                position="absolute"
                                top="104px"
                                right="131px"
                                w="8px"
                                h="75px"
                                display="flex"
                                flexDirection="column"
                                justifyContent="space-between"
                                zIndex="4"
                            >
                                {Array.from({ length: 9 }).map((_, index) => {
                                    const isLit = index >= 9 - ledCount;
                                    return (
                                        <Box
                                            key={`led-${index}`}
                                            h="10px"
                                            w="100%"
                                            borderRadius="2px"
                                            bg={isLit ? ledColors[index] : "whiteAlpha.300"}
                                            boxShadow={isLit ? `0 0 6px ${ledColors[index]}` : "none"}
                                        />
                                    );
                                })}
                            </Box>
                            {heightMarks.map((value) => (
                                <Box
                                    key={`height-mark-${value}`}
                                    position="absolute"
                                    right="170px"
                                    top={`${getWeightTopFromValue(value)}px`}
                                    transform="translateY(-50%)"
                                    zIndex="4"
                                    display="flex"
                                    alignItems="center"
                                    gap="6px"
                                >
                                    <Text fontSize="xs" color={MARK_COLOR}>
                                        {value}
                                    </Text>
                                    <Box w="10px" h="1px" bg={MARK_COLOR} />
                                </Box>
                            ))}
                            <Box
                                position="absolute"
                                right="83px"
                                w="20px"
                                h="20px"
                                backgroundImage={`url(${weight})`}
                                backgroundSize="contain"
                                backgroundRepeat="no-repeat"
                                backgroundPosition="center"
                                zIndex="4"
                                top={`${weightPosition}px`}
                                transition={isWeightMoving
                                    ? (weightDirection === 'up'
                                        ? "top 0.8s ease-out"
                                        : "top 0.8s ease-in")
                                    : "none"}
                            />
                            {Number.isFinite(Number(displayHeight)) && (
                                <Text
                                    position="absolute"
                                    right="24px"
                                    top={`${weightPosition + 9}px`}
                                    transform="translateY(-50%)"
                                    fontSize="xs"
                                    color="whiteAlpha.800"
                                    zIndex="5"
                                    transition={isWeightMoving
                                        ? (weightDirection === 'up'
                                            ? "top 0.8s ease-out"
                                            : "top 0.8s ease-in")
                                        : "none"}
                                >
                                    {formatResult(displayHeight)}
                                </Text>
                            )}
                            {showComparisonLabel && comparisonText && (
                                <Text
                                    position="absolute"
                                    right="-12px"
                                    top={`${getWeightTopFromValue(pumpingResult) + 9}px`}
                                    transform="translateY(-50%)"
                                    fontSize="xs"
                                    color={comparisonColor}
                                    zIndex="5"
                                >
                                    {comparisonText}
                                </Text>
                            )}
                        </CardBody>
                        <Box justifyItems="center" position="absolute" right="5px" bottom="5px">
                            <Tooltip label="Pumping Balance Graph" >
                                <Button
                                    onClick={() => { onOpen() }}
                                    width="40px"
                                    height="40px"
                                    borderRadius="50%"
                                    display="flex"
                                    justifyContent="center"
                                    alignItems="center"
                                    bg="#00D4FF"
                                    color="white"
                                    position="relative"
                                    className="bet-graph-button"
                                    _hover={{
                                        bg: "white",
                                        color: "#00D4FF",
                                        transform: "scale(1.2)",
                                        boxShadow: "0 0 20px #00f5ff"
                                    }}
                                    style={{
                                        textShadow: "0 0 5px #00D4FF, 0 0 10px #00D4FF, 0 0 15px #00D4FF",
                                        boxShadow: "0 0 10px #00f5ff"
                                    }}
                                >
                                    <AutoGraphIcon style={{ fontSize: "16px" }} />
                                    <div className="neon-border"></div>
                                    <div className="neon-dot neon-dot-1"></div>
                                    <div className="neon-dot neon-dot-2"></div>
                                    <div className="neon-dot neon-dot-3"></div>
                                </Button>
                            </Tooltip>
                        </Box>
                    </Card>
                </GridItem>
                <GridItem area="empty" minH="250px">
                    <RealView />
                </GridItem>
            </Grid>
            <History />
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent
                    bg="#2a2d2e"
                    border="1px solid rgba(0, 212, 255, 0.3)"
                    maxH="80vh"
                    h="auto"
                    overflowY="auto"
                    className="pumping-modal-content"
                >
                    <ModalHeader color="white" >
                        How to Play Pumping Game
                    </ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />
                    <ModalBody py="0" maxH="calc(80vh - 60px)" overflowY="auto" className="pumping-modal-body">
                        <Tabs colorScheme="cyan" variant="enclosed">
                            <TabList borderColor="rgba(0, 212, 255, 0.2)">
                                <Tab
                                    color="rgba(255,255,255,0.7)"
                                    _selected={{ color: '#00D4FF', borderColor: '#00D4FF' }}
                                    _hover={{ color: '#00D4FF' }}
                                >
                                    How to Play
                                </Tab>
                            </TabList>
                            <TabPanels>
                                <TabPanel py="24px">
                                    <img width="100%" src={HelpImage} alt="Help" />
                                    <VStack spacing="16px" align="stretch">
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                1. Set Your Target
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                Choose a target number (min: 1.01, max: 1000.00) using the up/down arrows. This is the number you're betting on.
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                2. Set Your Bet Amount
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                Enter your bet amount (min: 0.10). Maximum bet based on membership: Free (1), Plus (1000), Pro (your balance). Use the slider or Min/Max buttons for quick adjustment.
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                3. High Strike By Harmmer
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                Press the BET button to heat the iron ball with the hammer. The ball will rise, and when it reaches the highest point, the result will be displayed.
                                            </Text>
                                        </Box>

                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                5. Multi BET
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                By clicking the 'Multi BET' button, you can place bets on multiple games simultaneously. This feature allows you to select several game outcomes at once, giving you the opportunity to maximize your chances of winning with multiple bets in one go.
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                6. Keyboard Shortcuts
                                            </Text>
                                            <VStack spacing="4px" align="stretch" fontSize="sm" color="rgba(255,255,255,0.8)">
                                                <HStack spacing="2" wrap="wrap">
                                                    <KeyCap>W</KeyCap>
                                                    <Text as="span">/</Text>
                                                    <KeyCap>S</KeyCap>
                                                    <Text as="span">Increase/Decrease target by 2x</Text>
                                                </HStack>
                                                <HStack spacing="2" wrap="wrap">
                                                    <KeyCap>D</KeyCap>
                                                    <Text as="span">/</Text>
                                                    <KeyCap>A</KeyCap>
                                                    <Text as="span">Increase/Decrease amount by 2x</Text>
                                                </HStack>
                                                <HStack spacing="2" wrap="wrap">
                                                    <KeyCap minW="48px">Space</KeyCap>
                                                    <Text as="span">Place bet (click BET button)</Text>
                                                </HStack>
                                            </VStack>
                                        </Box>
                                    </VStack>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </ModalBody>
                </ModalContent>
            </Modal>
            <Dialog
                isOpen={isOpen}
                onClose={onClose}
                top={"15%"}
                width={{ sm: "90%", '2lg': "1280px", '2xl': "1600px" }}
                isFooter
                content={<PumpingBalanceGraph />}
            />
        </Box>
    );
}