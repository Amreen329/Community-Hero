import React, { useState } from "react";
import { Complaint, UserProfile } from "../types";
import { 
  User, Mail, Award, Calendar, Star, Eye, Plus, ArrowRight, Shield, Volume2, VolumeX, CheckCircle, Clock, AlertTriangle, FileText
} from "lucide-react";
import { translations, LanguageCode } from "../translations";

interface ProfileProps {
  currentUser: UserProfile | null;
  complaints: Complaint[];
  onSelectIssue: (id: string) => void;
  onNavigateToReport: () => void;
  lang: LanguageCode;
  darkMode: boolean;
}

const speakText = (text: string, langCode: string) => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    const langMapping: Record<string, string> = {
      en: "en-US",
      hi: "hi-IN",
      te: "te-IN",
      ta: "ta-IN",
      kn: "kn-IN",
      ml: "ml-IN"
    };
    utterance.lang = langMapping[langCode] || "en-US";
    window.speechSynthesis.speak(utterance);
  }
};

export default function Profile({
  currentUser,
  complaints,
  onSelectIssue,
  onNavigateToReport,
  lang,
  darkMode
}: ProfileProps) {
  const t = (key: string) => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!currentUser) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Please log in to view your profile.</p>
      </div>
    );
  }

  // Filter complaints reported by the logged-in user
  const myReports = complaints.filter(c => c.reporterId === currentUser.id);

  // Stats
  const resolvedCount = myReports.filter(c => c.status === "Resolved").length;
  const pendingCount = myReports.filter(c => c.status === "Pending").length;
  const inProgressCount = myReports.filter(c => c.status === "In-Progress").length;

  const handleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      const greeting = `Hello ${currentUser.name}. Welcome to your Community Hero Profile. You have accumulated ${currentUser.points} points and unlocked ${currentUser.badges.length} badges. You have submitted ${myReports.length} civic reports, with ${resolvedCount} resolved.`;
      speakText(greeting, lang);
      
      const utterance = new SpeechSynthesisUtterance(greeting);
      utterance.onend = () => {
        setIsSpeaking(false);
      };
    }
  };

  // Badges description
  const getBadgeDetails = (badgeName: string) => {
    const details: Record<string, { icon: string; desc: string; color: string }> = {
      "Spotter Hero": { icon: "🎯", desc: "For submitting your first verified local issue.", color: "bg-primary" },
      "Guardian Spotter": { icon: "🛡️", desc: "For reaching 40+ points of active community vigilance.", color: "bg-success" },
      "Validator Expert": { icon: "🔍", desc: "For performing extensive verifications on other reports.", color: "bg-warning text-dark" },
      "Civic Champion": { icon: "🏆", desc: "Awarded when one of your reports gets officially resolved.", color: "bg-info text-dark" }
    };
    return details[badgeName] || { icon: "⭐", desc: "Recognized community hero badge.", color: "bg-secondary" };
  };

  const statusColors: Record<string, string> = {
    "Pending": "badge bg-warning bg-opacity-15 text-warning border-warning border-opacity-30",
    "Verified": "badge bg-info bg-opacity-15 text-info border-info border-opacity-30",
    "In-Progress": "badge bg-primary bg-opacity-15 text-primary border-primary border-opacity-30",
    "Resolved": "badge bg-success bg-opacity-15 text-success border-success border-opacity-30",
    "Rejected": "badge bg-danger bg-opacity-15 text-danger border-danger border-opacity-30"
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Resolved": return <CheckCircle size={14} className="text-success" />;
      case "In-Progress": return <Clock size={14} className="text-primary animate-pulse" />;
      case "Pending": return <AlertTriangle size={14} className="text-warning" />;
      default: return <FileText size={14} className="text-secondary" />;
    }
  };

  const initials = currentUser.name
    ? currentUser.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "CH";

  return (
    <div className="container py-2" id="user-profile-view">
      {/* Title Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="fw-black mb-1 d-flex align-items-center gap-2">
            <User className="text-success" size={28} />
            <span>{t("profileDetails")}</span>
          </h2>
          <p className="text-secondary mb-0">
            View your personal accomplishments, badges, and track your submitted district reports.
          </p>
        </div>

        <button 
          onClick={handleSpeech} 
          className={`btn ${isSpeaking ? "btn-success" : "btn-outline-success"} d-flex align-items-center gap-2 px-3.5 py-2 rounded-pill shadow-sm transition-all`}
          title="Listen to profile details overview"
          id="profile-tts-btn"
        >
          {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <span className="fw-bold small">{isSpeaking ? "Stop Speaking" : "Listen Overview"}</span>
        </button>
      </div>

      <div className="row g-4">
        {/* Left Column: Profile Card & Badges */}
        <div className="col-lg-5">
          {/* Main User Card */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4" style={{ border: "1px solid rgba(255, 255, 255, 0.1)", backgroundColor: "var(--bg-card)" }} id="profile-card-details">
            <div className="p-4 text-center border-bottom" style={{ borderColor: darkMode ? "rgba(255, 255, 255, 0.08) !important" : "rgba(0,0,0,0.05) !important" }}>
              <div 
                className="mx-auto rounded-circle d-flex align-items-center justify-content-center fw-black shadow text-white mb-3" 
                style={{ 
                  width: "80px", 
                  height: "80px", 
                  fontSize: "1.75rem",
                  background: "linear-gradient(135deg, #2ec4b6 0%, #0f172a 100%)" 
                }}
              >
                {initials}
              </div>
              <h4 className="fw-bold mb-1">{currentUser.name}</h4>
              <p className="text-secondary small mb-3">{currentUser.email}</p>
              
              <div className="d-flex justify-content-center gap-2">
                <span className="badge bg-success bg-opacity-15 text-success border border-success border-opacity-30 px-3 py-1.5 rounded-pill fw-bold">
                  {currentUser.role === "Admin" ? t("roleAdmin") : currentUser.role === "Volunteer" ? t("roleVolunteer") : t("roleCitizen")}
                </span>
                <span className="badge bg-warning bg-opacity-15 text-warning border border-warning border-opacity-30 px-3 py-1.5 rounded-pill fw-bold d-flex align-items-center gap-1">
                  <Star size={12} fill="currentColor" />
                  {currentUser.points} {t("points")}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="d-flex align-items-center gap-3 mb-3">
                <Calendar className="text-secondary" size={20} />
                <div>
                  <small className="text-secondary d-block">{t("memberSince")}</small>
                  <span className="fw-semibold">{currentUser.joinedAt ? new Date(currentUser.joinedAt).toLocaleDateString() : "June 2026"}</span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3">
                <Award className="text-secondary" size={20} />
                <div>
                  <small className="text-secondary d-block">{t("pointsEarned")}</small>
                  <span className="fw-semibold">{currentUser.points} Civic Points</span>
                </div>
              </div>
            </div>
          </div>

          {/* Badges Accomplishment Card */}
          <div className="card border-0 shadow-sm rounded-4 p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(255, 255, 255, 0.1)" }} id="profile-badges-card">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <Award className="text-warning" size={20} />
              <span>{t("unlockedBadges")} ({currentUser.badges.length})</span>
            </h5>

            {currentUser.badges.length === 0 ? (
              <div className="text-center py-3 text-secondary">
                <p className="small mb-1">No badges unlocked yet.</p>
                <p className="small text-muted mb-0">File reports or verify pending issues to earn badges!</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {currentUser.badges.map((badgeName) => {
                  const details = getBadgeDetails(badgeName);
                  return (
                    <div 
                      key={badgeName} 
                      className="d-flex align-items-start gap-3 p-2.5 rounded-3 hover-bg transition-colors"
                      style={{ border: "1px solid rgba(255, 255, 255, 0.05)" }}
                    >
                      <span className="fs-3" role="img" aria-label={badgeName}>
                        {details.icon}
                      </span>
                      <div>
                        <span className="fw-bold d-block" style={{ fontSize: "0.95rem" }}>{badgeName}</span>
                        <span className="small text-secondary">{details.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: User's Reported Complaints */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(255, 255, 255, 0.1)" }} id="profile-reports-card">
            <div className="d-flex align-items-center justify-content-between mb-3.5">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <Shield className="text-success" size={20} />
                <span>{t("myReports")} ({myReports.length})</span>
              </h5>
              
              <button 
                onClick={onNavigateToReport} 
                className="btn btn-outline-success btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1 fw-bold"
                id="profile-add-report-btn"
              >
                <Plus size={14} />
                <span>{t("reportIssue")}</span>
              </button>
            </div>

            {myReports.length === 0 ? (
              <div className="text-center py-5 text-secondary border border-dashed rounded-4" style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}>
                <p className="mb-3">{t("noReports")}</p>
                <button 
                  onClick={onNavigateToReport} 
                  className="btn btn-success rounded-pill px-4 py-2 fw-bold d-inline-flex align-items-center gap-2"
                >
                  <span>Map Your First Issue</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {myReports.map((c) => (
                  <div 
                    key={c.id} 
                    className="card border-0 p-3 hover-shadow transition-all rounded-3" 
                    style={{ 
                      backgroundColor: "rgba(255, 255, 255, 0.02)", 
                      border: "1px solid rgba(255, 255, 255, 0.08) !important" 
                    }}
                    id={`profile-report-${c.id}`}
                  >
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
                      <div>
                        <h6 className="fw-bold mb-1 text-truncate-2" style={{ fontSize: "1rem" }}>{c.title}</h6>
                        <small className="text-secondary d-block">📍 {c.gpsLocation.address}</small>
                      </div>
                      <span className={`px-2.5 py-1 rounded-pill small border ${statusColors[c.status]} fw-bold d-flex align-items-center gap-1.5`} style={{ fontSize: "0.75rem" }}>
                        {getStatusIcon(c.status)}
                        {t(c.status.toLowerCase()) || c.status}
                      </span>
                    </div>

                    <p className="text-secondary small mb-3 text-truncate-2" style={{ display: "-webkit-box", WebKitLineClamp: 2, WebKitBoxOrient: "vertical", overflow: "hidden" }}>
                      {c.description}
                    </p>

                    <div className="d-flex align-items-center justify-content-between pt-2 border-top border-opacity-10" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                      <span className="small text-secondary">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                      <button 
                        onClick={() => onSelectIssue(c.id)} 
                        className="btn btn-sm btn-link text-success d-flex align-items-center gap-1 fw-bold p-0 text-decoration-none"
                      >
                        <Eye size={14} />
                        <span>{t("viewDetails").split(" ")[0]}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
