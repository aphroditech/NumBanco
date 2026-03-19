import {
  Avatar,
  GridItem,
  Box
} from "@chakra-ui/react";
import React from "react";
import promedal from "assets/badge/GOLDEN_MEDAL.png";
import plusmedal from "assets/badge/BLUE_MEDAL.png";
import prolock from "assets/badge/GOLDEN_MEDAL_LOCK.png";
import pluslock from "assets/badge/BLUE_MEDAL_LOCK.png";
import { useSelector } from 'react-redux';

function UserAvatarList(props) {
  const user = useSelector((state) => state.user.userInfo);
  const { userAvatar, membership, onClick } = props;
  const proimage = membership === 2 && (user?.membership < membership ? prolock : promedal);
  const plusimage = membership === 1 && (user?.membership < membership ? pluslock : plusmedal);
  return (
    <GridItem onClick={() => {
      user?.membership >= membership && onClick()
    }}>
      <Box
        position="relative"
        w='140px'
        h='140px'
        display="inline-block"
        cursor={() => {
          return user?.membership >= membership ? 'pointer' : 'not-allowed';
        }}
        me="18px"
        mb="20px"
      >
        <Box
          position="absolute"
          top="-25px"
          left="-27px"
          w="190px"
          h="190px"
          backgroundImage={`url(${proimage || plusimage})`}
          backgroundSize="contain"
          backgroundRepeat="no-repeat"
          backgroundPosition="center"
          zIndex="3"
        />

        <img
          src={userAvatar}
          alt={`NumBanco Avatar`}
          loading="lazy" // Lazy loading applied here
          style={{
            width: "140px",
            height: "140px",
            borderRadius: "25px",
            objectFit: "cover",
          }}
        />

        {user?.membership < membership && <Box
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "140px",
            height: "140px",
            background: "rgba(0, 0, 0, 0.5)",
            borderRadius: "25px",
            zIndex: 1
          }}
        />}
      </Box>
    </GridItem>
  );
}

export default UserAvatarList;
