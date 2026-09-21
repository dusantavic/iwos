import { useState } from "react";
import AbsenceCalendar from "../AbsenceCalendar";
import Skeleton from "./Skeleton";
import AbsencePolicyList from "../AbsencePolicyList";
import AbsenceUpdatesCard from "../AbsenceUpdatesCard";
import PendingAbsencesPanel from "../PendingAbsencesPanel";

export default function AbsencesPage() {
  const [loading, setLoading] = useState(true);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const bumpRefresh = () => setRefreshFlag((v) => v + 1);

  return (
    <>
      {loading && <Skeleton />}

      <div className="mb-6">
        <PendingAbsencesPanel refreshFlag={refreshFlag} onChanged={bumpRefresh} />
      </div>

      <div className="mb-6">
        <AbsenceCalendar
          setLoading={setLoading}
          refreshPendingFlag={refreshFlag}
          setRefreshPendingFlag={bumpRefresh}
        />
      </div>

      <AbsencePolicyList />

      <div className="mt-6">
        <AbsenceUpdatesCard aisPage={true} />
      </div>
    </>
  );
}
