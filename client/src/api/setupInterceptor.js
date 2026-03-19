import axiosInstance from "./axiosConfig";

export const setupInterceptors = (setIsAuth) => {
    axiosInstance.interceptors.response.use(
        (response) => {
            if(response?.data?.authenticated === false) setIsAuth(false);
            return response
        },
        (error) => {
            // if (error.response?.status === 401) {
            //     setIsAuth(false);
            // }
            return Promise.reject(error);
        }
    );
};