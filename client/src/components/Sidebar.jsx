import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  LineChart,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const menuItems = [
  { name: "Overview", path: "/admin/overview", icon: LayoutDashboard },
  { name: "Traders",  path: "/admin/traders",  icon: Users },
  { name: "Goals",    path: "/admin/goals",    icon: LineChart },
  { name: "Settings", path: "/admin/settings", icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);

  const adminInfo = JSON.parse(localStorage.getItem("adminInfo") || "null");

  // Close sidebar whenever the route changes (user tapped a nav link on mobile)
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Lock body scroll while mobile sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminInfo");
    navigate("/admin-login");
  };

  // Shared inner content so we don't duplicate JSX between mobile and desktop
  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-slate-700 p-6">
        <div>
          <h1 className="text-2xl font-bold">
            Trading<span className="text-blue-500">Dash</span>
          </h1>
          <p className="text-sm text-gray-400">Admin Control Panel</p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="flex lg:hidden items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon  = item.icon;
            const active = location.pathname === item.path ||
                           location.pathname.startsWith(item.path + "/");
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Admin Profile + Logout */}
      <div className="border-t border-slate-700 p-4">
        <div className="mb-3 px-1">
          <p className="font-semibold text-white leading-tight">
            {adminInfo?.name || "Admin"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {adminInfo?.email || "admin@tradingdash.com"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar — always visible ── */}
      <aside className="hidden lg:flex w-72 min-h-screen shrink-0 flex-col bg-slate-900 text-white shadow-xl">
        <SidebarContent />
      </aside>

      {/* ── Mobile: fixed topbar with hamburger ── */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-slate-900 px-4 py-3 shadow-lg lg:hidden">
        <h1 className="text-lg font-bold text-white">
          Trading<span className="text-blue-500">Dash</span>
        </h1>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* ── Mobile: backdrop overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile: slide-in drawer ── */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 flex-col bg-slate-900 text-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
