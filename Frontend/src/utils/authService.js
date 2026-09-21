import api from "./axiosInstance";
import { jwtDecode } from "jwt-decode";

// "Remember me" controls which storage backs the auth tokens:
//   • localStorage  → tokens survive browser restarts
//   • sessionStorage → tokens cleared when the tab is closed
// The active storage is recorded in localStorage under PERSIST_KEY so the axios
// interceptor's token-refresh path writes the rotated access token to the same
// place the user originally chose at login time.

const PERSIST_KEY = "auth_persist";
const REMEMBERED_USERNAME_KEY = "remembered_username";

const activeStorage = () =>
  localStorage.getItem(PERSIST_KEY) === "true" ? localStorage : sessionStorage;

const readEither = (key) =>
  localStorage.getItem(key) ?? sessionStorage.getItem(key);

const removeBoth = (key) => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
};

export const setRememberMe = (remember) => {
  if (remember) localStorage.setItem(PERSIST_KEY, "true");
  else localStorage.removeItem(PERSIST_KEY);
};

export const getRememberedUsername = () =>
  localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? "";

export const setRememberedUsername = (username) => {
  if (username) localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
  else localStorage.removeItem(REMEMBERED_USERNAME_KEY);
};

export const getAccessToken = () => readEither("accessToken");
export const setAccessToken = (token) => activeStorage().setItem("accessToken", token);

export const getRefreshToken = () => readEither("refreshToken");
export const setRefreshToken = (token) => activeStorage().setItem("refreshToken", token);

export const setUser = (token) => {
  const decodedToken = jwtDecode(token);

  const user = {
    firstName: decodedToken.firstName,
    lastName: decodedToken.lastName,
    profilePictureSrc: decodedToken.profilePictureSrc,
    id: decodedToken.nameid,
  };

  activeStorage().setItem("user", JSON.stringify(user));
};

export const getUser = () => {
  const user = readEither("user");
  return user ? JSON.parse(user) : null;
};

export const clearTokens = () => {
  removeBoth("accessToken");
  removeBoth("refreshToken");
  removeBoth("user");
  localStorage.removeItem(PERSIST_KEY);
};

async function validateTokenOnServer() {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const response = await api.get("/Account/ValidateToken");
    return response.status === 200;
  } catch {
    return false;
  }
}

export const isAuthenticated = async () => {
  return await validateTokenOnServer();
};
