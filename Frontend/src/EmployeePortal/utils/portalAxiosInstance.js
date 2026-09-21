import axios from "axios";
import PQueue from "p-queue";
import {
  clearPortalTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from "./portalAuthService";

// Dedicated axios instance for the employee portal. A distinct instance keeps
// interceptor state, token storage, and the 401→refresh loop fully isolated
// from the manager application, so a mis-wired import can never leak the wrong
// token into the wrong audience.
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "/api/v1";

const portalApi = axios.create({
  baseURL: API_BASE_URL,
});

const queue = new PQueue({ concurrency: 5 });

portalApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return queue.add(() => Promise.resolve(config));
});

portalApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      try {
        const response = await axios.post(
          `${API_BASE_URL}/EmployeePortal/RefreshToken`,
          { accessToken, refreshToken },
        );
        const newAccessToken = response.data.accessToken;
        setAccessToken(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return portalApi(originalRequest);
      } catch (err) {
        clearPortalTokens();
        window.location.href = "/portal/login";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);

export default portalApi;
