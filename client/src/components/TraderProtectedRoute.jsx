import React from "react";
import { Navigate } from "react-router-dom";

// Wraps private trader routes — redirects to the trader login page if no trader JWT token is stored
const TraderProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("traderToken");

  if (!token) {
    return <Navigate to="/trader-login" replace />;
  }

  return children;
};

export default TraderProtectedRoute;
