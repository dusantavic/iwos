import axios from "axios";
import { clearTokens, getAccessToken, getRefreshToken, setAccessToken } from "./authService";
import PQueue from "p-queue";

// Manager-side axios instance. The employee portal has its own dedicated
// instance (EmployeePortal/utils/portalAxiosInstance.js) with separate token
// storage and a separate refresh endpoint, so the two audiences can never
// cross-contaminate: a manager token is never sent to a portal endpoint, and
// a 401 here will never bounce a portal user back to the manager login.
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
});

const queue = new PQueue({ concurrency: 5 });

api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return queue.add(() => Promise.resolve(config));
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const accessToken = getAccessToken();
            const refreshToken = getRefreshToken();

            try {
                const response = await axios.post(`${API_BASE_URL}/Account/RefreshToken`, {
                    accessToken,
                    refreshToken
                });

                const newAccessToken = response.data.accessToken;
                setAccessToken(newAccessToken);

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (err) {
                clearTokens();
                // Never redirect a portal user to the manager login — if the
                // manager instance is somehow invoked from inside the portal,
                // fail quietly and let the portal's own interceptor handle it.
                if (!window.location.pathname.startsWith("/portal")) {
                    window.location.href = '/login';
                }
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
