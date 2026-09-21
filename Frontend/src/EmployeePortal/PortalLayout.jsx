import { Outlet } from "react-router-dom";
import { ToastContainer, Zoom } from "react-toastify";
import EmployeePortalHeader from "./EmployeePortalHeader";
import Footer from "../Footer";

export default function PortalLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
        <ToastContainer
        position="top-right"
        autoClose={4000}
        transition={Zoom}
        closeOnClick
        pauseOnHover
        draggable={false}
        theme="light"
      />

      <EmployeePortalHeader />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
