import React, { useState, useEffect } from "react";
import { Complaint, Comment } from "../types";
import { 
  Vote, CheckCircle, AlertOctagon, HelpCircle, User, Calendar, 
  MessageSquare, ChevronRight, Award, Trash, Clock, FileImage, Send, Sparkles, MapPin, Volume2, VolumeX 
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, query, where, getDocs, orderBy, updateDoc, doc, arrayUnion, increment } from "firebase/firestore";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { translations, LanguageCode } from "../translations";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY" && API_KEY.trim() !== "";

interface IssueDetailProps {
  complaint: Complaint;
  currentUser: { id: string; name: string; role: "Citizen" | "Volunteer" | "Admin"; points: number } | null;
  onBack: () => void;
  onUpdateStatus: (id: string, newStatus: Complaint["status"], resolvedUrl?: string, dept?: string) => void;
  onVote: (id: string) => void;
  onAddComment: (comment: Omit<Comment, "id" | "createdAt">) => void;
  lang: LanguageCode;
}

// Helper to speak text out loud with browser synthesis for semi-literate/illiterate accessibility
const speakText = (text: string, langCode: string) => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Friendly, paced reading
    
    // Map code to native speech codes
    const speechCodes: Record<string, string> = {
      en: "en-US",
      hi: "hi-IN",
      te: "te-IN",
      ta: "ta-IN",
      kn: "kn-IN",
      ml: "ml-IN"
    };
    utterance.lang = speechCodes[langCode] || "en-US";
    window.speechSynthesis.speak(utterance);
  }
};

