import { Outlet, ScrollRestoration } from "react-router-dom";
import AppHeader from "./AppHeader";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Footer from "./Footer";
import { useState, useEffect, useRef } from "react";
import './App.css'
import { ToastContainer, Zoom } from "react-toastify";
import OnboardingModal from "./Pages/OnboardingModal";
import api from "./utils/axiosInstance";

export default function MainLayout() {
  const [activeMenu, setActiveMenu] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const onboardingChecked = useRef(false);

  useEffect(() => {
    if (localStorage.getItem("onboarding_completed")) return;
    if (onboardingChecked.current) return;
    onboardingChecked.current = true;

    api.get("/Shift/GetConfig")
      .then(async ({ data }) => {
        const hasSchedules = Array.isArray(data?.daySchedules) && data.daySchedules.length > 0;
        if (!hasSchedules) {
          if (!data?.shifts?.length) {
            await api.post("/Shift/CreateDefaultShift").catch(() => {});
          }
          setShowOnboarding(true);
        }
      })
      .catch(() => {});
  }, []);

  function toggleActiveMenu() {
    setActiveMenu(!activeMenu);
  }

  return (
    <>
        <ToastContainer
          position="top-right"
          autoClose={3900}
          toastClassName="text-sm px-2 py-2 rounded-xl"
          bodyClassName="m-0"
          hideProgressBar={false}
          closeOnClick
          pauseOnHover
          draggable
          theme="light"
          transition={Zoom}
        />

      <ScrollRestoration/>
      <Sidebar active={activeMenu} toggleActive={toggleActiveMenu} photo={null} />
      <MobileNav />

      <div className={activeMenu ? 'app activeMenu' : 'app'}>
        <div className="hidden md:block">
          <AppHeader />
        </div>

        <div className='mt-4 md:mt-10 mb-6 md:mb-10'>
          <Outlet />
        </div>

        <Footer />
      </div>

      {showOnboarding && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
          onContinue={() => setShowOnboarding(false)}
        />
      )}
    </>
  )
}