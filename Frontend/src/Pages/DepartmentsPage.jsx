import { useState } from "react";
import DepartmentsTable from "../DepartmentsTable";
import Skeleton from "./Skeleton";
import CreateDepartmentModal from "../CreateDepartmentModal";

export default function DepartmentsPage() {
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const handleCreated = () => {
    setTableRefreshKey((k) => k + 1);
  };

  return (
    <>
      {loading && <Skeleton />}
      <div className="w-full min-h-screen">
        <DepartmentsTable
          setLoading={setLoading}
          refreshKey={tableRefreshKey}
          onNewDepartment={() => setShowCreateModal(true)}
        />
      </div>

      {showCreateModal && (
        <CreateDepartmentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
