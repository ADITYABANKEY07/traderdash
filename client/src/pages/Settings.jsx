import React, { useEffect, useState } from "react";
import axios from "axios";
import { Sun, Moon, Monitor, Loader2 } from "lucide-react";

const API_BASE = "https://traderdash-c8fz.onrender.com";

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-lg shadow-black/20 ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-5">
          {title && <h3 className="text-sm font-semibold text-slate-100">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const Settings = () => {
  const [theme, setTheme] = useState("dark");
  const [density, setDensity] = useState("comfortable");
  const [accent, setAccent] = useState("#22d3ee");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
  });

  // Load saved appearance settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE}/settings`, authHeaders());
        setTheme(res.data.theme);
        setDensity(res.data.density);
        setAccent(res.data.accentColor);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Persist a single field to the backend, optimistically updating local state first
  const saveSetting = async (patch) => {
    setSaving(true);
    setError("");
    try {
      await axios.put(`${API_BASE}/settings`, patch, authHeaders());
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (key) => {
    setTheme(key);
    saveSetting({ theme: key });
  };

  const handleDensityChange = (key) => {
    setDensity(key);
    saveSetting({ density: key });
  };

  const handleAccentChange = (color) => {
    setAccent(color);
    saveSetting({ accentColor: color });
  };

  const themes = [
    { key: "dark", label: "Dark", icon: Moon },
    { key: "light", label: "Light", icon: Sun },
    { key: "system", label: "System", icon: Monitor },
  ];

  const densities = [
    { key: "compact", label: "Compact" },
    { key: "comfortable", label: "Comfortable" },
    { key: "spacious", label: "Spacious" },
  ];

  const accentColors = ["#22d3ee", "#818cf8", "#34d399", "#f472b6", "#fbbf24"];

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">Settings</h1>
            <p className="text-sm text-slate-500">Customize how the dashboard looks</p>
          </div>
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </span>
          )}
        </div>

        {error && (
          <p className="mb-4 max-w-2xl rounded-lg bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-400">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4 max-w-2xl">
          <Panel title="Theme" subtitle="Choose how the dashboard looks on your device">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {themes.map((t) => {
                const Icon = t.icon;
                const active = theme === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => handleThemeChange(t.key)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors ${
                      active
                        ? "border-cyan-500/50 bg-cyan-400/10"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-cyan-400" : "text-slate-400"}`} />
                    <span className={`text-sm font-medium ${active ? "text-cyan-400" : "text-slate-300"}`}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Layout Density" subtitle="Control spacing across tables and cards">
            <div className="flex flex-wrap gap-2">
              {densities.map((d) => (
                <button
                  key={d.key}
                  onClick={() => handleDensityChange(d.key)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    density === d.key
                      ? "bg-cyan-400/10 text-cyan-400 border border-cyan-500/30"
                      : "bg-slate-950/40 text-slate-400 border border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Accent Color" subtitle="Pick the highlight color used across charts and buttons">
            <div className="flex flex-wrap gap-3">
              {accentColors.map((c) => (
                <button
                  key={c}
                  onClick={() => handleAccentChange(c)}
                  className="h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-slate-900 transition-all"
                  style={{
                    backgroundColor: c,
                    "--tw-ring-color": accent === c ? c : "transparent",
                  }}
                />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default Settings;
