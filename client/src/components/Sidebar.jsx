import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Wallet,
  LineChart,
  Shield,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Populated by AdminLogin.jsx on successful sign-in
  const adminInfo = JSON.parse(localStorage.getItem("adminInfo") || "null");

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminInfo");
    navigate("/admin-login");
  };

  const menuItems = [
    {
      name: "Overview",
      path: "/admin/overview",
      icon: LayoutDashboard,
    },
    {
      name: "Traders",
      path: "/admin/traders",
      icon: Users,
    },
    {
      name: "Goals",
      path: "/admin/goals",
      icon: LineChart,
    },
    // {
    //   name: "Risk Management",
    //   path: "/admin/risk-management",
    //   icon: Shield,
    // },
    // {
    //   name: "Reports",
    //   path: "/admin/reports",
    //   icon: FileText,
    // },
    {
      name: "Settings",
      path: "/admin/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-72 min-h-screen bg-slate-900 text-white flex flex-col shadow-xl">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold">
          Trading<span className="text-blue-500">Dash</span>
        </h1>
        <p className="text-sm text-gray-400">
          Admin Control Panel
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${
                      location.pathname === item.path
                        ? "bg-blue-600 text-white"
                        : "hover:bg-slate-800 text-gray-300"
                    }`}
                >
                  <Icon size={20} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Admin Profile */}
      <div className="border-t border-slate-700 p-4">
        <div className="mb-4">
          <h3 className="font-semibold">{adminInfo?.name || "Admin"}</h3>
          <p className="text-sm text-gray-400">
            {adminInfo?.email || "admin@tradingdash.com"}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;