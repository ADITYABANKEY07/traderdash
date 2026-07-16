import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./Dashboard";
import Overview from "./pages/Overview";
import Traders from "./pages/Traders";
import RiskManagement from "./pages/RiskManagement";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Goals from "./pages/Goals";
import TraderDashboard from "./pages/TraderDashboard";
import AdminLogin from "./authpages/AdminLogin";
import TraderLogin from "./authpages/TraderLogin";
import TraderSignup from "./authpages/TraderSignup";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import TraderProtectedRoute from "./components/TraderProtectedRoute";
const App = () => {
  return (
    <Routes>
      {/* Default landing — send to the admin login */}
      <Route path="/" element={<Navigate to="/admin-login" replace />} />

      {/* Admin auth */}
      <Route path="admin-login" element={<AdminLogin />} />

      {/* Admin dashboard — everything under /admin/* */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <Dashboard />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="overview" element={<Overview />} />
        <Route path="traders" element={<Traders />} />
        <Route path="goals" element={<Goals />} />
        <Route path="risk-management" element={<RiskManagement />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Trader auth */}
      <Route path="trader-login" element={<TraderLogin />} />
      <Route path="trader-signup" element={<TraderSignup />} />

      {/* Trader dashboard — everything under /trader/* */}
      <Route
        path="/trader/dashboard"
        element={
          <TraderProtectedRoute>
            <TraderDashboard />
          </TraderProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
