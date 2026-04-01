import React, { useState, useEffect } from "react";
import { ChakraProvider, Portal, useDisclosure } from "@chakra-ui/react";
// import Configurator from "components/Configurator/Configurator";
import Footer from "components/Footer/Footer.js";
// Layout components
import AdminNavbar from "components/Navbars/AdminNavbar.js";
import Sidebar from "components/Sidebar/Sidebar.js";
import { Redirect, Route, Switch } from "react-router-dom";
import routes from "routes.js";
import { useSelector } from "react-redux";
import useDailyLootTimer from "components/functions/userDailyLootTimer";
import { useAblyBetStart } from "hooks/useAblyBetStart";
import { getUserData } from "action"
// Custom Chakra theme
import theme from "theme/themeAdmin.js";
import NotFound from "components/404";
import FixedPlugin from "../components/FixedPlugin/FixedPlugin";
// Custom components
import MainPanel from "../components/Layout/MainPanel";
import PanelContainer from "../components/Layout/PanelContainer";
import PanelContent from "../components/Layout/PanelContent";

import { useDispatch } from "react-redux";

export default function Dashboard(props) {
    const dispatch = useDispatch();
    const { setIsAuth } = props;
    const user = useSelector((state) => state.user.userInfo);

    useDailyLootTimer(user);
    
    // Keep betStartTime in sessionStorage updated on all admin pages (dashboard, Tier A/B/C, etc.)
    useAblyBetStart(null, false, null);
    // const { ...rest } = props;
    // states and functions
    const [sidebarVariant, setSidebarVariant] = useState("transparent");
    const [fixed, setFixed] = useState(false);
    // ref for main panel div
    const mainPanel = React.createRef();
    // functions for changing the states from components
    const getRoute = () => {
        return window.location.pathname !== "/admin/full-screen-maps";
    };
    const getActiveRoute = (routes) => {
        let activeRoute = "404";
        for (let i = 0; i < routes.length; i++) {
            if (routes[i].collapse) {
                let collapseActiveRoute = getActiveRoute(routes[i].views);
                if (collapseActiveRoute !== activeRoute) {
                    return collapseActiveRoute;
                }
            } else if (routes[i].category) {
                let categoryActiveRoute = getActiveRoute(routes[i].views);
                if (categoryActiveRoute !== activeRoute) {
                    return categoryActiveRoute;
                }
            } else {
                if (
                    window.location.href.indexOf(routes[i].layout + routes[i].path) !== -1
                ) {
                    return routes[i].name;
                }
            }
        }
        return activeRoute;
    };
    // This changes navbar state(fixed or not)
    const getActiveNavbar = (routes) => {
        let activeNavbar = true;
        for (let i = 0; i < routes.length; i++) {
            if (routes[i].category) {
                let categoryActiveNavbar = getActiveNavbar(routes[i].views);
                if (categoryActiveNavbar !== activeNavbar) {
                    return categoryActiveNavbar;
                }
            } else {
                if (
                    window.location.href.indexOf(routes[i].layout + routes[i].path) !== -1
                ) {
                    if (routes[i].secondaryNavbar) {
                        return routes[i].secondaryNavbar;
                    }
                }
            }
        }
        return activeNavbar;
    };
    const getRoutes = (routes) => {
        return routes.map((prop, key) => {
            if (prop.collapse) {
                return getRoutes(prop.views);
            }
            if (prop.category === "account") {
                return getRoutes(prop.views);
            }
            if (prop.layout === "/user") {
                return (
                    <Route
                        path={prop.layout + prop.path}
                        component={prop.component}
                        key={key}
                    />
                );
            }
            if (prop.layout === "/admin") {
                return (
                    <Route
                        path={prop.layout + prop.path}
                        component={prop.component}
                        key={key}
                    />
                );
            }
            if (prop.layout === "/numbanco") {
                return (
                    <Route
                        path={prop.layout + prop.path}
                        component={prop.component}
                        key={key}
                    />
                );
            }
            if (prop.layout === "/game") {
                return (
                    <Route
                        path={prop.layout + prop.path}
                        component={prop.component}
                        key={key}
                    />
                );
            }
            if (prop.layout === "/transaction") {
                return (
                    <Route
                        path={prop.layout + prop.path}
                        component={prop.component}
                        key={key}
                    />
                );
            }
            if (prop.layout === "/help") {
                return (
                    <Route
                        path={prop.layout + prop.path}
                        component={prop.component}
                        key={key}
                    />
                );
            }
            else {
                return null;
            }
        });
    };
    const { isOpen, onOpen, onClose } = useDisclosure();
    document.documentElement.dir = "ltr";
    // Chakra Color Mode
    return (
        <ChakraProvider theme={theme} resetCss={false}>
            <Sidebar
                routes={routes}
                logoText={"NumBanco"}
                display='none'
                sidebarVariant={sidebarVariant}
            // {...rest}
            />
            <MainPanel
                ref={mainPanel}
                w={{
                    base: "100%",
                    /* Match fixed sidebar: 260px width + 16px left margin */
                    xl: "calc(100% - 276px)",
                }}>
                <Portal>
                    <AdminNavbar
                        onOpen={onOpen}
                        logoText={"NumBanco"}
                        brandText={getActiveRoute(routes)}
                        secondary={getActiveNavbar(routes)}
                        fixed={true}
                        // {...rest}
                        setIsAuth={setIsAuth}
                    />
                </Portal>
                {getRoute() ? (
                    <PanelContent>
                        <PanelContainer>
                            <Switch>
                                {getRoutes(routes)}
                                {/* <Route path="/help/faq" component={Faq} /> */}
                                <Redirect exact from='/admin' to='/user/dashboard' />
                                {/* Admin 404 */}
                                <Route component={NotFound} />
                            </Switch>
                        </PanelContainer>
                    </PanelContent>
                ) : null}
                <Footer />
                {/* <Configurator
            secondary={getActiveNavbar(routes)}
            isOpen={isOpen} // This is a boolean from useDisclosure
            onClose={onClose}
            isChecked={fixed}
            onSwitch={(value) => {
                setFixed(value);
            }}
            onOpaque={() => setSidebarVariant("opaque")}
            onTransparent={() => setSidebarVariant("transparent")}
            /> */}
            </MainPanel>
        </ChakraProvider>
    );
}