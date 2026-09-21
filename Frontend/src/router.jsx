
import './index.css'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import Dashboard from './Pages/Dashboard.jsx'
import DashboardV2 from './Pages/DashboardV2.jsx'
import EmployeesPage from './Pages/EmployeesPage.jsx'
import MainLayout from './MainLayout.jsx'
import PageNotFound from './Pages/PageNotFound.jsx'
import DepartmentsPage from './Pages/DepartmentsPage.jsx'
import EmployeeDetailsPage from './Pages/EmployeeDetailsPage.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import AddEmployee from './Pages/AddEmployee.jsx'
import LoginPage from './LoginPage.jsx'
import ScheduleADemo from './ScheduleADemo.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import NotesPage from './Pages/NotesPage.jsx'
import DepartmentDetailsPage from './Pages/DepartmentDetailsPage.jsx'
import AbsencesPage from './Pages/AbsencesPage.jsx'
import TodosPage from './Pages/ToDosPage.jsx'
import EmployeePortalPage from './Pages/EmployeePortalPage.jsx'
import EmployeeShiftsPage from './Pages/EmployeeShiftsPage.jsx'
import ShiftPlannerPage from './Pages/ShiftPlannerPage.jsx'
import ShiftsConfigurationPage from './Pages/ShiftsConfigurationPage.jsx'
import WorkingTimePage from './Pages/WorkingTimePage.jsx'
import CapacityPage from './Pages/CapacityPage.jsx'
import ClientOverview from './Pages/ClientOverview.jsx'
import PortalLayout from './EmployeePortal/PortalLayout.jsx'
import PortalLoginPage from './EmployeePortal/Pages/PortalLoginPage.jsx'
import PortalProtectedRoute from './EmployeePortal/PortalProtectedRoute.jsx'
import AdminLayout from './AdminPortal/AdminLayout.jsx'
import AdminLoginPage from './AdminPortal/Pages/AdminLoginPage.jsx'
import AdminProtectedRoute from './AdminPortal/AdminProtectedRoute.jsx'
import AdminDashboardPage from './AdminPortal/Pages/AdminDashboardPage.jsx'
import AdminClientsPage from './AdminPortal/Pages/AdminClientsPage.jsx'
import AdminClientDetailPage from './AdminPortal/Pages/AdminClientDetailPage.jsx'

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/demo",
    element: <ScheduleADemo />,
  },
  // Employee portal runs on its own auth pipeline (portal JWT + portal protected
  // route) so a manager session cannot grant access to portal screens and vice
  // versa — each module has isolated token storage.
  {
    path: "/portal/login",
    element: <PortalLoginPage />,
  },
  {
    element: <PortalProtectedRoute />,
    children: [
      {
        path: "/portal",
        element: <PortalLayout />,
        children: [
          { index: true, element: <Navigate to="shifts" replace /> },
          { path: "absences", element: <EmployeePortalPage /> },
          { path: "shifts", element: <EmployeeShiftsPage /> },
        ],
      },
    ],
  },
  // Internal admin portal runs on its own auth pipeline (admin JWT + admin
  // protected route), fully isolated from both the manager and employee
  // portal auth domains — for internal Iwos staff only, never client-facing.
  {
    path: "/admin/login",
    element: <AdminLoginPage />,
  },
  {
    element: <AdminProtectedRoute />,
    children: [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "clients", element: <AdminClientsPage /> },
          { path: "clients/:id", element: <AdminClientDetailPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <DashboardV2 />,
          },
          {
            path: "dashboard-v1",
            element: <Dashboard />,
          },
          {
            path: "employees",
            element: <EmployeesPage />,
          },
          {
            path: "departments",
            element: <DepartmentsPage />,
          },
          {
            path: "employee/:employeeId",
            element: <EmployeeDetailsPage />,
          },
          {
            path: "admin",
            element: <AdminDashboard />,
          },
          {
            path: "employee/new",
            element: <AddEmployee />,
          },
          {
            path: "notes",
            element: <NotesPage />,
          },
          {
            path: "todos",
            element: <TodosPage />,
          },
          {
            path: "absences",
            element: <AbsencesPage />,
          },
          {
            path: "shifts",
            element: <ShiftPlannerPage />,
          },
          {
            path: "shifts/configure",
            element: <ShiftsConfigurationPage />,
          },
          {
            path: "working-time",
            element: <WorkingTimePage />,
          },
          {
            path: "capacity",
            element: <CapacityPage />,
          },
          {
            path: "client",
            element: <ClientOverview />,
          },
          {
            path: "department/:departmentId",
            element: <DepartmentDetailsPage />,
          },
          {
            path: "*",
            element: <PageNotFound />,
          },
        ],
      },
    ],
  },
]);

export default router; 
