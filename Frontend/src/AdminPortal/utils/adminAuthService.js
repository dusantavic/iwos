import { jwtDecode } from "jwt-decode";
import adminApi from "./adminAxiosInstance";

// Admin tokens are kept in their own localStorage keys so that signing into
// the internal admin portal in one tab does not clobber a manager or
// employee-portal session in another. There is no "remember me" toggle here —
// internal staff sessions always persist in localStorage, mirroring the
// employee portal's simpler (always-persisted) storage model.
const ACCESS_KEY = "adminAccessToken";
const REFRESH_KEY = "adminRefreshToken";
const USER_KEY = "adminUser";

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
export const setAccessToken = (token) => localStorage.setItem(ACCESS_KEY, token);

export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export const setRefreshToken = (token) => localStorage.setItem(REFRESH_KEY, token);

export const setUser = (token) => {
  const decoded = jwtDecode(token);
  const user = {
    firstName: decoded.firstName,
    lastName: decoded.lastName,
    username: decoded.name,
    id: decoded.nameid,
  };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearAdminTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
};

async function validateTokenOnServer() {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const response = await adminApi.get("/AdminPortal/ValidateToken");
    return response.status === 200;
  } catch {
    return false;
  }
}

export const isAuthenticated = async () => {
  return await validateTokenOnServer();
};
