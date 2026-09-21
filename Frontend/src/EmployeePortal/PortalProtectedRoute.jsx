import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { isAuthenticated } from "./utils/portalAuthService";

const PortalProtectedRoute = () => {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const result = await isAuthenticated();
      setAllowed(result);
      setChecking(false);
    };
    verify();
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
        Checking access...
      </div>
    );
  }

  return allowed ? <Outlet /> : <Navigate to="/portal/login" replace />;
};

export default PortalProtectedRoute;
