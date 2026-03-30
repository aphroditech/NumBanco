import axios from "axios";

/** Base URL without trailing slash; `/api` is appended (see client/.env `REACT_APP_API_BASE_URL`). */
const RAW = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API = `${String(RAW).replace(/\/$/, "")}/api`;

const axiosInstance = axios.create({
    baseURL: API,
    headers: {
        "Content-Type": "application/json",
    },
});

axiosInstance.interceptors.request.use(
    (config) => {

        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default axiosInstance;

// but as you can see two users show different graph and time so I think I have to use ably socket