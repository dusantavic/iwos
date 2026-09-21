import NewEmployeesChartCard from "./Cards/NewEmployeesChartCard";
import RecentNotesCard from "./Cards/RecentNotesCard";
import UpcomingAnniversariesCard from "./Cards/UpcomingAnniversariesCard";

export default function EmployeesPageStats() {
    return (
        <>
            <div className="flex flex-col gap-3">

                <div className="flex gap-3 mt-3">
                    <NewEmployeesChartCard />
                    <UpcomingAnniversariesCard />
                </div>

                <RecentNotesCard />
            </div>
        </>
    )
}