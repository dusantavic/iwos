import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "./utils/authService"
import { useEffect, useState } from "react";


const ProtectedRoute = () => { 
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

    if (checking) return <div className="p-6 text-white">Checking access...</div>;

    return allowed ? <Outlet /> : <Navigate to="/login" replace />; 
}; 

export default ProtectedRoute; 