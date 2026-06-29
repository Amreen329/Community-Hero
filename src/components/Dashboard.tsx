import React, { useState, useMemo } from "react";
import { Complaint, UserProfile } from "../types";
import { 
  Plus, Search, ListFilter, AlertTriangle, CheckCircle, Clock, 
  TrendingUp, Award, Users, RefreshCw, Star, ArrowRight, ShieldCheck, Sparkles, Loader2, Volume2, VolumeX, Eye
} from "lucide-react";
import MapVisualization from "./MapVisualization";
import axios from "axios";
import { translations, LanguageCode } from "../translations";

interface DashboardProps {
  complaints: Complaint[];
  currentUser: UserProfile | null;
  usersLeaderboard: UserProfile[];
  onSelectIssue: (id: string) => void;
  onNavigateToReport: () => void;
  lang: LanguageCode;
  userLocation: { lat: number; lng: number } | null;
  darkMode: boolean;
}

// Helper to speak text out loud with browser synthesis in the active language
const speakText = (text: string, langCode: string) => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const nativeUtterance = new SpeechSynthesisUtterance(text);
    nativeUtterance.rate = 0.95; // Friendly, paced reading
    
    const langMapping: Record<string, string> = {
      en: "en-US",
      hi: "hi-IN",
      te: "te-IN",
      ta: "ta-IN",
      kn: "kn-IN",
      ml: "ml-IN"
    };
    nativeUtterance.lang = langMapping[langCode] || "en-US";
    window.speechSynthesis.speak(nativeUtterance);
  }
};

