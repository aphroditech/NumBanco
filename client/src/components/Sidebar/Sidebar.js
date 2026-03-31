
import React from "react";
import { Collapse } from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import PropTypes from "prop-types";
import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Image,
  Link,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { NavLink } from "react-router-dom";
import { TierA, TierB, TierC, DailyLoot, Reward, Jackal, Mines, Rocket, Rubic, Plinko,Pumping, CloudSpread, Fishing, CardGame, Keno, JokerCrash, Gravity, DoubleGame,DoveGame, CocoGame, AToZGame, AlphaTreeGame, Coin, Twist, Dice, Wheel, Climb, ThreeNumbers, Snakes, Diamond } from "variables/Sidebar";
import { Separator } from "components/Separator/Separator";
import SidebarButtonConfirm from "./SidebarItem/SidebarButtonConfirm";
import SidebarButtonLink from "./SidebarItem/SidebarButtonLink";
import SideBarToggle from "./SidebarItem/SideBarToggle";
import Landing_logo from "assets/img/logo_Landing.png";

function Sidebar(props) {
  let variantChange = "0.2s linear";
  const mainPanel = React.useRef();
  const [activeMenu, setActiveMenu] = React.useState("menu");
  const toggleMenu = (menu) => {
    setActiveMenu(prev => prev === menu ? null : menu);
  };
  const createLinks = (routes) => {

    return routes.map((prop, key) => {
      if (prop.redirect) {
        return null;
      }
      if (prop.name == "NUMEXA") {
        return (
          <Box key={key}>
            <SideBarToggle
              value={prop}
              isExpanded={activeMenu === "menu"}
              onClick={() => toggleMenu("menu")} />
            <Collapse in={activeMenu === "menu"} animateOpacity>
              <SidebarButtonLink value={TierA} />
              <SidebarButtonLink value={TierB} />
              <SidebarButtonLink value={TierC} />
            </Collapse>
          </Box>
        )
      }
      if (prop.name === "GAMES") {
        return (
          <Box key={key}>
            <SideBarToggle
              value={prop}
              isExpanded={activeMenu === "games"}
              onClick={() => toggleMenu("games")} />
            <Collapse in={activeMenu === "games"} animateOpacity>
              <SidebarButtonLink value={Rubic} />
              <SidebarButtonLink value={Pumping} />
              <SidebarButtonLink value={Fishing} />
              <SidebarButtonLink value={CardGame} />
              <SidebarButtonLink value={Keno} />
              <SidebarButtonLink value={ThreeNumbers} />
              <SidebarButtonLink value={JokerCrash} />
              <SidebarButtonLink value={Gravity} />
              <SidebarButtonLink value={DoubleGame} />
              <SidebarButtonLink value={CloudSpread} />
              <SidebarButtonLink value={Rocket} />
              <SidebarButtonLink value={Jackal} />
              <SidebarButtonLink value={AToZGame} />
              <SidebarButtonLink value={Coin} />
              <SidebarButtonLink value={Snakes} />
              <SidebarButtonLink value={Dice} />
              <SidebarButtonLink value={Plinko} />
              <SidebarButtonLink value={Mines} />
              <SidebarButtonLink value={DoveGame} />
              <SidebarButtonLink value={CocoGame} />
              <SidebarButtonLink value={AlphaTreeGame} />
              <SidebarButtonLink value={Twist} />
              <SidebarButtonLink value={Wheel} />
              <SidebarButtonLink value={Climb} />
              <SidebarButtonLink value={Diamond} />
            </Collapse >
          </Box >
        )
      }
      if (prop.name == "LOTTERY") {
        return (
          <Box key={key}>
            {/* <SideBarToggle
            value={prop}
            onClick={() => toggleMenu("lottery")} /> */}
            {/* <Collapse in={activeMenu === "lottery"} animateOpacity> */}
            <SidebarButtonConfirm value={DailyLoot} />
            <SidebarButtonConfirm value={Reward} />
            {/* </Collapse> */}
          </Box>
        )
      }
      return (
        <SidebarButtonLink value={prop} key={key} />
      );
    });
  };
  const { logoText, routes } = props;

  var links = <>{createLinks(routes)}</>;

  let sidebarBg = "#2a2d2e";
  let sidebarRadius = "16px";
  let sidebarMargins = "16px 0px 16px 16px";
  var brand = (
    <Box pt={"25px"} mb='12px' w="100%">
      <Box
        as={NavLink}
        to='/user/dashboard'
        display='flex'
        w="100%"
        lineHeight='100%'
        fontWeight='bold'
        justifyContent='center'
        alignItems='center'>
        <Image src={Landing_logo} alt="NumBanco Logo" maxH="40px" objectFit="contain" mx="auto" mb="20px" />
      </Box>
      <Separator></Separator>
    </Box>
  );

  return (
    <Box ref={mainPanel}>
      <Box display={{ sm: "none", xl: "block" }} position="fixed">
        <Box
          bg={sidebarBg}
          backdropFilter="blur(10px)"
          transition={variantChange}
          w="260px"
          maxW="260px"
          ms={{ sm: "16px" }}
          my={{ sm: "16px" }}
          h="calc(100vh - 32px)"
          ps="20px"
          pe="20px"
          m={sidebarMargins}
          borderRadius={sidebarRadius}

          /* 👇 SCROLLBAR */
          overflowY="auto"
          overflowX="hidden"

          /* optional – smooth scrolling */
          css={{
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "transparent",
              borderRadius: "10px",
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
          }}
        >
          <Box>{brand}</Box>

          <Stack direction="column" mb="40px">
            <Box>{links}</Box>
          </Stack>
        </Box>
      </Box>
    </Box>

  );
}


