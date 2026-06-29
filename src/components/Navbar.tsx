import { UserProfile } from "../types";
import { ShieldCheck, MessageSquare, Plus, Home, LogOut, Moon, Sun, Star, Bot, Globe, User } from "lucide-react";
import { translations, LanguageCode, SUPPORTED_LANGUAGES } from "../translations";

interface NavbarProps {
  user: UserProfile | null;
  activeTab: "dashboard" | "report" | "chat" | "profile";
  onTabChange: (tab: "dashboard" | "report" | "chat" | "profile") => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  lang: LanguageCode;
  onLangChange: (lang: LanguageCode) => void;
}

export default function Navbar({
  user,
  activeTab,
  onTabChange,
  onLogout,
  darkMode,
  onToggleDarkMode,
  lang,
  onLangChange
}: NavbarProps) {
  const t = (key: string) => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  return (
    <nav className={`navbar navbar-expand-lg border-bottom sticky-top shadow-sm ${darkMode ? "navbar-dark bg-dark border-secondary" : "navbar-light bg-white"}`} id="main-navigation-bar">
      <div className="container">
        {/* Branding */}
        <span className="navbar-brand d-flex align-items-center gap-2 fw-black" style={{ cursor: "pointer" }} onClick={() => onTabChange("dashboard")}>
          <ShieldCheck className="text-success" size={28} />
          <span className="fw-black tracking-tight" style={{ fontSize: "1.25rem" }}>Community Hero</span>
        </span>

        {/* Toggles and Info */}
        <div className="d-flex align-items-center order-lg-last gap-2">
          {/* Global Language Dropdown inside Navbar */}
          <div className="d-flex align-items-center gap-1 bg-success bg-opacity-10 text-success px-2.5 py-1.5 rounded-pill border border-success-subtle me-1">
            <Globe size={14} className="text-success" />
            <select
              value={lang}
              onChange={(e) => onLangChange(e.target.value as LanguageCode)}
              className="form-select form-select-sm border-0 bg-transparent fw-bold text-dark p-0 ms-1"
              style={{ fontSize: "0.78rem", width: "auto", minWidth: "85px", outline: "none", cursor: "pointer", color: darkMode ? "#fff" : "#000" }}
              id="navbar-language-picker"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="text-dark">
                  {l.nativeName}
                </option>
              ))}
            </select>
          </div>

          {/* Points indicator */}
          {user && (
            <div className="d-flex align-items-center gap-1 bg-warning bg-opacity-10 text-warning px-3 py-1.5 rounded-pill border border-warning-subtle me-1">
              <Star size={14} fill="currentColor" className="animate-spin" style={{ animationDuration: "12s" }} />
              <span className="fw-bold small">{user.points} Pts</span>
            </div>
          )}

          {/* Theme switcher */}
          <button 
            onClick={onToggleDarkMode} 
            className={`btn btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center ${darkMode ? "btn-outline-light text-white" : "btn-outline-dark text-dark"}`}
            title="Toggle theme"
            id="theme-toggler-btn"
          >
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* User badge and logout */}
          {user ? (
            <div className="dropdown d-flex align-items-center gap-2 ms-1">
              <button 
                onClick={() => onTabChange("profile")}
                className={`btn btn-link text-decoration-none text-end d-none d-sm-block p-0 border-0 ${activeTab === "profile" ? "text-success fw-bold" : ""}`}
                title="View Profile & Reports"
                id="navbar-profile-badge-btn"
              >
                <strong className={`d-block small ${activeTab === "profile" ? "text-success" : (darkMode ? "text-white" : "text-dark")}`} style={{ fontSize: "0.85rem" }}>{user.name}</strong>
                <span className="badge bg-secondary text-white small" style={{ fontSize: "0.65rem" }}>
                  {user.role === "Admin" ? t("roleAdmin") : user.role === "Volunteer" ? t("roleVolunteer") : t("roleCitizen")}
                </span>
              </button>
              <button onClick={onLogout} className="btn btn-outline-danger btn-sm p-2 rounded-circle" title="Logout" id="logout-btn">
                <LogOut size={14} />
              </button>
            </div>
          ) : null}
        </div>

        {/* Navigation items */}
        {user && (
          <div className="collapse navbar-collapse show" id="navbarNav">
            <ul className="navbar-nav ms-auto gap-1 mt-2 mt-lg-0">
              <li className="nav-item">
                <button
                  onClick={() => onTabChange("dashboard")}
                  className={`nav-link btn btn-link text-start text-decoration-none d-flex align-items-center gap-1.5 px-3 py-2 rounded-pill ${activeTab === "dashboard" ? "active bg-success bg-opacity-10 fw-bold text-success" : ""}`}
                  id="tab-dashboard-btn"
                >
                  <Home size={16} />
                  <span>{t("dashboard")}</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => onTabChange("report")}
                  className={`nav-link btn btn-link text-start text-decoration-none d-flex align-items-center gap-1.5 px-3 py-2 rounded-pill ${activeTab === "report" ? "active bg-success bg-opacity-10 fw-bold text-success" : ""}`}
                  id="tab-report-btn"
                >
                  <Plus size={16} />
                  <span>{t("reportIssue")}</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => onTabChange("chat")}
                  className={`nav-link btn btn-link text-start text-decoration-none d-flex align-items-center gap-1.5 px-3 py-2 rounded-pill ${activeTab === "chat" ? "active bg-success bg-opacity-10 fw-bold text-success" : ""}`}
                  id="tab-chatbot-btn"
                >
                  <Bot size={16} />
                  <span>{t("civicBot")}</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => onTabChange("profile")}
                  className={`nav-link btn btn-link text-start text-decoration-none d-flex align-items-center gap-1.5 px-3 py-2 rounded-pill ${activeTab === "profile" ? "active bg-success bg-opacity-10 fw-bold text-success" : ""}`}
                  id="tab-profile-btn"
                >
                  <User size={16} />
                  <span>{t("profile")}</span>
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>

  );
}
