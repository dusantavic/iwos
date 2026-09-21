import EmployeeCalendar from "../EmployeeInfo/EmployeeCalendar";
import EmployeeProfileCard from "../EmployeeInfo/EmployeeProfileCard";
import EmployeeBasicInfo from "../EmployeeInfo/EmployeeBasicInfo";
import EmployeePersonalData from "../EmployeeInfo/EmployeePersonalData";
import EmployeeSchedulingPreferences from "../EmployeeInfo/EmployeeSchedulingPreferences";
import EmployeeFiles from "../EmployeeInfo/EmployeeFiles";
import EmployeeNotes from "../EmployeeInfo/EmployeeNotes";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../utils/axiosInstance";
import Skeleton from "./Skeleton";
import { toast } from "react-toastify";
import { durationFromDate } from "../utils/dateFormatter";
import EmployeeAbsenceTimeline from "../EmployeeAbsenceTimeline";
import EmployeeTodos from "../EmployeeInfo/EmployeeToDos";
import { ArrowUpRight, Briefcase, Calendar, CheckCircle2, Clock, TrendingUp, UserX, AlertTriangle } from "lucide-react";

export default function EmployeeDetailsPage() {
  const [loading, setLoading] = useState(true);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [absencesTimelineRefreshFlag, setAbsencesTimelineRefreshFlag] = useState(false);
  const [absenceStats, setAbsenceStats] = useState(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const { employeeId } = useParams();
  const navigate = useNavigate();

    const fecthEmployeeAbsenceStats = async () => {
    try {
      const result = await api.get(
        `/Absence/GetEmployeeAbsenceStats?employeeId=${employeeId}`,
      );
      setAbsenceStats(result.data);
    } catch (err) {
      toast.error("Error while fetching absence stats");
    }
  };

  const fetchEmployeeDetails = async () => {
    try {
      const result = await api.get(
        `/Employee/GetEmployeeDetails?employeeId=${employeeId}`
      );

      if (result.data) {
        setEmployeeDetails(result.data);
      }

    } catch (error) {
      toast.error("Error while fetching employee details"); 
      console.log("Error while fetching employee details.", error);
    }
    finally { 
      setLoading(false); 
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await api.patch(`/Employee/DeactivateEmployee?employeeId=${employeeId}`);
      toast.success(`${employeeDetails.firstName} ${employeeDetails.lastName} has been deactivated.`);
      navigate("/employees");
    } catch {
      toast.error("Failed to deactivate employee. Please try again.");
    } finally {
      setDeactivating(false);
      setShowDeactivateModal(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDetails();
    fecthEmployeeAbsenceStats();
  }, []);

  return (
    <div className="min-h-screen text-gray-800 font-sans space-y-4">
      {loading && <Skeleton />}

      {employeeDetails && (
        <>
          {/* Top section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <EmployeeProfileCard
              employeeId={employeeId}
              name={employeeDetails.firstName + " " + employeeDetails.lastName}
              position={employeeDetails.position}
              imgSrc={profileImageUrl}
            />

            <EmployeeBasicInfo
              employeeId={employeeId}
              email={employeeDetails.contactEmail}
              country={employeeDetails.country}
              department={employeeDetails.department}
              departmentId={employeeDetails.departmentId}
              position={employeeDetails.position}
              positionId={employeeDetails.positionId}
              refresh={fetchEmployeeDetails}
            />
          </div>

          <EmployeePersonalData
            employeeId={employeeId}
            firstName={employeeDetails.firstName}
            lastName={employeeDetails.lastName}
            personalId={employeeDetails.personalId}
            contractType={employeeDetails.contractType}
            birthDate={employeeDetails.birthDate}
            refresh={fetchEmployeeDetails}
          />

          <EmployeeSchedulingPreferences
            employeeId={employeeId}
            weeklyHours={employeeDetails.weeklyHours}
            weeklyDays={employeeDetails.weeklyDays}
            rotationPatternId={employeeDetails.rotationPatternId}
            pinnedShiftId={employeeDetails.pinnedShiftId}
            rotationAnchorDate={employeeDetails.rotationAnchorDate}
            refresh={fetchEmployeeDetails}
          />

          <EmployeeFiles employeeId={employeeId} />

          <EmployeeCalendar employeeId={employeeId} triggerAbsencesTimelineRefreshFlag={() => setAbsencesTimelineRefreshFlag(!absencesTimelineRefreshFlag)}/>
          <EmployeeAbsenceTimeline employeeId={employeeId} refreshFlag = {absencesTimelineRefreshFlag}/>
            
          <EmployeeNotes
            passedNotes={employeeDetails.notes}
            employeeId={employeeId}
          />

          <EmployeeTodos
            passedToDos={employeeDetails.toDos}
            employeeId={employeeId}
          />

          {/* Deactivation */}
          <div className="rounded-3xl border border-red-100 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <h3 className="text-sm font-semibold text-red-600">Deactivation</h3>
            </div>
            <div className="px-6 py-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Deactivate employee</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Marks the employee as no longer part of the company. This sets their end date to today and removes them from all active scheduling.
                </p>
              </div>
              <button
                onClick={() => setShowDeactivateModal(true)}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
              >
                <UserX className="w-4 h-4" />
                Deactivate
              </button>
            </div>
          </div>

        </>
      )}

      {/* Deactivate confirmation modal */}
      {showDeactivateModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !deactivating && setShowDeactivateModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Deactivate employee</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-700">
                    {employeeDetails.firstName} {employeeDetails.lastName}
                  </span>{" "}
                  will be marked as inactive with today as their end date. This cannot be undone from the UI.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowDeactivateModal(false)}
                disabled={deactivating}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deactivating ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
                  </svg>
                ) : (
                  <UserX className="w-4 h-4" />
                )}
                {deactivating ? "Deactivating…" : "Yes, deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
