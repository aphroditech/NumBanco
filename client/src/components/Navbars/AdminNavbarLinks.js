import {
  Box,
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useDisclosure,
  Tooltip,
  LightMode,
} from "@chakra-ui/react";
import { BellIcon } from "@chakra-ui/icons";
import { useDispatch, useSelector } from "react-redux";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { keyframes } from "@emotion/react";
import { NavLink, useHistory } from "react-router-dom";
import PropTypes from "prop-types";

import { logout } from "action/AuthActions";
import DailyDialog from "components/Dialog/DailyDialog";
import { ChevronDownIcon } from "components/Icons/Icons";
import { SidebarResponsive } from "components/Sidebar/Sidebar";

import routes from "routes.js";

import { getUserData } from "action/index";
import { setNotification } from "utils/localStorage";
import axiosInstance from "api/axiosConfig";
import { toast } from "react-toastify"

// Global set to track processed transactions across navbar subscription
import Reward from "views/Lottery/Reward";
import DeleteIcon from "@mui/icons-material/Delete";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import CheckIcon from "@mui/icons-material/Check";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import GTranslate from "components/Gtranslate";

import useAblyWithdrawStatus from 'hooks/useAblyWithdrawStatus';
import truncateToTwo from "variables/truncateToTwo";
import proring from "assets/badge/GOLDEN_CIRCLE.png"
import plusring from "assets/badge/BLUE_CIRCLE.png"

const altasMarquee = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const digitRise = keyframes`
  0% { opacity: 0; transform: translateY(6px); }
  60% { opacity: 1; transform: translateY(0); }
  100% { opacity: 1; transform: translateY(0); }
`;

const digitFall = keyframes`
  0% { opacity: 0; transform: translateY(-6px); }
  60% { opacity: 1; transform: translateY(0); }
  100% { opacity: 1; transform: translateY(0); }
`;

const isDigit = (value) => /[0-9]/.test(value);

const getDigitSequence = (fromDigit, toDigit) => {
  if (!isDigit(fromDigit) || !isDigit(toDigit)) {
    return [toDigit];
  }
  const start = Number(fromDigit);
  const end = Number(toDigit);
  if (start === end) return [String(end)];
  const step = start < end ? 1 : -1;
  const sequence = [];
  for (let value = start; step > 0 ? value <= end : value >= end; value += step) {
    sequence.push(String(value));
  }
  return sequence;
};

const formatBalanceText = (value) => {
  const result = Number.isFinite(value) ? truncateToTwo(value) : "";
  return String(result || "");
};