export default function IssueDetail({ 
  complaint, 
  currentUser, 
  onBack, 
  onUpdateStatus, 
  onVote,
  onAddComment,
  lang
}: IssueDetailProps) {
  const t = (key: string) => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [assignDept, setAssignDept] = useState(complaint.suggestedDepartment || "Public Works");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Admin resolution states
  const [resolutionUrl, setResolutionUrl] = useState("");
  const [imageError, setImageError] = useState(false);

  // Simulated live comments load
  useEffect(() => {
    loadComments();
  }, [complaint.id]);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const q = query(
        collection(db, "comments"),
        where("complaintId", "==", complaint.id)
      );
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "comments");
      }
      const items: Comment[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          complaintId: d.complaintId,
          authorId: d.authorId,
          authorName: d.authorName,
          authorRole: d.authorRole,
          text: d.text,
          evidenceUrl: d.evidenceUrl,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt || new Date().toISOString()
        });
      });
      // Sort client-side to ensure ordering
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setComments(items);
    } catch (err) {
      console.error("Error fetching comments:", err);
      // Fallback mock comments
      setComments([
        {
          id: "mock-1",
          complaintId: complaint.id,
          authorId: "user-vol-1",
          authorName: "Rohan Gupta",
          authorRole: "Volunteer",
          text: "I inspected this spot earlier today. This pothole is extremely dangerous for motorcyclists at night. Upvoted for urgent repair!",
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;

    const newComment = {
      complaintId: complaint.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      text: commentText.trim(),
      evidenceUrl: evidenceUrl.trim() || undefined
    };

    onAddComment(newComment);
    
    // Optimistic local state update
    const optComment: Comment = {
      id: "temp-" + Date.now(),
      ...newComment,
      createdAt: new Date().toISOString()
    };
    setComments(prev => [...prev, optComment]);
    setCommentText("");
    setEvidenceUrl("");
  };

  const handleVerifyVote = () => {
    if (!currentUser) return;
    onVote(complaint.id);
  };

  // Status helper styling
  const getStatusBadge = (status: Complaint["status"]) => {
    const map = {
      Pending: { bg: "bg-secondary", text: "text-white", label: t("pending") },
      Verified: { bg: "bg-info", text: "text-dark", label: t("verified") },
      "In-Progress": { bg: "bg-warning", text: "text-dark", label: t("inProgress") },
      Resolved: { bg: "bg-success", text: "text-white", label: t("resolved") + " ✓" },
      Rejected: { bg: "bg-danger", text: "text-white", label: t("rejected") }
    };
    const c = map[status] || { bg: "bg-secondary", text: "text-white", label: status };
    return <span className={`badge ${c.bg} ${c.text} px-3 py-2 fs-6 fw-bold`}>{c.label}</span>;
  };

  const formattedDate = (dStr: string) => {
    try {
      return new Date(dStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dStr;
    }
  };

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const statusText = complaint.status === "Pending" ? t("pending") : complaint.status === "In-Progress" ? t("inProgress") : complaint.status === "Resolved" ? t("resolved") : complaint.status;
    const categoryTranslations = {
      "Pothole & Road Damage": t("potholeRoad"),
      "Garbage & Waste Accumulation": t("garbageWaste"),
      "Water Leakage & Drainage": t("waterLeakage"),
      "Streetlight & Electrical": t("streetlightElectrical"),
      "Public Safety & Vandalism": t("publicSafety")
    };
    const categoryText = categoryTranslations[complaint.category] || complaint.category;
    
    // Friendly speech text customized for multilinguality
    const localizedReportedBy = t("reportedBy") || "Reported by";
    const localizedStatus = t("status") || "Status";
    const localizedCategory = t("category") || "Category";
    
    const text = `${complaint.title}. ${localizedReportedBy}: ${complaint.reporterName}. ${localizedStatus}: ${statusText}. ${localizedCategory}: ${categoryText}. ${complaint.description}.`;
    speakText(text, lang);

    const checkSpeech = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setIsSpeaking(false);
        clearInterval(checkSpeech);
      }
    }, 500);
  };

  return (
    <div className="container-fluid px-0" id="complaint-detail-page">
      {/* Header breadcrumb action */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <button onClick={onBack} className="btn btn-outline-dark d-flex align-items-center gap-2 fw-bold" id="btn-back-dashboard">
          <span>← {t("backToDashboard")}</span>
        </button>
        
        <div className="d-flex align-items-center gap-2">
          <button
            onClick={handleToggleSpeak}
            className={`btn btn-sm px-3 py-2 fw-bold rounded-pill d-flex align-items-center gap-2 transition-all ${isSpeaking ? "btn-danger text-white animate-pulse" : "btn-warning text-dark"}`}
            id="btn-speak-issue-detail"
          >
            {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{isSpeaking ? t("stopListenBtn") : "🔊 " + t("listenBtn")}</span>
          </button>
          <span className="text-muted small bg-light px-2.5 py-1.5 rounded-3 border">ID: {complaint.id.substring(0, 8)}...</span>
        </div>
      </div>

      <div className="row">
        {/* Left Side: General Info, Image, and comments */}
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 mb-4">
            <div className="position-relative overflow-hidden bg-dark d-flex align-items-center justify-content-center" style={{ height: "320px", maxHeight: "380px" }}>
              {imageError || !complaint.imageUrl ? (
                <div className="d-flex flex-column align-items-center justify-content-center text-muted h-100 w-100" style={{ backgroundColor: "#151b26" }}>
                  <span style={{ fontSize: "5rem" }}>
                    {complaint.category === "Pothole & Road Damage" ? "🕳️" :
                     complaint.category === "Garbage & Waste Accumulation" ? "🗑️" :
                     complaint.category === "Water Leakage & Drainage" ? "💧" :
                     complaint.category === "Streetlight & Electrical" ? "💡" :
                     complaint.category === "Public Safety & Vandalism" ? "⚠️" : "🏗️"}
                  </span>
                </div>
              ) : (
                <img 
                  src={complaint.imageUrl} 
                  alt="" 
                  className="img-fluid w-100 h-100" 
                  style={{ objectFit: "cover", maxHeight: "380px", opacity: 0.85 }}
                  onError={() => setImageError(true)}
                />
              )}
              <div className="position-absolute top-0 start-0 m-3">
                {getStatusBadge(complaint.status)}
              </div>
              <div className="position-absolute bottom-0 start-0 w-100 p-3 bg-gradient-to-t from-black to-transparent text-white bg-dark bg-opacity-70">
                <h4 className="fw-bold mb-1">{complaint.title}</h4>
                <div className="d-flex align-items-center gap-3 small text-white-50">
                  <span className="d-flex align-items-center gap-1"><User size={14} /> Reported by {complaint.reporterName}</span>
                  <span className="d-flex align-items-center gap-1"><Calendar size={14} /> Mapped {formattedDate(complaint.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="card-body p-4">
              <h5 className="fw-bold text-dark mb-2">{t("detailedDesc")}</h5>
              <p className="text-muted mb-4 fs-6 fw-medium" style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                {complaint.description}
              </p>

              <hr className="my-4" />

              {/* GPS Coordinates layout */}
              <div className="bg-light rounded-4 p-3 mb-4">
                <h6 className="fw-bold text-dark mb-2">{t("gpsLabel")} Specs</h6>
                <div className="row g-2">
                  <div className="col-sm-6">
                    <span className="text-muted d-block small">Verifiable Address:</span>
                    <strong className="text-dark small">{complaint.gpsLocation.address}</strong>
                  </div>
                  <div className="col-sm-6 d-flex justify-content-sm-end gap-3 align-items-center mt-2 mt-sm-0">
                    <div>
                      <span className="text-muted d-block small">Latitude:</span>
                      <strong className="text-dark small">{complaint.gpsLocation.lat}</strong>
                    </div>
                    <div>
                      <span className="text-muted d-block small">Longitude:</span>
                      <strong className="text-dark small">{complaint.gpsLocation.lng}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Google Map of the Complaint */}
              <div className="card shadow-sm border-0 overflow-hidden mb-4" style={{ height: "250px" }} id="issue-detail-map-card">
                {hasValidKey ? (
                  <APIProvider apiKey={API_KEY} version="weekly">
                    <Map
                      defaultCenter={{ lat: complaint.gpsLocation.lat, lng: complaint.gpsLocation.lng }}
                      defaultZoom={15}
                      mapId="DEMO_MAP_ID"
                      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                      style={{ width: "100%", height: "100%" }}
                      gestureHandling={"cooperative"}
                    >
                      <AdvancedMarker
                        position={{ lat: complaint.gpsLocation.lat, lng: complaint.gpsLocation.lng }}
                        title={complaint.title}
                      >
                        <Pin
                          background={
                            complaint.severity === "Critical" ? "#dc3545" : 
                            complaint.severity === "High" ? "#fd7e14" : 
                            complaint.severity === "Medium" ? "#ffc107" : "#0d6efd"
                          }
                          borderColor="#ffffff"
                          glyphColor="#fff"
                        />
                      </AdvancedMarker>
                    </Map>
                  </APIProvider>
                ) : (
                  <div className="h-100 bg-[#111] text-white d-flex flex-column align-items-center justify-content-center p-3 text-center border">
                    <MapPin className="text-primary animate-bounce mb-2" size={24} />
                    <span className="fw-semibold small">Live Map View Unavailable</span>
                    <span className="text-white-50 mt-1" style={{ fontSize: "0.75rem", maxWidth: "300px" }}>
                      Connect your <code>GOOGLE_MAPS_PLATFORM_KEY</code> to enable real street-level satellite maps for this issue.
                    </span>
                  </div>
                )}
              </div>

              {/* Discussion Thread */}
              <div className="mb-4">
                <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                  <MessageSquare size={20} className="text-primary" /> {t("publicComments")} ({comments.length})
                </h5>

                {loadingComments ? (
                  <div className="text-center py-3 text-muted">Loading...</div>
                ) : (
                  <div className="d-flex flex-column gap-3 mb-4">
                    {comments.length === 0 ? (
                      <div className="text-center py-4 text-muted bg-light rounded-3 fw-medium">
                        No replies posted yet. Let citizens and volunteers weigh in!
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="d-flex gap-3 p-3 bg-white border rounded-4 shadow-sm" id={`comment-block-${comment.id}`}>
                          <div className="p-2 bg-light rounded-circle align-self-start text-dark d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px" }}>
                            <User size={18} />
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center justify-content-between mb-1">
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold text-dark">{comment.authorName}</span>
                                <span className={`badge ${comment.authorRole === "Admin" ? "bg-danger" : comment.authorRole === "Volunteer" ? "bg-success" : "bg-secondary"} small`}>
                                  {comment.authorRole === "Citizen" ? t("roleCitizen").split(" ")[0] : comment.authorRole === "Volunteer" ? t("roleVolunteer").split(" ")[0] : t("roleAdmin").split(" ")[0]}
                                </span>
                              </div>
                              <span className="text-muted small">{formattedDate(comment.createdAt)}</span>
                            </div>
                            <p className="mb-0 text-muted small fw-medium">{comment.text}</p>
                            {comment.evidenceUrl && (
                              <div className="mt-2 p-2 bg-light rounded border d-flex align-items-center gap-2" style={{ maxWidth: "250px" }}>
                                <FileImage size={16} className="text-primary" />
                                <a href={comment.evidenceUrl} target="_blank" rel="noreferrer" className="text-decoration-underline text-truncate small text-primary fw-bold">
                                  {t("evidence")}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Comment Box Form */}
                {currentUser ? (
                  <form onSubmit={handlePostComment} className="card p-3 border-0 bg-light rounded-4" style={{ border: "1px solid rgba(0,0,0,0.08) !important" }}>
                    <h6 className="fw-bold mb-2">{t("addCommentPlaceholder").substring(0, 30)}</h6>
                    <div className="mb-2">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={t("addCommentPlaceholder")}
                        className="form-control"
                        rows={3}
                        required
                        id="comment-text-input"
                      />
                    </div>
                    <div className="row g-2">
                      <div className="col-md-8">
                        <input
                          type="text"
                          value={evidenceUrl}
                          onChange={(e) => setEvidenceUrl(e.target.value)}
                          placeholder={t("resolveEvidencePlaceholder")}
                          className="form-control form-control-sm"
                          id="comment-evidence-url"
                        />
                      </div>
                      <div className="col-md-4">
                        <button type="submit" className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2 py-2 fw-bold" id="comment-post-btn">
                          <Send size={14} />
                          <span>{t("postCommentBtn")}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="alert alert-secondary text-center fw-bold">
                    Please log in to participate in the local neighborhood discussion boards.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: AI Reasoning, Volunteer Verification Controls, and Admin Actions */}
        <div className="col-lg-4">
          {/* AI Reasoning and Priority Module */}
          <div className="card shadow-sm border-0 bg-dark text-white p-4 mb-4" id="ai-reasoning-module">
            <h5 className="fw-bold text-warning d-flex align-items-center gap-2 mb-3">
              <Sparkles size={20} className="animate-spin" style={{ animationDuration: "8s" }} /> {t("appName")} AI Analysis
            </h5>
            <div className="mb-3 d-flex align-items-center justify-content-between border-bottom border-secondary pb-3">
              <div>
                <span className="text-white-50 d-block small">{t("severity")}:</span>
                <strong className={`fs-5 ${complaint.severity === "Critical" ? "text-danger" : "text-warning"}`}>
                  {complaint.severity === "Critical" ? t("critical") : complaint.severity === "High" ? t("high") : complaint.severity === "Medium" ? t("medium") : t("low")}
                </strong>
              </div>
              <div className="text-end">
                <span className="text-white-50 d-block small">{t("priorityScore")}:</span>
                <strong className="fs-5 text-success">{complaint.priorityScore} / 100</strong>
              </div>
            </div>

            <div className="mb-3">
              <span className="text-white-50 d-block small mb-1">{t("aiDiagnosis")}:</span>
              <p className="small mb-0 text-white-80 fw-medium" style={{ fontStyle: "italic", lineHeight: "1.5" }}>
                "{complaint.aiReasoning || "Diagnostics complete. Issue categorized successfully."}"
              </p>
            </div>

            <div className="bg-secondary bg-opacity-25 rounded p-2">
              <span className="text-white-50 d-block small">{t("assignedTo")}:</span>
              <span className="fw-bold text-warning small">{complaint.suggestedDepartment || "Public Works"}</span>
            </div>
          </div>

          {/* Verification Voting Actions (Citizen & Volunteers) */}
          <div className="card shadow-sm border-0 p-4 mb-4" id="verification-voting-module" style={{ border: "1px solid rgba(0,0,0,0.12)" }}>
            <h5 className="fw-bold text-dark mb-3">Community Trust Verification</h5>
            <p className="text-muted small mb-3 fw-medium">
              Citizens upvote to collectively signal that the issue is genuine. Volunteers authenticate reports.
            </p>

            <div className="d-flex flex-column gap-2">
              <button 
                onClick={handleVerifyVote}
                className="btn btn-outline-success d-flex align-items-center justify-content-between p-3"
                disabled={!currentUser}
                id="btn-verify-vote"
              >
                <div className="d-flex align-items-center gap-2">
                  <Vote size={18} />
                  <span className="fw-bold small text-start d-block">
                    {currentUser?.role === "Volunteer" ? t("verifyThis") : t("upvoteThis")}
                  </span>
                </div>
                <span className="badge bg-success fs-6">{complaint.upvotesCount} {t("upvotes")}</span>
              </button>
              
              {currentUser?.role === "Volunteer" && (
                <div className="mt-2">
                  <div className="badge bg-info bg-opacity-10 text-info w-100 p-2 border border-info-subtle text-start text-wrap">
                    ✓ {t("alreadyVerified")} ({t("roleVolunteer")})
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin Dispatcher Module */}
          {currentUser?.role === "Admin" && (
            <div className="card shadow-sm border-0 border-top border-danger border-4 p-4 mb-4" id="admin-dispatcher-module" style={{ border: "1px solid rgba(0,0,0,0.12)" }}>
              <div className="d-flex align-items-center gap-2 mb-3">
                <Award className="text-danger" size={24} />
                <h5 className="fw-bold text-dark mb-0">Admin Division Portal</h5>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold text-muted small mb-1">Assign Service Department</label>
                <input
                  type="text"
                  value={assignDept}
                  onChange={(e) => setAssignDept(e.target.value)}
                  className="form-control form-control-sm"
                  id="admin-assign-dept"
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold text-muted small mb-1">Resolution Evidence Picture URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/... (resolved image)"
                  value={resolutionUrl}
                  onChange={(e) => setResolutionUrl(e.target.value)}
                  className="form-control form-control-sm"
                  id="admin-resolution-url"
                />
              </div>

              <div className="d-flex flex-column gap-2">
                <button
                  onClick={() => onUpdateStatus(complaint.id, "In-Progress", undefined, assignDept)}
                  className="btn btn-warning btn-sm fw-bold w-100 py-2 text-dark"
                  id="btn-admin-inprogress"
                >
                  {t("markInProgressBtn")}
                </button>
                <button
                  onClick={() => onUpdateStatus(complaint.id, "Resolved", resolutionUrl, assignDept)}
                  className="btn btn-success btn-sm fw-bold w-100 py-2 text-white"
                  id="btn-admin-resolved"
                >
                  {t("resolveIssueBtn")}
                </button>
                <button
                  onClick={() => onUpdateStatus(complaint.id, "Rejected", undefined, assignDept)}
                  className="btn btn-outline-danger btn-sm fw-bold w-100 py-2 border-0"
                  id="btn-admin-rejected"
                >
                  Reject & Archive Complaint
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
