import { Box, Avatar } from "@chakra-ui/react";

const MovingLightAvatar = ({ src, size = "100px", delay = "0s" }) => {
  return (
    <Box
      position="relative"
      w={size}
      h={size}
      borderRadius="50%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        /* Thin border */
        border: "2px solid rgba(0,255,255,0.3)",

        /* Moving light dot */
        "::after": {
          content: '""',
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "#00ffff",
          boxShadow: "0 0 10px #00ffff",
          transformOrigin: "0 -50px",
          animation: "orbit 5s linear infinite",
          animationDelay: delay
        },

        "@keyframes orbit": {
          "0%": { transform: "rotate(0deg) translateY(-50%)" },
          "100%": { transform: "rotate(360deg) translateY(-50%)" }
        }
      }}
    >
      <Avatar
        src={src}
        loading="eager"
        w="90%"
        h="90%"
        bg="transparent"
      />
    </Box>
  );
};

export default MovingLightAvatar;