export function SidebarResponsive(props) {
  const mainPanel = React.useRef();
  const [activeMenu, setActiveMenu] = React.useState("menu");

  const toggleMenu = (menu) => {
    setActiveMenu(prev => (prev === menu ? null : menu));
  };

  const createLinks = (routes) => {
    return routes.map((prop, key) => {
      if (prop.redirect) return null;

      if (prop.name === "NUMEXA") {
        return (
          <Box key={key} mb={4}>
            {/* Main toggle */}
            <SideBarToggle
              value={prop}

              isExpanded={activeMenu === "menu"}
              onClick={() => toggleMenu("menu")}
            />

            {/* Sub menu */}
            <Collapse in={activeMenu === "menu"} animateOpacity>
              <Stack
                spacing={2}
                mt={2}
              >
                <SidebarButtonLink value={TierA} />
                <SidebarButtonLink value={TierB} />
                <SidebarButtonLink value={TierC} />
              </Stack>
            </Collapse>
          </Box>
        );
      }
      if (prop.name === "GAMES") {
        return (
          <Box key={key}>
            <SideBarToggle
              value={prop}
              isExpanded={activeMenu === "games"}
              onClick={() => toggleMenu("games")} />
            <Collapse in={activeMenu === "games"} animateOpacity>
              <Stack
                spacing={2}
                mt={2}
              >
                <SidebarButtonLink value={Rubic} />
                <SidebarButtonLink value={Pumping} />
                <SidebarButtonLink value={Fishing} />
                <SidebarButtonLink value={CardGame} />
                <SidebarButtonLink value={Keno} />
                <SidebarButtonLink value={JokerCrash} />
                <SidebarButtonLink value={Gravity} />
                <SidebarButtonLink value={DoubleGame} />
                <SidebarButtonLink value={CloudSpread} />
                <SidebarButtonLink value={Rocket} />
                <SidebarButtonLink value={Jackal} />
                <SidebarButtonLink value={AToZGame} />
                <SidebarButtonLink value={Coin} />
                <SidebarButtonLink value={ThreeNumbers} />
                <SidebarButtonLink value={Dice} />
                <SidebarButtonLink value={Plinko} />
                <SidebarButtonLink value={Mines} />
                <SidebarButtonLink value={DoveGame} />
                <SidebarButtonLink value={CocoGame} />
                <SidebarButtonLink value={AToZGame} />
                <SidebarButtonLink value={AlphaTreeGame} />
                <SidebarButtonLink value={Coin} />
                <SidebarButtonLink value={Twist} />
                <SidebarButtonLink value={Snakes} />
                <SidebarButtonLink value={Wheel} />
                <SidebarButtonLink value={Climb} />
                <SidebarButtonLink value={Diamond} />
              </Stack>
            </Collapse>
          </Box>
        )
      }

      if (prop.name === "LOTTERY") {
        return (
          <Box key={key} mb={4}>
            <Stack spacing={2}>
              <SidebarButtonConfirm value={DailyLoot} />
              <SidebarButtonConfirm value={Reward} />
            </Stack>
          </Box>
        );
      }

      return (
        <Box key={key} >
          <SidebarButtonLink value={prop} />
        </Box>
      );
    });
  };

  const { logoText, routes, iconColor } = props;
  const links = <>{createLinks(routes)}</>;

  // SidebarResponsive (drawer) top logo — same logo_Landing.png as desktop sidebar
  const brand = (
    <Box pt="40px" mb="24px" w="100%">
      <NavLink
        to='/user/dashboard'
        display="flex"
        w="100%"
        justifyContent="center"
        alignItems="center"
        _hover={{ textDecoration: "none" }}
      >
        <Image src={Landing_logo} alt="NumBanco Logo" maxH="40px" objectFit="contain" mx="auto" mb="20px" />
      </NavLink>

      <Separator mb="20px" />
    </Box>
  );

  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = React.useRef();

  return (
    <Flex
      display={{ sm: "flex", xl: "none" }}
      ref={mainPanel}
      alignItems="center"
    >
      <HamburgerIcon
        color={iconColor}
        w="18px"
        h="18px"
        ref={btnRef}
        onClick={onOpen}
      />

      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        placement="left"
        finalFocusRef={btnRef}
      >
        <DrawerOverlay />
        <DrawerContent
          backdropFilter="blur(10px)"
          bg="#2a2d2e"
          w="260px"
          maxW="260px"
          borderRadius="16px"
        >
          <DrawerCloseButton
            color="white"
            _focus={{ boxShadow: "none" }}
          />

          <DrawerBody
            ps="20px"
            pe="20px"
            pt="1rem"
            overflowY="auto"
            overflowX="hidden"
            maxH="100vh"
            css={{
              "&::-webkit-scrollbar": {
                width: "6px",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "transparent",
                borderRadius: "10px",
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
            }}
          >

            <Box h="100vh">
              {brand}

              <Stack spacing={3} > {/* 👈 MAIN vertical rhythm */}
                {links}
              </Stack>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
}


Sidebar.propTypes = {
  logoText: PropTypes.string,
  routes: PropTypes.arrayOf(PropTypes.object),
  variant: PropTypes.string,
};
SidebarResponsive.propTypes = {
  routes: PropTypes.arrayOf(PropTypes.object),
};

export default Sidebar;
