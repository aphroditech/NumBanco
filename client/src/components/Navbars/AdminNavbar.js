import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Link,
} from "@chakra-ui/react";
import PropTypes from "prop-types";
import React, { useState, useEffect } from "react";
import AdminNavbarLinks from "./AdminNavbarLinks";

export default function AdminNavbar(props) {
  const { setIsAuth } = props;
  const [scrolled, setScrolled] = useState(false);
  const {
    variant,
    children,
    fixed,
    secondary,
    brandText,
    onOpen,
    ...rest
  } = props;

  let mainText = "white";
  let navbarPosition = "absolute";
  let navbarFilter = "none";
  let navbarBackdrop = "none";
  let navbarShadow = "none";
  let navbarBg = "none";
  let navbarBorder = "transparent";
  let secondaryMargin = "0px";
  let paddingX = "15px";
  if (props.fixed === true)
    if (scrolled === true) {
      navbarPosition = "fixed";
      navbarShadow = "0px 7px 23px rgba(0, 0, 0, 0.05)";
      navbarBg =
        "linear-gradient(rgba(255, 255, 255, 0) 0% rgba(255, 255, 255, 0.39) @ 100%)";
      navbarBorder = "rgba(226, 232, 240, 0.3)";
      navbarFilter = "drop-shadow(0px 7px 23px rgba(0, 0, 0, 0.05))";
      navbarBackdrop = "blur(42px)";
    }
  if (props.secondary) {
    navbarBackdrop = "blur(42px)";
  }
  const changeNavbar = () => {
    if (window.scrollY > 1) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", changeNavbar);
    
    // Cleanup function to remove event listener when component unmounts
    return () => {
      window.removeEventListener("scroll", changeNavbar);
    };
  }, []);
  return (
    <Flex
      zIndex={10}
      position={navbarPosition}
      boxShadow={navbarShadow}
      bg={navbarBg}
      borderColor={navbarBorder}
      filter={navbarFilter}
      backdropFilter={navbarBackdrop}
      borderWidth='1.5px'
      borderStyle='solid'
      transitionDelay='0s, 0s, 0s, 0s'
      transitionDuration=' 0.25s, 0.25s, 0.25s, 0s'
      transitionProperty='box-shadow, background-color, filter, border'
      transitionTimingFunction='linear, linear, linear, linear'
      alignItems={{ xl: "center" }}
      borderRadius='16px'
      display='flex'
      minH='75px'
      justifyContent={{ xl: "center" }}
      lineHeight='25.6px'
      mx='auto'
      mt={secondaryMargin}
      pb='8px'
      left={""}
      right={"30px"}
      px={{
        sm: paddingX,
        md: "30px",
      }}
      ps={{
        xl: "12px",
      }}
      pt='8px'
      top='18px'
      w={{ sm: "calc(100vw - 60px)", xl: "calc(100vw - 75px - 275px)" }}>
      <Flex
        w='100%'
        flexDirection={{
          sm: "column",
          md: "row",
        }}
        alignItems={{ base: "stretch", xl: "center" }}>
        <Box mb={{ sm: "8px", md: "0px" }} display="flex" alignItems="center">
          {/* <Breadcrumb>
            <BreadcrumbItem color='#A0AEC0'>
              <BreadcrumbLink href='#' color='#A0AEC0'>
                Pages
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbItem color={mainText}>
              <BreadcrumbLink href='#' color={mainText}>
                {brandText}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb> */}
          {/* Here we create navbar brand, based on route name */}
          <Link
            color={mainText}
            href='#'
            bg='inherit'
            borderRadius='inherit'
            fontWeight='bold'
            _hover={{ color: { mainText } }}
            _active={{
              bg: "inherit",
              transform: "none",
              borderColor: "transparent",
            }}
            _focus={{
              boxShadow: "none",
            }}>
            {brandText == "TIER A" ? "NUMBANCO / TIER A" : brandText == "TIER B" ? "NUMBANCO / Tier B" : brandText == "TIER C" ? "NUMBANCO / Tier C" : brandText}
          </Link>
        </Box>
        <Box ms='auto' w={{ sm: "100%", md: "unset" }} display="flex" alignItems="center">
          <AdminNavbarLinks
            onOpen={props.onOpen}
            logoText={props.logoText}
            secondary={props.secondary}
            fixed={props.fixed}
            setIsAuth={setIsAuth}
          />
        </Box>
      </Flex>
    </Flex>
  );
}

AdminNavbar.propTypes = {
  brandText: PropTypes.string,
  variant: PropTypes.string,
  secondary: PropTypes.bool,
  fixed: PropTypes.bool,
  onOpen: PropTypes.func,
};