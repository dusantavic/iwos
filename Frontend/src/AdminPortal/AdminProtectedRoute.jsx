import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { isAuthenticated } from "./utils/adminAuthService";

const AdminProtectedRoute = () => {
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
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">
        Checking access...
      </div>
    );
  }

  return allowed ? <Outlet /> : <Navigate to="/admin/login" replace />;
};

export default AdminProtectedRoute;
