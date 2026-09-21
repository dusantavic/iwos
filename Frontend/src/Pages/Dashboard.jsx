import NewEmployeesListCard from "../Cards/NewEmployeesListCard";
import DepartmentsListCard from "../Cards/DepartmentsListCard";
import TodaysAvailabilityCard from "../Cards/TodaysAvailabilityCard";
import SimpleCardStats from "../Cards/SimpleCardStats";
import DashboardAdditionalStats from "../DashboardAdditionalStats";
import { useEffect, useState } from "react";
import api from "../utils/axiosInstance";
import { toast } from "react-toastify";
import UpcomingAnniversariesCard from "../Cards/UpcomingAnniversariesCard";
import UpcomingAbsencesCard from "../UpcomingAbsencesCard";
import Skeleton from "./Skeleton";
import PendingAbsencesList from "../PendingAbsencesList";
import LatestTodos from "../LatestToDos";
import AbsenceUpdatesCard from "../AbsenceUpdatesCard";
import CriticalAbsencesCard from "../CriticalAbsencesCard";
import TodayAvailabilityChart from "../TodayAvailabilityChart";

export default function Dashboard() {
  const [loading, setLoading] = useState(true); 

  const [employeesBasicStats, setEmployeesBasicStats] = useState(null);
  const [newEmployees, setNewEmployees] = useState([]);
  const [largestDepartments, setLargestDepartments] = useState([]);
  const [attritionRate, setAttritionRate] = useState(null);
  const [departmentsCounts, setDepartmentsCounts] = useState([]); 
  const [employeesGrowthData, setEmployeesGrowthData] = useState([]); 

      const fetchEmployeesBasicStats = async () => {
      try {
        const response = await api.get("/Employee/GetEmployeesBasicStats");
        setEmployeesBasicStats(response.data);
      } catch (error) {
        toast.error("Error while fetching basic stats");
        console.log("Error while fetching basic stats", error);
      }
    };

    const fetchNewEmployeesList = async () => {
      try {
        const response = await api.get("/Employee/GetNewEmployeesList");
        setNewEmployees(response.data);
      } catch (error) {
        toast.error("Error while fetching new employees list");
        console.log("Error while fetching new employees list", error);
      }
    };

    const fetchLargestDepartmentsList = async () => {
      try {
        const response = await api.get("/Department/GetLargestDepartmentsList");
        setLargestDepartments(response.data);
      } catch (error) {
        toast.error("Error while fetching largest departments list");
        console.log("Error while fetching largest departments list", error);
      }
    };

    const fetchAttritionRate = async (yearsPeriod = null) => {
      try {
        if (yearsPeriod) {
          var response = await api.get(
            `/Employee/GetAttritionRate?yearsPeriod=${yearsPeriod}`,
          );
        } else {
          var response = await api.get("/Employee/GetAttritionRate");
        }
        setAttritionRate(response.data);
      } catch (error) {
        toast.error("Error while fetching attrition rate");
        console.log("Error while fetching attrition rate", error);
      }
    };

    const fetchDepartmentsCounts = async () => { 
        try { 
            const response = await api.get("/Department/GetDepartmentsCounts"); 
            setDepartmentsCounts(response.data); 
        }
        catch (error) { 
            toast.error("Error while fetching departments counts"); 
            console.log("Error while fetching departments counts", error); 
        }
    }

    const fetchEmployeesGrowthData = async (yearsPeriod = null) => {
      try {
        if (yearsPeriod) {
          var response = await api.get(
            `/Employee/GetEmployeesChartData?yearsPeriod=${yearsPeriod}`,
          );
        } else {
          var response = await api.get("/Employee/GetEmployeesChartData");
        }
        setEmployeesGrowthData(response.data);
      } catch (error) {
        toast.error("Error while fetching employees growth data");
        console.log("Error while fetching employees growth data", error);
      }
    };

  useEffect(() => {
    const load = async () => { 
        await fetchEmployeesBasicStats();
        //await fetchNewEmployeesList();
        await fetchLargestDepartmentsList();
        // await fetchAttritionRate(); 
        await fetchDepartmentsCounts(); 
        await fetchEmployeesGrowthData();
        setLoading(false);
    }

    load(); 
  }, []);

  return (
    <>
    {loading && <Skeleton />}
    <div className="flex flex-row min-w-full gap-5 flex-wrap">
      <div className="flex flex-col max-w-[20vw] gap-3">
        <SimpleCardStats
          number={employeesBasicStats?.totalEmployees}
          text={"Total employees"}
        />
        <TodaysAvailabilityCard availability={employeesBasicStats?.todaysAvailability?.toFixed(1)}/>
      </div>
      <div className="flex-grow flex">
      {/* <LatestTodos /> */}
      <AbsenceUpdatesCard />
      </div>
      <div className="w-md">
        <CriticalAbsencesCard />
      </div>
      
      <PendingAbsencesList open={false}/>

      <div className="w-screen flex gap-3">
        <div className="flex flex-grow">
          <UpcomingAbsencesCard/>
        </div>
        <UpcomingAnniversariesCard/>
      </div>

      {/* <NewEmployeesListCard newEmployees={newEmployees} /> */}
      
      <DepartmentsListCard departments={largestDepartments} />
   
      <DashboardAdditionalStats attritionRate={attritionRate} departmentsCounts={departmentsCounts} employeesGrowthData={employeesGrowthData} 
          fetchEmployeesGrowthData={fetchEmployeesGrowthData} fetchAttritionRate={fetchAttritionRate}/>
    </div>
    </>
  );
}
