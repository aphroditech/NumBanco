import {
  Box,
  Avatar,
  Text,
  Grid,
  Button,
  useDisclosure
} from "@chakra-ui/react";

import DailyDialog from "components/Dialog/DailyDialog";
import DailyLoot from "views/Lottery/DailyLoot";
import Reward from "views/Lottery/Reward";

const NeonAvatar = ({ src, size = "100px", delay = "0s", neonText = "", onClick, openDailyLoot, prop = {} }) => {

  // ✅ SAFE DESTRUCTURING
  const {
    value = null
  } = prop;

  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleClick = () => {
    onClose();
    if (openDailyLoot) {
      onOpen();
    }
  };

  return (
    <Box
      position="relative"
      display="flex"
      flexDirection="column"
      alignItems="center"
      role="group"
      onClick={handleClick}
    >
      {/* Avatar with neon glow */}
      <Box
        position="relative"
        w={size}
        h={size}
        borderRadius="50%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        sx={{
          "::before": {
            content: '""',
            position: "absolute",
            width: "150%",
            height: "150%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,255,255,0.6) 0%, rgba(0,255,255,0.35) 35%, rgba(0,255,255,0.12) 55%, transparent 60%)",
            animation: "pulse 5s ease-in-out infinite",
            animationDelay: delay,
            zIndex: 0,
            filter: "blur(10px)",
            transition: "all 0.4s ease-in-out"
          },
          "&:hover::before": {
            width: "190%",
            height: "190%",
            filter: "blur(18px)"
          },
          "@keyframes pulse": {
            "0%": { transform: "scale(0.9)", opacity: 0.6 },
            "50%": { transform: "scale(1.05)", opacity: 0.9 },
            "100%": { transform: "scale(0.9)", opacity: 0.6 }
          }
        }}
      >
        <Avatar
          src={src}
          loading="eager"
          w="92%"
          h="92%"
          bg="transparent"
          zIndex="1"
          transition="transform 0.4s ease-in-out"
          _groupHover={{
            transform: "scale(1.2)"
          }}
        />
      </Box>

      {/* Neon Text */}
      {neonText && (
        <Text
          mt="-4px"
          fontSize="16px"
          fontWeight="bold"
          color="#00ffff"
          textShadow="0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 20px #00ffff"
          transition="all 0.8s ease-in-out"
          _groupHover={{
            transform: "scale(1.2)",
            textShadow:
              "0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 40px #00ffff"
          }}
        >
          {neonText}
        </Text>
      )}

      {/* OPTIONAL BUTTON + DIALOG */}
       {openDailyLoot && (
        <DailyDialog
          isOpen={isOpen}
          onClose={onClose}
          content={<DailyLoot />}
        />
      )}
    </Box>
  );
};

export default NeonAvatar;