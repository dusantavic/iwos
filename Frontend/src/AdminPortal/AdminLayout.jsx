import { Outlet } from "react-router-dom";
import { ToastContainer, Zoom } from "react-toastify";
import AdminPortalHeader from "./AdminPortalHeader";

export default function AdminLayout() {
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

      <AdminPortalHeader />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
