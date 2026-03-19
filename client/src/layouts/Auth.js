import React from "react";
import { Redirect, Route, Switch } from "react-router-dom";
// chakra imports
import { Box, ChakraProvider, Portal } from "@chakra-ui/react";
// core components
import AuthNavbar from "components/Navbars/AuthNavbar.js";
import routes from "routes.js";
import theme from "theme/themeAuth.js";

import NotFound from "components/404";

export default function Pages(props) {
    const { setIsAuth } = props;
    const wrapper = React.createRef();
    React.useEffect(() => {
        document.body.style.overflow = "unset";
        return function cleanup() { };
    });
    const getRoutes = (routes) => {
        return routes.map((prop, key) => {
            if (prop.layout === "/auth") {
                if (prop.name === "landing") {
                    return (
                        <Route
                            path={prop.layout + prop.path}
                            key={key}
                            render={(routeProps) => (
                                <prop.component
                                    {...routeProps}
                                    setIsAuth={setIsAuth}
                                />
                            )}
                        />
                    )
                }
                return (
                    <Route
                        path={prop.layout + prop.path}
                        key={key}
                        render={(routeProps) => (
                            <prop.component
                                {...routeProps}
                                setIsAuth={setIsAuth}
                            />
                        )}
                    />
                );
            }
            else {
                return null;
            }
        });
    };
    const navRef = React.useRef();
    document.documentElement.dir = "ltr";
    return (
        <ChakraProvider theme={theme} resetCss={false} w='100%'>
            <Box ref={navRef} w='100%'>
                <Portal containerRef={navRef}>
                    {/* <AuthNavbar
                logoText='Num2BET'
            /> */}
                </Portal>
                <Box w='100%'>
                    <Box ref={wrapper} w='100%'>
                        <Switch>
                            {getRoutes(routes)}
                            <Redirect exact from='/auth' to='/auth/landing' />
                            <Route component={NotFound} />
                        </Switch>
                    </Box>
                </Box>
            </Box>
        </ChakraProvider>
    );
}