export default function HeaderLinks(props) {
  const { setIsAuth } = props;
  const dispatch = useDispatch();
  const [isUSDOpen, setIsUSDOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isAltasOverflow, setIsAltasOverflow] = useState(false);
  const [balanceChange, setBalanceChange] = useState(null);
  const [balanceChars, setBalanceChars] = useState([]);
  const [digitTicks, setDigitTicks] = useState([]);
  const [digitDirections, setDigitDirections] = useState([]);
  const altasContainerRef = useRef(null);
  const altasTextRef = useRef(null);
  const balanceChangeRef = useRef(null);
  const balanceCharsRef = useRef([]);
  const balanceTextRef = useRef("");
  const digitTimersRef = useRef([]);
  const prevBalanceRef = useRef(null);

  const buttonRadius = "md";
  const history = useHistory(); // Initialize useHistory hook
  const { isOpen, onOpen, onClose } = useDisclosure();

  const user = useSelector((state) => state.user?.userInfo) || {};

  const notifications = useSelector((state) => state.notifications.notifications)

  // Filter notifications based on toggle state
  const filteredNotifications = showUnreadOnly
    ? notifications.filter(n => n.unread)
    : notifications;

  const parseLocalDateOnly = (value) => {
    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const normalizeDateRange = (fromValue, toValue) => {
    let fromDate;
    let toDate;

    if (typeof fromValue === "string" && fromValue.length === 10) {
      fromDate = parseLocalDateOnly(fromValue);
      if (!fromDate) return null;
      fromDate.setHours(0, 0, 0, 0);
    } else {
      fromDate = new Date(fromValue);
    }

    if (typeof toValue === "string" && toValue.length === 10) {
      toDate = parseLocalDateOnly(toValue);
      if (!toDate) return null;
      toDate.setHours(23, 59, 59, 999);
    } else {
      toDate = new Date(toValue);
    }

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return null;
    }

    return { fromDate, toDate };
  };

  const isTargetedNotification = (n) => {
    if (n.from && n.to) {
      const range = normalizeDateRange(n.from, n.to);
      if (range) {
        const now = new Date();
        return now >= range.fromDate && now <= range.toDate;
      }

      const toValue = String(n.to).toLowerCase();
      const targets = [user?.userAuthId, user?.altas, user?.userId]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return targets.includes(toValue);
    }
    return true;
  };

  const visibleNotifications = filteredNotifications.filter(isTargetedNotification);
  const visibleUnreadCount = notifications.filter(
    (n) => n.unread && isTargetedNotification(n)
  ).length;

  const getNotificationDate = (n) => {
    if (n?.createdAt) {
      const date = new Date(n.createdAt);
      if (!Number.isNaN(date.getTime())) return date;
    }

    if (n?._id && typeof n._id === "string" && n._id.length >= 8) {
      const timestamp = parseInt(n._id.substring(0, 8), 16);
      if (!Number.isNaN(timestamp)) return new Date(timestamp * 1000);
    }

    if (n?.id) {
      const date = new Date(n.id);
      if (!Number.isNaN(date.getTime())) return date;
    }

    return null;
  };


  const showToast = useCallback((msg, type) => {
    if (msg && type == "success") {

      toast.success(msg, "success");
      setNotification(msg, dispatch, "success")

    } else if (msg && type == "error") {

      toast.error(msg, "error")
      setNotification(msg, dispatch, "error")

    }

    getUserData(dispatch);
  }, [dispatch]);

  useEffect(() => {
    if (!isAvatarOpen) return;
    const rafId = requestAnimationFrame(() => {
      if (!altasContainerRef.current || !altasTextRef.current) return;
      const containerWidth = altasContainerRef.current.clientWidth;
      const textWidth = altasTextRef.current.scrollWidth;
      setIsAltasOverflow(textWidth > containerWidth);
    });
    return () => cancelAnimationFrame(rafId);
  }, [isAvatarOpen, user?.altas]);

  useEffect(() => {
    if (typeof user?.balance !== "number") return;

    const startValue =
      typeof prevBalanceRef.current === "number"
        ? prevBalanceRef.current
        : user.balance;
    const endValue = user?.balance;
    prevBalanceRef.current = endValue;

    digitTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    digitTimersRef.current = [];

    if (startValue === endValue) {
      if (balanceChangeRef.current) {
        clearTimeout(balanceChangeRef.current);
        balanceChangeRef.current = null;
      }
      setBalanceChange(null);
      const targetText = formatBalanceText(endValue);
      const chars = targetText.split("");
      setBalanceChars(chars);
      setDigitTicks(new Array(chars.length).fill(0));
      setDigitDirections(new Array(chars.length).fill(0));
      balanceCharsRef.current = chars;
      balanceTextRef.current = targetText;
      return;
    }

    if (balanceChangeRef.current) {
      clearTimeout(balanceChangeRef.current);
    }
    setBalanceChange(endValue > startValue ? "up" : "down");
    balanceChangeRef.current = setTimeout(() => {
      setBalanceChange(null);
      balanceChangeRef.current = null;
    }, 1000);

    const targetText = formatBalanceText(endValue);
    const currentText = balanceCharsRef.current.length
      ? balanceCharsRef.current.join("")
      : balanceTextRef.current || targetText;
    const maxLength = Math.max(currentText.length, targetText.length);
    const paddedCurrent = currentText.padStart(maxLength, " ");
    const paddedTarget = targetText.padStart(maxLength, " ");
    const nextChars = paddedCurrent.split("");

    if (!balanceCharsRef.current.length || balanceCharsRef.current.length !== nextChars.length) {
      setBalanceChars(nextChars);
      setDigitTicks(new Array(nextChars.length).fill(0));
      setDigitDirections(new Array(nextChars.length).fill(0));
      balanceCharsRef.current = nextChars;
    }

    const stepDuration = 60;

    const updateDigitAt = (index, value, direction = 0) => {
      setBalanceChars((prev) => {
        const updated = [...prev];
        updated[index] = value;
        balanceCharsRef.current = updated;
        return updated;
      });
      setDigitTicks((prev) => {
        const updated = [...prev];
        updated[index] = (updated[index] || 0) + 1;
        return updated;
      });
      setDigitDirections((prev) => {
        const updated = [...prev];
        updated[index] = direction;
        return updated;
      });
    };

    paddedTarget.split("").forEach((targetChar, index) => {
      const currentChar = paddedCurrent[index];
      if (isDigit(currentChar) && isDigit(targetChar) && currentChar !== targetChar) {
        const sequence = getDigitSequence(currentChar, targetChar);
        const direction = Number(targetChar) > Number(currentChar) ? 1 : -1;
        sequence.forEach((value, stepIndex) => {
          const timerId = setTimeout(() => {
            updateDigitAt(index, value, direction);
          }, stepIndex * stepDuration);
          digitTimersRef.current.push(timerId);
        });
      } else if (currentChar !== targetChar) {
        updateDigitAt(index, targetChar, 0);
      }
    });

    balanceTextRef.current = targetText;

    return () => {
      if (balanceChangeRef.current) {
        clearTimeout(balanceChangeRef.current);
        balanceChangeRef.current = null;
      }
      digitTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      digitTimersRef.current = [];
    };
  }, [user?.balance]);

  useAblyWithdrawStatus(showToast, user?.userId);

  function clickout() {
    logout(history, dispatch, setIsAuth);
  }

  const removeNotification = async (id) => {
    try {
      const res = await axiosInstance.delete(`/notifications/${id}`);
      dispatch({
        type: "UPDATED_NOTIFICATION",
        payload: res.data.notifications || []
      });
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const markNotificationRead = async (id) => {
    const optimistic = notifications.map((item) =>
      (item._id === id || item.id === id) ? { ...item, unread: false } : item
    );
    dispatch({
      type: "UPDATED_NOTIFICATION",
      payload: optimistic
    });

    try {
      const res = await axiosInstance.patch(`/notifications/${id}/read`);
      dispatch({
        type: "UPDATED_NOTIFICATION",
        payload: res.data.notifications || optimistic
      });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const res = await axiosInstance.patch("/notifications/read-all");
      dispatch({
        type: "UPDATED_NOTIFICATION",
        payload: res.data.notifications || []
      });
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await axiosInstance.delete("/notifications");
      dispatch({
        type: "REMOVE_NOTIFICATIONS",
        payload: []
      });
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  const onConfirm = () => {
    onClose();
  };

  let navbarIcon = "white";
  const settingsRef = React.useRef();
  return (
    <Flex
      pe={{ sm: "0px", md: "16px" }}
      w={{ sm: "100%", md: "auto" }}
      alignItems='center'
      flexDirection='row'
      justifyContent={{ base: "flex-end", md: "flex-start" }}
    >
      <LightMode>
        <Flex justifyContent="center" alignContent="center" gap="10px">
          {/* $50 USD Button with Hover Dropdown */}
          <Box
            onMouseEnter={() => setIsUSDOpen(true)}
            onMouseLeave={() => setIsUSDOpen(false)}
            display="inline-block" >
            <Menu isOpen={isUSDOpen} matchWidth>
              <MenuButton
                as={Button}
                id="balance"
                colorScheme="transparent"
                rightIcon={<ChevronDownIcon />}
                _hover={{ bg: "rgba(0,0,0,0.3)" }}
              >
                {typeof user?.balance === "number" && (
                  <Text
                    color={
                      balanceChange === "up"
                        ? "#6DC64B"
                        : balanceChange === "down"
                          ? "#E74C3C"
                          : "white"
                    }
                    // sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    $
                    {(
                      balanceChars.length
                        ? balanceChars
                        : formatBalanceText(user?.balance).split("")
                    ).map((char, index) => (
                      <Box
                        key={`balance-char-${index}-${digitTicks[index] || 0}`}
                        as="span"
                        display="inline-block"
                        w="0.7em"
                        textAlign="center"
                        animation={
                          isDigit(char)
                            ? `${digitDirections[index] === -1
                              ? digitFall
                              : digitRise
                            } 500ms ease-out`
                            : "none"
                        }
                      >
                        {char === " " ? "\u00A0" : char}
                      </Box>
                    ))}
                  </Text>
                )}
              </MenuButton>

              <MenuList
                minWidth="0"
                mt="-7.51px"
                bg="#323738"
                border="1px solid #2a2d2e"
                borderRadius={buttonRadius}
                p={2}
              >
                <MenuItem
                  borderRadius={buttonRadius}
                  color="white"
                  px="0"
                  justifyContent="center"
                  textAlign="center"
                  _hover={{ bg: "rgba(255,255,255,0.08)" }}
                >
                  <NavLink to='/transaction/deposit'>
                    Deposit
                  </NavLink>
                </MenuItem>
                <MenuItem
                  borderRadius={buttonRadius}
                  color="white"
                  px="0"
                  justifyContent="center"
                  textAlign="center"
                  _hover={{ bg: "rgba(255,255,255,0.08)" }}
                >
                  <NavLink to='/transaction/withdraw'>
                    Withdraw
                  </NavLink>
                </MenuItem>
                <MenuItem
                  onClick={() => { onOpen() }}
                  borderRadius={buttonRadius}
                  color="white"
                  px="0"
                  justifyContent="center"
                  textAlign="center"
                  _hover={{ bg: "rgba(255,255,255,0.08)" }}
                >
                  <Text>
                    Reward
                  </Text>
                </MenuItem>
              </MenuList>
            </Menu>
          </Box>

          {/* Help Button with Hover Dropdown */}
          <Box
            onMouseEnter={() => setIsHelpOpen(true)}
            onMouseLeave={() => setIsHelpOpen(false)}
            display="inline-block"
          >
            <Menu isOpen={isHelpOpen} matchWidth>
              <MenuButton
                width="120px"
                as={Button}
                _hover={{ bg: "rgba(0,0,0,0.3)" }}
                colorScheme="transparent"
                rightIcon={<ChevronDownIcon />}
              >
                <Text>Help</Text>
              </MenuButton>

              <MenuList
                minWidth="0"
                mt="-7.51px"
                bg="#323738"
                border="1px solid #2a2d2e"
                borderRadius={buttonRadius}
                p={2}
              >
                <MenuItem
                  to="/help/faq"
                  borderRadius={buttonRadius}
                  color="white"
                  px="0"
                  justifyContent="center"
                  textAlign="center"
                  _hover={{ bg: "rgba(255,255,255,0.08)" }}
                >
                  <NavLink to='/help/faq'>
                    FAQ
                  </NavLink>
                </MenuItem>
                <MenuItem
                  borderRadius={buttonRadius}
                  color="white"
                  px="0"
                  justifyContent="center"
                  textAlign="center"
                  _hover={{ bg: "rgba(255,255,255,0.08)" }}
                >
                  <NavLink to='/help/contactus'>
                    Contact Us
                  </NavLink>
                </MenuItem>
                <MenuItem
                  borderRadius={buttonRadius}
                  color="white"
                  px="0"
                  justifyContent="center"
                  textAlign="center"
                  _hover={{ bg: "rgba(255,255,255,0.08)" }}
                >
                  <NavLink to='/help/support'>
                    Support
                  </NavLink>
                </MenuItem>
              </MenuList>
            </Menu>
          </Box>
        </Flex>
      </LightMode>
      <GTranslate />
      <SidebarResponsive
        iconColor='white'
        logoText={props.logoText}
        secondary={props.secondary}
        routes={routes}
      />
      <Menu>
        <MenuButton
          position="relative"
          mr="20px"
        >
          <BellIcon color={navbarIcon} mt="-4px" w="18px" h="18px" ml="12px" />

          {visibleUnreadCount > 0 && (
            <Box
              position="absolute"
              top="-4px"
              right="-6px"
              bg="red.400"
              color="white"
              fontSize="10px"
              w="16px"
              h="16px"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {visibleUnreadCount}
            </Box>
          )}
        </MenuButton>

        <MenuList
          zIndex={20}
          w="360px"
          maxH="420px"
          overflowY="auto"
          bg="#323738"
          border="1px solid #2a2d2e"
          borderRadius="16px"
          p="0"
          sx={{
            /* Firefox */
            scrollbarWidth: "thin",
            scrollbarColor: "#2a2d2e transparent",

            /* Chrome, Edge, Safari */
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
              borderRadius: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "linear-gradient(180deg, #00c6ff, #0072ff)",
              borderRadius: "8px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "linear-gradient(180deg, #00f2fe, #00c6ff)",
            },
          }}
        >

          {/* Sticky Header */}
          <Flex
            px="16px"
            py="12px"
            justify="space-between"
            align="center"
            borderBottom="1px solid rgba(255,255,255,0.08)"
            position="sticky"
            top="0"
            bg="#323738"
            zIndex="1"
          >
            <Text
              fontSize="15px"
              fontWeight="bold"
              letterSpacing="1.5px"
              color="white"
            >
              Notifications
            </Text>

            <Flex gap="10px">
              {/* Toggle unread filter */}
              <Tooltip label={showUnreadOnly ? "Show all notifications" : "Show unread only"} placement="top">
                <Box
                  cursor="pointer"
                  color={showUnreadOnly ? "green.400" : "gray.400"}
                  _hover={{ color: showUnreadOnly ? "green.300" : "gray.300" }}
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  size="20px"
                >
                  {showUnreadOnly ? <ToggleOnIcon fontSize="medium" /> : <ToggleOffIcon fontSize="medium" />}
                </Box>
              </Tooltip>

              {/* ✅ Mark all as read */}
              <Tooltip label="Mark all as read" placement="top">
                <Box
                  cursor="pointer"
                  color={notifications.some(n => n.unread) ? "green.400" : "gray.400"}
                  _hover={{ color: notifications.some(n => n.unread) ? "green.300" : "gray.300" }}
                  onClick={markAllNotificationsRead}
                >
                  <DoneAllIcon fontSize="small" />
                </Box>
              </Tooltip>

              {/* 🗑️ Clear all */}
              <Tooltip label="Clear all notifications" placement="top">
                <Box
                  cursor="pointer"
                  color={notifications.length > 0 ? "red.400" : "gray.400"}
                  onClick={clearAllNotifications}
                >
                  <DeleteIcon color={notifications.length > 0 ? "red.400" : "gray.400"} fontSize="small" />
                </Box>
              </Tooltip>
            </Flex>
          </Flex>

          {/* Empty state */}
          {visibleNotifications.length === 0 ? (
            <Flex py="40px" justify="center">
              <Text color="gray.400">
                {showUnreadOnly ? "No unread notifications" : "No notifications"}
              </Text>
            </Flex>
          ) : (
            visibleNotifications
              .slice()
              .reverse()
              .map((n, index) => (
                <Flex
                  key={`${n._id || n.id || "notification"}-${index}`}
                  m="10px 5px 10px 10px"
                  px="16px"
                  py="12px"
                  gap="12px"
                  cursor="default"
                  borderRadius="10px"
                  bg={n.unread ? "#555b5e" : "#323738"}
                  _hover={{ bg: n.unread ? "rgba(255,255,255,0.08)" : "#323738" }}
                  boxShadow="0 2px 6px rgba(0,0,0,0.35)"
                  transition="all 0.2s ease"
                >
                  <Box mt="4px">
                    {n.status === "success" && (
                      <CheckCircleIcon
                        fontSize="small"
                        style={{ color: "#4FD1C5" }} // teal / success
                      />
                    )}

                    {n.status === "error" && (
                      <ErrorIcon
                        fontSize="small"
                        style={{ color: "#F56565" }} // red
                      />
                    )}

                    {n.status === "warning" && (
                      <WarningIcon
                        fontSize="small"
                        style={{ color: "#ECC94B" }} // yellow
                      />
                    )}
                  </Box>

                  <Box flex="1">
                    <Text color="white" fontSize="14px" fontWeight="200">
                      {n.notification}
                    </Text>
                    {n.from && n.to && (
                      <Text color="gray.400" fontSize="11px" mt="2px">
                        By support team
                      </Text>
                    )}
                    <Text color="gray.500" fontSize="11px" mt="4px" textAlign="right">
                      {(() => {
                        const date = getNotificationDate(n);
                        return date
                          ? `${date.toLocaleDateString()}, ${date.toLocaleTimeString()}`
                          : "";
                      })()}
                    </Text>
                  </Box>

                  {/* Check icon for unread notifications */}
                  {n.unread && (
                    <Tooltip label="Mark as read" placement="top">
                      <Box
                        cursor="pointer"
                        color="green.400"
                        _hover={{ color: "green.300" }}
                        onClick={(e) => {
                          e.stopPropagation(); // prevent parent click
                          markNotificationRead(n._id || n.id);
                        }}
                      >
                        <CheckIcon fontSize="small" />
                      </Box>
                    </Tooltip>
                  )}

                  <Tooltip label="Delete notification" placement="top">
                    <Box
                      cursor="pointer"
                      color="red.400"
                      _hover={{ color: "gray.400" }}
                      onClick={(e) => {
                        e.stopPropagation(); // prevent parent click
                        removeNotification(n._id || n.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </Box>
                  </Tooltip>
                </Flex>
              ))
          )}
        </MenuList>
      </Menu>

      <LightMode>
        <Box
          onMouseEnter={() => setIsAvatarOpen(true)}
          onMouseLeave={() => setIsAvatarOpen(false)}
          display="inline-block"
        >
          <Menu isOpen={isAvatarOpen}>
            {/* MenuButton wraps the avatar */}
            <MenuButton
              as={Box}
              w="50px"
              h="50px"
              cursor="pointer"
              position="relative"
            >
              <Box
                w="50px"
                h="50px"
                borderRadius="full"
                backgroundImage={`url(${user?.avatar})`}
                backgroundSize="cover"
                backgroundPosition="center"
                boxShadow="0 6px 8px rgba(0, 0, 0, 0.9)" // dark shadow
              />
              <Box
                position="absolute"
                top="-7px"
                left="-7px"
                w="65px"
                h="65px"
                backgroundImage={`url(${user?.membership === 2 && proring || user?.membership === 1 && plusring})`}
                backgroundSize="contain"
                backgroundRepeat="no-repeat"
                backgroundPosition="center"
                zIndex="6"
              />
            </MenuButton>


            <MenuList
              mr="-90px"
              minWidth="0px"
              w="120px"             // dropdown width
              mt="0"
              bg="#323738"
              border="1px solid #2a2d2e"
              borderRadius="md"
              p={2}
              position="absolute"
              right="0"            // align to the right edge of avatar
            >
              <Box
                ref={altasContainerRef}
                maxW="100%"
                overflow="hidden"
                whiteSpace="nowrap"
                textAlign="center"
                display="flex"
                justifyContent={isAltasOverflow ? "flex-start" : "center"}
              >
                <Box
                  display="inline-flex"
                  alignItems="center"
                  animation={
                    isAltasOverflow
                      ? `${altasMarquee} 12s linear infinite`
                      : "none"
                  }
                >
                  <Text
                    ref={altasTextRef}
                    position="relative"
                    fontSize="12px"
                    fontWeight="bold"
                    letterSpacing="1.5px"
                    bgGradient="linear(to-r, #00c6ff, #0072ff, #00f2fe)"
                    bgClip="text"
                    color="transparent"
                    transition="all 0.4s ease"
                    display="inline-block"
                    pr={isAltasOverflow ? "30px" : "0"}
                  >
                    {user?.altas}
                  </Text>
                  {isAltasOverflow && (
                    <Text
                      aria-hidden="true"
                      position="relative"
                      fontSize="12px"
                      fontWeight="bold"
                      letterSpacing="1.5px"
                      bgGradient="linear(to-r, #00c6ff, #0072ff, #00f2fe)"
                      bgClip="text"
                      color="transparent"
                      transition="all 0.4s ease"
                      display="inline-block"
                      pr="30px"
                    >
                      {user?.altas}
                    </Text>
                  )}
                </Box>
              </Box>
              <MenuItem
                fontSize="15px"
                borderRadius={buttonRadius}
                color="white"
                px="0"
                justifyContent="center"
                textAlign="center"
                _hover={{ bg: "rgba(255,255,255,0.08)" }}
              >
                <NavLink to='/user/myprofile'>
                  My Profile
                </NavLink>
              </MenuItem>
              {localStorage.getItem("token") ?
                <MenuItem
                  fontSize="15px"
                  borderRadius={buttonRadius}
                  color="white"
                  onClick={clickout}
                  px="0"
                  justifyContent="center"
                  textAlign="center"
                  _hover={{ bg: "rgba(255,255,255,0.08)" }}
                >
                  Logout
                </MenuItem> :
                <MenuItem
                  fontSize="15px"
                  borderRadius={buttonRadius}
                  color="white"
                  px="0"
                  justifyContent="center"
                  textAlign="center"
                  _hover={{ bg: "rgba(255,255,255,0.08)" }}
                >
                  <NavLink to='/auth/signin'>
                    Sign In
                  </NavLink>
                </MenuItem>}
            </MenuList>
          </Menu>
        </Box>
      </LightMode>
      <DailyDialog
        content={<Reward />}
        bgColor="#2a2d2e"
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={onConfirm} />
    </Flex>
  );
}

HeaderLinks.propTypes = {
  variant: PropTypes.string,
  fixed: PropTypes.bool,
  onOpen: PropTypes.func,
};
