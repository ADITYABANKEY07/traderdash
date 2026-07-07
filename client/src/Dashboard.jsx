import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";

const Dashboard = () => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* pt-14 on mobile offsets the fixed topbar (h ≈ 56px); removed on lg where sidebar is static */}
      <main className="flex-1 bg-slate-950 p-6 pt-20 lg:pt-6 overflow-y-auto text-white">
        <Outlet />
      </main>
    </div>
  );
};

export default Dashboard;