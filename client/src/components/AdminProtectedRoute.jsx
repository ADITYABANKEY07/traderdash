import React from "react";
import { Navigate } from "react-router-dom";

// Wraps private admin routes — redirects to the admin login page if no admin JWT token is stored
const AdminProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("adminToken");

  if (!token) {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
};

export default AdminProtectedRoute;
