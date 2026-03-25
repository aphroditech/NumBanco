import axios from "axios";

/** Use REACT_APP_API_URL in client/.env (e.g. http://192.168.131.27:5000/api or your LAN IP). */
const API = "http://192.168.131.27:5000/api";

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