import { jwtDecode } from "jwt-decode";
import portalApi from "./portalAxiosInstance";

// Portal tokens are kept in their own localStorage keys so that signing into
// the employee portal in one tab does not clobber a manager session in another.
const ACCESS_KEY = "portalAccessToken";
const REFRESH_KEY = "portalRefreshToken";
const USER_KEY = "portalUser";

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
export const setAccessToken = (token) => localStorage.setItem(ACCESS_KEY, token);

export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export const setRefreshToken = (token) => localStorage.setItem(REFRESH_KEY, token);

export const setUser = (token) => {
  const decoded = jwtDecode(token);
  const user = {
    firstName: decoded.firstName,
    lastName: decoded.lastName,
    profilePictureSrc: decoded.profilePictureSrc,
    username: decoded.name,
    employeeAccountId: decoded.nameid,
    employeeId: decoded.employee_id,
    // `id` is an alias for `employeeId` so components that originally read the
    // manager `getUser().id` keep working after being rewired to the portal.
    id: decoded.employee_id,
    clientId: decoded.tid,
  };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearPortalTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
};

async function validateTokenOnServer() {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const response = await portalApi.get("/EmployeePortal/ValidateToken");
    return response.status === 200;
  } catch {
    return false;
  }
}

export const isAuthenticated = async () => {
  return await validateTokenOnServer();
};
