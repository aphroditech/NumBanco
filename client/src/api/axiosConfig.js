import axios from "axios";

const API = "http://localhost:5000/api";

const axiosInstance = axios.create({
    baseURL: API,
    timeout: 60000,
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