export default function Dashboard({
  complaints,
  currentUser,
  usersLeaderboard,
  onSelectIssue,
  onNavigateToReport,
  lang,
  userLocation,
  darkMode
}: DashboardProps) {
  const t = (key: string) => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [isSpeakingGuide, setIsSpeakingGuide] = useState(false);
  const [speakingCardId, setSpeakingCardId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  // AI recommendations states (for admin / coordinators)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [aiQueue, setAiQueue] = useState<any[]>([]);
  
  // Statistics calculation
  const stats = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter(c => c.status === "Pending").length;
    const inProgress = complaints.filter(c => c.status === "In-Progress").length;
    const resolved = complaints.filter(c => c.status === "Resolved").length;
    
    // Resolution percentage
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Severity breakdown
    const criticalCount = complaints.filter(c => c.severity === "Critical").length;
    const highCount = complaints.filter(c => c.severity === "High").length;
    
    return { total, pending, inProgress, resolved, rate, criticalCount, highCount };
  }, [complaints]);

  // Map category to a highly recognizable visual emoji icon
  const getCategoryEmoji = (cat: string) => {
    switch (cat) {
      case "Pothole & Road Damage": return "🕳️";
      case "Garbage & Waste Accumulation": return "🗑️";
      case "Water Leakage & Drainage": return "💧";
      case "Streetlight & Electrical": return "💡";
      case "Public Safety & Vandalism": return "⚠️";
      default: return "🏗️";
    }
  };

  // Filters application
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const matchSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.gpsLocation.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "All" || c.status === statusFilter;
      const matchCategory = categoryFilter === "All" || c.category === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [complaints, searchTerm, statusFilter, categoryFilter]);

  // Request AI priority dispatch recommendation queue
  const handleFetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const activeIssues = complaints.filter(c => c.status !== "Resolved" && c.status !== "Rejected");
      const res = await axios.post("/api/priority-recommendations", { complaints: activeIssues });
      setAiQueue(res.data.recommendations || []);
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
      // Fallback
      const mockRecs = complaints.filter(c => c.status !== "Resolved").map(c => ({
        id: c.id,
        title: c.title,
        suggestedPriority: c.severity,
        priorityScore: c.priorityScore,
        actionStep: `Dispatch local municipal response unit. Verify area ${c.gpsLocation.address}.`,
        duplicateDetected: false
      }));
      setAiQueue(mockRecs);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Sort Leaderboard by points
  const sortedLeaderboard = useMemo(() => {
    return [...usersLeaderboard].sort((a, b) => b.points - a.points);
  }, [usersLeaderboard]);

  const handleSpeakOverview = () => {
    if (isSpeakingGuide) {
      window.speechSynthesis.cancel();
      setIsSpeakingGuide(false);
      return;
    }

    setIsSpeakingGuide(true);
    
    const greetings: Record<LanguageCode, string> = {
      en: `Welcome to Community Hero! You are logged in as ${currentUser?.name || "Citizen"}. Currently, our neighborhood has ${stats.total} reported problems. ${stats.pending + stats.inProgress} issues are currently pending work, and ${stats.resolved} problems have been successfully repaired and resolved. You have earned ${currentUser?.points || 0} civic points. To file a new problem, click on the blue button labelled File New Complaint.`,
      hi: `कम्युनिटी हीरो में आपका स्वागत है! आप ${currentUser?.name || "नागरिक"} के रूप में लॉग इन हैं। वर्तमान में, हमारे पड़ोस में ${stats.total} रिपोर्ट की गई समस्याएं हैं। ${stats.pending + stats.inProgress} समस्याओं पर अभी काम लंबित है, और ${stats.resolved} समस्याओं को सफलतापूर्वक ठीक और हल कर दिया गया है। आपने ${currentUser?.points || 0} नागरिक अंक अर्जित किए हैं। एक नई समस्या दर्ज करने के लिए, 'फाइल न्यू कम्प्लेंट' नामक नीले बटन पर क्लिक करें।`,
      te: `కమ్యూనిటీ హీరోకు స్వాగతం! మీరు ${currentUser?.name || "పౌరుడు"} గా లాగిన్ అయ్యారు. ప్రస్తుతం, మన పరిసరాల్లో ${stats.total} నివేదించబడిన సమస్యలు ఉన్నాయి. ${stats.pending + stats.inProgress} సమస్యలపై పని పెండింగ్‌లో ఉంది, మరియు ${stats.resolved} సమస్యలు విజయవంతంగా పరిష్కరించబడ్డాయి. మీరు ${currentUser?.points || 0} పౌర పాయింట్లను సంపాదించారు. కొత్త సమస్యను దాఖలు చేయడానికి, 'ఫైల్ న్యూ కంప్లైంట్' అనే బటన్‌ను క్లిక్ చేయండి.`,
      ta: `கம்யூనిட்டி ஹீரோவிற்கு வரவேற்கிறோம்! நீங்கள் ${currentUser?.name || "குடிமகன்"} ஆக உள்நுழைந்துள்ளீர்கள். தற்போது, ​​எங்கள் சுற்றுப்புறத்தில் ${stats.total} புகாரளிக்கப்பட்ட சிக்கல்கள் உள்ளன. ${stats.pending + stats.inProgress} சிக்கல்கள் தற்போது நிலுவையில் உள்ளன, மேலும் ${stats.resolved} சிக்கல்கள் வெற்றிகரமாக சரிசெய்யப்பட்டுள்ளன. நீங்கள் ${currentUser?.points || 0} புள்ளிகளைப் பெற்றுள்ளீர்கள். புதிய புகாரைப் பதிவு செய்ய, 'புதிய புகாரைப் பதிவு செய்' என்ற நீல நிற பொத்தானைக் கிளிக் செய்யவும்.`,
      kn: `ಕಮ್ಯೂನಿಟಿ ಹೀರೊಗೆ ಸುಸ್ವಾಗತ! ನೀವು ${currentUser?.name || "ನಾಗರಿಕರು"} ಆಗಿ ಲಾಗಿನ್ ಆಗಿದ್ದೀರಿ. ಪ್ರಸ್ತುತ, ನಮ್ಮ ನೆರೆಹೊರೆಯಲ್ಲಿ ${stats.total} ವರದಿಯಾದ ಸಮಸ್ಯೆಗಳಿವೆ. ${stats.pending + stats.inProgress} ಸಮಸ್ಯೆಗಳ ಕೆಲಸ ಬಾಕಿ ಇದೆ, ಮತ್ತು ${stats.resolved} ಸಮಸ್ಯೆಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಪರಿಹರಿಸಲಾಗಿದೆ. ನೀವು ${currentUser?.points || 0} ನಾಗರಿಕ ಅಂಕಗಳನ್ನು ಗಳಿಸಿದ್ದೀರಿ. ಹೊಸ ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಲು 'ಫೈಲ್ ನ್ಯೂ ಕಂಪ್ಲೈಂಟ್' ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ.`,
      ml: `കമ്മ്യൂണിറ്റി ഹീറോയിലേക്ക് സ്വാഗതം! നിങ്ങൾ ${currentUser?.name || "പൗരൻ"} ആയി ലോഗിൻ ചെയ്തിരിക്കുന്നു. നിലവിൽ, നമ്മുടെ അയൽപക്കത്ത് ${stats.total} പരാതികൾ റിപ്പോർട്ട് ചെയ്തിട്ടുണ്ട്. ${stats.pending + stats.inProgress} പ്രശ്നങ്ങളിൽ ജോലി ബാക്കിയുണ്ട്, കൂടാതെ ${stats.resolved} പ്രശ്നങ്ങൾ വിജയകരമായി പരിഹരിച്ചു. നിങ്ങൾ ${currentUser?.points || 0} പോയിന്റുകൾ നേടിയിട്ടുണ്ട്. ഒരു പുതിയ പരാതി നൽകാൻ, 'ഫയൽ ന്യൂ കംപ്ലെയ്ന്റ്' എന്ന ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.`
    };
    const text = greetings[lang] || greetings.en;
    speakText(text, lang);

    // Reset indicator when done speaking
    const checkSpeech = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setIsSpeakingGuide(false);
        clearInterval(checkSpeech);
      }
    }, 500);
  };

  const handleSpeakCard = (e: React.MouseEvent, c: Complaint) => {
    e.stopPropagation();
    if (speakingCardId === c.id) {
      window.speechSynthesis.cancel();
      setSpeakingCardId(null);
      return;
    }

    setSpeakingCardId(c.id);
    const statusText = c.status === "Pending" ? t("pending") : c.status === "In-Progress" ? t("inProgress") : c.status === "Resolved" ? t("resolved") : c.status;
    const text = `Problem: ${c.title}. Location: ${c.gpsLocation.address}. Status is ${statusText}. Severity is ${c.severity}. Description: ${c.description}.`;
    speakText(text, lang);

    const checkSpeech = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setSpeakingCardId(null);
        clearInterval(checkSpeech);
      }
    }, 500);
  };


  return (
    <div className="container-fluid px-0" id="dashboard-container">
      {/* Voice-assistance Banner for Accessibility */}
      <div className="alert bg-success bg-opacity-15 text-white border-0 shadow-sm p-3 mb-4 rounded-4 d-flex align-items-center justify-content-between flex-wrap gap-2" style={{ border: "1px solid rgba(25,135,84,0.15)" }}>
        <div className="d-flex align-items-center gap-2.5">
          <div className="p-2.5 bg-success bg-opacity-25 rounded-circle text-success-light animate-bounce">
            <Volume2 size={24} className="text-success" />
          </div>
          <div>
            <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-1.5" style={{ color: "var(--bs-heading-color, #fff)" }}>
              🔊 {t("listenBtn")}
            </h6>
            <small className="text-muted fw-semibold">
              Can't read or having trouble? Tap the green button to hear the dashboard overview read out loud to you!
            </small>
          </div>
        </div>
        <button
          onClick={handleSpeakOverview}
          className={`btn btn-sm px-4.5 py-2 fw-bold rounded-pill d-flex align-items-center gap-2 transition-all ${isSpeakingGuide ? "btn-danger text-white animate-pulse" : "btn-success text-white"}`}
          id="btn-speak-dashboard-overview"
          style={{ minHeight: "38px" }}
        >
          {isSpeakingGuide ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span>{isSpeakingGuide ? t("stopListenBtn") : t("listenBtn")}</span>
        </button>
      </div>

      {/* 1. Quick Stats row */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 bg-primary bg-opacity-10 h-100 p-3 rounded-4" id="stat-card-total">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-bold d-block uppercase tracking-wider">{t("totalIssues")}</span>
                <span className="fs-2 fw-black text-primary">{stats.total}</span>
              </div>
              <div className="p-3 bg-primary bg-opacity-25 rounded-4 text-primary">
                <AlertTriangle size={24} />
              </div>
            </div>
            <div className="mt-2 text-primary small fw-bold">
              ⚠️ District total filed complaints
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 bg-warning bg-opacity-10 h-100 p-3 rounded-4" id="stat-card-pending">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-bold d-block uppercase tracking-wider">{t("activeRepairs")}</span>
                <span className="fs-2 fw-black text-warning">{stats.pending + stats.inProgress}</span>
              </div>
              <div className="p-3 bg-warning bg-opacity-25 rounded-4 text-warning">
                <Clock size={24} />
              </div>
            </div>
            <div className="mt-2 text-warning small fw-bold">
              🛠️ {stats.criticalCount} marked as Critical alert
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 bg-success bg-opacity-10 h-100 p-3 rounded-4" id="stat-card-resolved">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-bold d-block uppercase tracking-wider">{t("resolvedIssues")}</span>
                <span className="fs-2 fw-black text-success">{stats.resolved}</span>
              </div>
              <div className="p-3 bg-success bg-opacity-25 rounded-4 text-success">
                <CheckCircle size={24} />
              </div>
            </div>
            <div className="mt-2 text-success small fw-bold">
              🎉 Resolution Rate: {stats.rate}%
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 bg-dark text-white h-100 p-3 rounded-4 border" id="stat-card-profile" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-white-50 small fw-bold d-block uppercase tracking-wider">Citizen Rank</span>
                <span className="fs-4 fw-black text-warning">
                  {currentUser ? (currentUser.points > 100 ? "Civic Champion" : currentUser.points > 40 ? "Guardian Spotter" : "Active Hero") : "Civic Visitor"}
                </span>
              </div>
              <div className="p-3 bg-secondary bg-opacity-25 rounded-4 text-warning animate-pulse">
                <Award size={24} />
              </div>
            </div>
            <div className="mt-2 text-warning small fw-bold">
              ⭐ {t("points")}: {currentUser?.points || 0} pts
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Map Module */}
      <div className="row mb-4">
        <div className="col-12">
          <MapVisualization 
            complaints={complaints}
            selectedIssueId={null}
            onSelectIssue={onSelectIssue}
            userLat={userLocation?.lat}
            userLng={userLocation?.lng}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* 3. Core Content split: Analytics, Leaderboard and Active Complaints Grid */}
      <div className="row g-4">
        {/* Left main: Active Complaints and Search Filters */}
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 mb-4 rounded-4 overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.12)" }}>
            <div className="card-header bg-white border-0 p-3.5 d-flex flex-wrap align-items-center justify-content-between gap-3">
              <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                <AlertTriangle className="text-danger" size={20} /> {t("dashboardSubtitle")}
              </h5>
              
              <button onClick={onNavigateToReport} className="btn btn-primary d-flex align-items-center gap-2 fw-bold px-4 py-2 shadow" id="dashboard-report-btn" style={{ minHeight: "42px" }}>
                <Plus size={18} />
                <span>{t("reportIssue")}</span>
              </button>
            </div>

            {/* Filters panel with large buttons/options for simple usage */}
            <div className="p-3.5 bg-light border-top border-bottom d-flex flex-wrap gap-2.5 align-items-center">
              <div className="input-group input-group-sm flex-grow-1" style={{ minWidth: "220px" }}>
                <span className="input-group-text bg-white border-secondary-subtle"><Search size={14} /></span>
                <input
                  type="text"
                  placeholder="Type street name or keyword to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-control border-secondary-subtle py-2.5 text-dark bg-white fw-medium"
                  id="search-complaints-input"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select form-select-sm border-secondary-subtle py-2 text-dark bg-white fw-bold"
                style={{ maxWidth: "150px" }}
                id="filter-status-select"
              >
                <option value="All">{t("allStatuses")}</option>
                <option value="Pending">{t("pending")}</option>
                <option value="Verified">{t("verified")}</option>
                <option value="In-Progress">{t("inProgress")}</option>
                <option value="Resolved">{t("resolved")}</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="form-select form-select-sm border-secondary-subtle py-2 text-dark bg-white fw-bold"
                style={{ maxWidth: "180px" }}
                id="filter-category-select"
              >
                <option value="All">{t("allCategories")}</option>
                <option value="Pothole & Road Damage">🕳️ {t("potholeRoad")}</option>
                <option value="Garbage & Waste Accumulation">🗑️ {t("garbageWaste")}</option>
                <option value="Water Leakage & Drainage">💧 {t("waterLeakage")}</option>
                <option value="Streetlight & Electrical">💡 {t("streetlightElectrical")}</option>
                <option value="Public Safety & Vandalism">⚠️ {t("publicSafety")}</option>
              </select>
            </div>

            {/* Complaints Feed List */}
            <div className="card-body p-3.5">
              {filteredComplaints.length === 0 ? (
                <div className="text-center py-5 text-muted fw-bold">
                  {t("emptyIssues")}
                </div>
              ) : (
                <div className="row g-3.5">
                  {filteredComplaints.map((c) => {
                    const severityColors = {
                      Critical: "bg-danger text-white",
                      High: "bg-warning text-dark",
                      Medium: "bg-primary text-white",
                      Low: "bg-secondary text-white"
                    };

                    const severityLabels = {
                      Low: t("low"),
                      Medium: t("medium"),
                      High: t("high"),
                      Critical: t("critical")
                    };

                    const statusColors = {
                      Pending: "border-secondary",
                      Verified: "border-info text-info",
                      "In-Progress": "border-warning text-warning",
                      Resolved: "border-success text-success",
                      Rejected: "border-danger text-danger"
                    };

                    const statusLabels = {
                      Pending: t("pending"),
                      Verified: t("verified"),
                      "In-Progress": t("inProgress") + " 🛠️",
                      Resolved: t("resolved") + " ✅",
                      Rejected: t("rejected") + " ❌"
                    };

                    const categoryTranslations = {
                      "Pothole & Road Damage": t("potholeRoad"),
                      "Garbage & Waste Accumulation": t("garbageWaste"),
                      "Water Leakage & Drainage": t("waterLeakage"),
                      "Streetlight & Electrical": t("streetlightElectrical"),
                      "Public Safety & Vandalism": t("publicSafety")
                    };

                    const isWaterLeakage = c.category === "Water Leakage & Drainage";
                    const cardStyle = {
                      borderTop: isWaterLeakage ? "1.5px solid rgba(14, 165, 233, 0.45)" : `1px solid ${darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"}`,
                      borderRight: isWaterLeakage ? "1.5px solid rgba(14, 165, 233, 0.45)" : `1px solid ${darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"}`,
                      borderBottom: isWaterLeakage ? "1.5px solid rgba(14, 165, 233, 0.45)" : `1px solid ${darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"}`,
                      borderLeft: isWaterLeakage ? "6px solid #0ea5e9" : `1px solid ${darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"}`,
                      backgroundColor: isWaterLeakage 
                        ? (darkMode ? "rgba(14, 165, 233, 0.04)" : "rgba(14, 165, 233, 0.02)") 
                        : "var(--bg-card)",
                    };

                    return (
                      <div className="col-md-6" key={c.id}>
                        <div 
                          className="card h-100 border-0 shadow-sm hover-shadow transition-all d-flex flex-column rounded-4 overflow-hidden" 
                          id={`complaint-card-${c.id}`} 
                          style={cardStyle}
                        >
                          <div className="position-relative">
                            {imageErrors[c.id] || !c.imageUrl ? (
                              <div 
                                className="d-flex flex-column align-items-center justify-content-center bg-secondary bg-opacity-10 text-secondary" 
                                style={{ height: "170px", borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}` }}
                              >
                                <span style={{ fontSize: "3.5rem" }}>{getCategoryEmoji(c.category)}</span>
                              </div>
                            ) : (
                              <img 
                                src={c.imageUrl} 
                                alt=""
                                className="card-img-top" 
                                style={{ height: "170px", objectFit: "cover" }}
                                onError={() => setImageErrors(prev => ({ ...prev, [c.id]: true }))}
                              />
                            )}
                            <span className="position-absolute top-0 start-0 m-2.5 badge fs-6 px-2.5 py-1.5 rounded-3 fw-bold bg-danger text-white">
                              {severityLabels[c.severity] || c.severity}
                            </span>
                            <span className={`position-absolute bottom-0 end-0 m-2.5 badge text-white fs-6 px-2.5 py-1.5 rounded-3 d-flex align-items-center gap-1.5 fw-bold ${isWaterLeakage ? "bg-primary" : "bg-dark bg-opacity-85"}`}>
                              <span>{getCategoryEmoji(c.category)}</span>
                              <span>{categoryTranslations[c.category] || c.category}</span>
                            </span>

                            {/* Listen Button right over the image for quick tap accessibility */}
                            <button
                              type="button"
                              onClick={(e) => handleSpeakCard(e, c)}
                              className={`position-absolute top-0 end-0 m-2.5 btn rounded-circle p-2 shadow-sm d-flex align-items-center justify-content-center transition-all ${speakingCardId === c.id ? "btn-danger text-white scale-110 animate-pulse" : "btn-warning text-dark"}`}
                              title="Speak details"
                              style={{ width: "38px", height: "38px", zIndex: 10 }}
                              id={`speak-card-btn-${c.id}`}
                            >
                              <Volume2 size={18} />
                            </button>
                          </div>

                          <div className="card-body p-3.5 d-flex flex-column flex-grow-1">
                            <div className="d-flex align-items-start justify-content-between gap-2 mb-1.5" style={{ minHeight: "42px" }}>
                              <h6 className="fw-bold text-dark mb-0 text-truncate-2" style={{ fontSize: "1.05rem", lineHeight: "1.3" }}>
                                {c.title}
                              </h6>
                            </div>
                            
                            <p className="text-secondary small mb-3 text-truncate-2 flex-grow-1 fw-medium" style={{ height: "40px", overflow: "hidden", display: "-webkit-box", WebKitLineClamp: 2, WebKitBoxOrient: "vertical", fontSize: "0.85rem" }}>
                              {c.description}
                            </p>
                            
                            <div className="mt-auto pt-3 border-top d-flex align-items-center justify-content-between">
                              <span className="small text-secondary text-truncate fw-bold" style={{ maxWidth: "150px" }}>
                                📍 {c.gpsLocation.address}
                              </span>
                              <span className={`badge border ${statusColors[c.status]} px-2.5 py-1.5 rounded-3 fw-bold`} style={{ fontSize: "0.75rem" }}>
                                {statusLabels[c.status] || c.status}
                              </span>
                            </div>
                          </div>

                          <div className="card-footer bg-light p-3 d-flex justify-content-between align-items-center border-0 gap-2">
                            <span className="small text-muted fw-bold">👍 {c.upvotesCount} {t("upvotes")}</span>
                            
                            <button
                              onClick={() => onSelectIssue(c.id)}
                              className="btn btn-outline-dark btn-sm rounded-pill px-3.5 py-1.5 d-flex align-items-center gap-1 fw-bold"
                              id={`view-issue-btn-${c.id}`}
                            >
                              <span>{t("viewDetails")}</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar: Analytics charts, Leaderboard and AI queues */}
        <div className="col-lg-4">
          
          {/* AI Priority Dispatch Recommendations Queue for Admins */}
          {currentUser?.role === "Admin" && (
            <div className="card shadow-sm border-0 mb-4 bg-dark text-white rounded-4 overflow-hidden" id="ai-dispatch-queue-card">
              <div className="card-header border-0 bg-transparent p-3.5 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <Sparkles className="text-warning animate-bounce" size={20} />
                  <h6 className="mb-0 fw-bold text-warning">AI Priority Dispatcher</h6>
                </div>
                <button 
                  onClick={handleFetchRecommendations}
                  className="btn btn-outline-warning btn-xs py-1"
                  disabled={loadingRecommendations}
                  id="btn-get-ai-dispatch"
                >
                  {loadingRecommendations ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                </button>
              </div>

              <div className="card-body px-3.5 py-2 border-top border-secondary">
                <p className="small text-white-50 mb-3" style={{ fontSize: "0.8rem" }}>
                  Generates an optimized municipal dispatch queue based on severity, population impact (upvotes), and duplication risks.
                </p>

                {loadingRecommendations ? (
                  <div className="text-center py-4 text-warning">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    <span className="small">Gemini is sorting district tasks...</span>
                  </div>
                ) : aiQueue.length === 0 ? (
                  <div className="text-center py-3 text-white-50 small">
                    Queue empty. Press reload to analyze pending complaints.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2 mb-2">
                    {aiQueue.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="bg-secondary bg-opacity-25 p-2.5 rounded border-start border-warning border-3 d-flex align-items-start gap-2">
                        <div className="flex-grow-1">
                          <strong className="d-block small text-white text-truncate" style={{ maxWidth: "200px" }}>{item.title}</strong>
                          <span className="small text-warning" style={{ fontSize: "0.75rem" }}>Action: {item.actionStep?.substring(0, 50)}...</span>
                        </div>
                        <span className="badge bg-danger small">{item.priorityScore}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SVG-based beautiful Resolution Analytics Chart */}
          <div className="card shadow-sm border-0 mb-4 rounded-4" id="resolution-analytics-chart-card" style={{ border: "1px solid rgba(0,0,0,0.12)" }}>
            <div className="card-header bg-white border-0 p-3.5">
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <TrendingUp className="text-primary" size={18} /> {t("category")} Workload Share
              </h6>
            </div>
            <div className="card-body p-3.5 pt-0 text-center">
              {/* Beautiful interactive inline responsive custom SVG horizontal bar charts */}
              <div className="d-flex flex-column gap-2.5 text-start mt-2">
                <div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span className="fw-bold">🕳️ {t("potholeRoad")}</span>
                    <span className="fw-bold text-dark">40%</span>
                  </div>
                  <div className="progress" style={{ height: "8px" }}>
                    <div className="progress-bar bg-primary" role="progressbar" style={{ width: "40%" }}></div>
                  </div>
                </div>

                <div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span className="fw-bold">🗑️ {t("garbageWaste")}</span>
                    <span className="fw-bold text-dark">25%</span>
                  </div>
                  <div className="progress" style={{ height: "8px" }}>
                    <div className="progress-bar bg-success" role="progressbar" style={{ width: "25%" }}></div>
                  </div>
                </div>

                <div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span className="fw-bold">💧 {t("waterLeakage")}</span>
                    <span className="fw-bold text-dark">20%</span>
                  </div>
                  <div className="progress" style={{ height: "8px" }}>
                    <div className="progress-bar bg-info" role="progressbar" style={{ width: "20%" }}></div>
                  </div>
                </div>

                <div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span className="fw-bold">💡 {t("streetlightElectrical")}</span>
                    <span className="fw-bold text-dark">15%</span>
                  </div>
                  <div className="progress" style={{ height: "8px" }}>
                    <div className="progress-bar bg-warning" role="progressbar" style={{ width: "15%" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Citizen Leaderboard */}
          <div className="card shadow-sm border-0 rounded-4" id="citizen-leaderboard-card" style={{ border: "1px solid rgba(0,0,0,0.12)" }}>
            <div className="card-header bg-white border-0 p-3.5 d-flex align-items-center justify-content-between">
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <Users className="text-success" size={18} /> Active {t("appName")} Heroes
              </h6>
            </div>
            
            <div className="card-body p-3.5 pt-0">
              <div className="d-flex flex-column gap-2">
                {sortedLeaderboard.slice(0, 5).map((u, index) => {
                  const placeColors = ["bg-warning text-dark", "bg-secondary text-white", "bg-danger text-white"];
                  return (
                    <div 
                      key={u.id} 
                      className={`d-flex align-items-center justify-content-between p-2.5 rounded-3 border-bottom ${u.id === currentUser?.id ? "bg-success bg-opacity-10 border border-success" : ""}`}
                      id={`leaderboard-row-${index}`}
                    >
                      <div className="d-flex align-items-center gap-2.5 text-truncate" style={{ maxWidth: "220px" }}>
                        <span className={`badge rounded-circle p-2 d-flex align-items-center justify-content-center ${index < 3 ? placeColors[index] : "bg-light text-dark"}`} style={{ width: "26px", height: "26px", fontSize: "0.75rem" }}>
                          {index + 1}
                        </span>
                        <div>
                          <strong className="small text-dark d-block text-truncate fw-bold">{u.name}</strong>
                          <span className="text-muted small fw-semibold" style={{ fontSize: "0.7rem" }}>
                            {u.role === "Citizen" ? t("roleCitizen").split(" ")[0] : u.role === "Volunteer" ? t("roleVolunteer").split(" ")[0] : t("roleAdmin").split(" ")[0]} • {u.badges?.length || 0} Badges
                          </span>
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="badge bg-dark fw-bold text-white">{u.points} {t("points")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

