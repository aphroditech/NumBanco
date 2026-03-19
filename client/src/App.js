import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Route, Switch, Redirect, useLocation } from "react-router-dom";
import AuthLayout from "layouts/Auth";
import AdminLayout from "layouts/Admin";
import axiosInstance from "./api/axiosConfig";
import { setupInterceptors } from "./api/setupInterceptor";
import NotFound from "components/404";
import { getUserData, getActiveUsers } from "action";
import useAblyPresence from "hooks/useAblyPresence";
import { useAblyOnOff } from "hooks/useAblyOnOff";
import Loading from "components/Loading/Loading";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
    const [isAuth, setIsAuth] = useState(false);
    const [checked, setChecked] = useState(false);
    const location = useLocation();
    const dispatch = useDispatch();
    const user = useSelector((state) => state.user?.userInfo) || {};
    const [isLoading, setIsLoading] = useState(false);

    useAblyPresence(user?.userId);
    useAblyOnOff(dispatch);

    useEffect(() => {
        setupInterceptors(setIsAuth);
    }, []);

    useEffect(() => {
        const resizeObserverErrorHandler = (e) => {
            if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
                e.stopImmediatePropagation();
                e.preventDefault();
                return;
            }
        };

        const unhandledRejectionHandler = (e) => {
            if (e.reason && e.reason.message === 'ResizeObserver loop completed with undelivered notifications.') {
                e.preventDefault();
                return;
            }
        };

        const originalConsoleError = console.error;
        console.error = (...args) => {
            if (typeof args[0] === 'string' && args[0].includes('ResizeObserver loop completed with undelivered notifications')) {
                return;
            }
            originalConsoleError.apply(console, args);
        };

        const originalConsoleWarn = console.warn;
        console.warn = (...args) => {
            if (typeof args[0] === 'string' && args[0].includes('ResizeObserver loop completed with undelivered notifications')) {
                return;
            }
            originalConsoleWarn.apply(console, args);
        };

        window.addEventListener('error', resizeObserverErrorHandler);
        window.addEventListener('unhandledrejection', unhandledRejectionHandler);

        return () => {
            window.removeEventListener('error', resizeObserverErrorHandler);
            window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const fetchUserData = async () => {
            try {
                if (isMounted) {
                    setIsLoading(true);
                }
                await getUserData(dispatch);
                await getActiveUsers(dispatch);
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchUserData();

        return () => {
            isMounted = false;
        };
    }, [dispatch]);

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            try {
                const res = await axiosInstance.get("/auth/me", { withCredentials: true });
                if (isMounted) {
                    setIsAuth(res.data.authenticated);
                }
            } catch {
                if (isMounted) {
                    setIsAuth(false);
                }
            } finally {
                if (isMounted) {
                    setChecked(true);
                }
            }
        };

        checkAuth();

        return () => {
            isMounted = false;
        };
    }, [location.pathname]);

    if (!checked) return null;

    if (isLoading) {
        return <Loading />
    }

    return (
        <>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnHover
            />

            <Switch>
                <Route
                    path="/admin"
                    render={() =>
                        isAuth ? <AdminLayout setIsAuth={setIsAuth} /> : <Redirect to="/auth/landing" />
                    }
                />
                <Route
                    path="/user"
                    render={() =>
                        isAuth ? <AdminLayout setIsAuth={setIsAuth} /> : <Redirect to="/auth/landing" />
                    }
                />
                <Route
                    path="/numbanco"
                    render={() =>
                        isAuth ? <AdminLayout setIsAuth={setIsAuth} /> : <Redirect to="/auth/landing" />
                    }
                />
                <Route
                    path="/game"
                    render={() =>
                        isAuth ? <AdminLayout setIsAuth={setIsAuth} /> : <Redirect to="/auth/landing" />
                    }
                />
                <Route
                    path="/transaction"
                    render={() =>
                        isAuth ? <AdminLayout setIsAuth={setIsAuth} /> : <Redirect to="/auth/landing" />
                    }
                />
                <Route
                    path="/help"
                    render={() =>
                        isAuth ? <AdminLayout setIsAuth={setIsAuth} /> : <Redirect to="/auth/landing" />
                    }
                />
                <Route
                    path="/auth"
                    render={() =>
                        isAuth ? <Redirect to="/user/dashboard" /> : <AuthLayout setIsAuth={setIsAuth} />
                    }
                />

                <Redirect exact from="/" to="/user/dashboard" />
                <Route component={NotFound} />
            </Switch>
        </>
    );
};

export default App;