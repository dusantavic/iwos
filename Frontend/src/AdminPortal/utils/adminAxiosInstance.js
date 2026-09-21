import axios from "axios";
import PQueue from "p-queue";
import {
  clearAdminTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from "./adminAuthService";

// Dedicated axios instance for the internal admin portal. A distinct instance
// keeps interceptor state, token storage, and the 401→refresh loop fully
// isolated from the manager application and the employee portal, so a
// mis-wired import can never leak the wrong token into the wrong audience.
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "/api/v1";

const adminApi = axios.create({
  baseURL: API_BASE_URL,
});

const queue = new PQueue({ concurrency: 5 });

adminApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return queue.add(() => Promise.resolve(config));
});

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      try {
        const response = await axios.post(
          `${API_BASE_URL}/AdminPortal/RefreshToken`,
          { accessToken, refreshToken },
        );
        const newAccessToken = response.data.accessToken;
        setAccessToken(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return adminApi(originalRequest);
      } catch (err) {
        clearAdminTokens();
        window.location.href = "/admin/login";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);

export default adminApi;
