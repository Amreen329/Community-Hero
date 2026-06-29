import { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { 
  collection, getDocs, addDoc, updateDoc, doc, setDoc, getDoc, 
  increment, arrayUnion 
} from "firebase/firestore";
import { UserProfile, Complaint, Comment, NotificationItem } from "./types";
import Auth from "./components/Auth";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import ReportIssue from "./components/ReportIssue";
import IssueDetail from "./components/IssueDetail";
import CivicBot from "./components/CivicBot";
import Profile from "./components/Profile";
import { Bell, Sparkles, Star, Award, CheckCircle } from "lucide-react";
import { translations, LanguageCode, SUPPORTED_LANGUAGES } from "./translations";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "report" | "chat" | "profile">("dashboard");
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Array<{ id: string; text: string; type: string }>>([]);
  const [lang, setLang] = useState<LanguageCode>("en");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Load complaints, handle database seeding, and detect live location
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    loadComplaints();

    // Fetch user's actual live geolocation to dynamically focus maps & dashboards
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6))
          });
        },
        (err) => {
          console.warn("Could not determine live location, using fallback:", err);
          setUserLocation({ lat: 12.9716, lng: 77.5946 });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setUserLocation({ lat: 12.9716, lng: 77.5946 });
    }
  }, []);

  const loadComplaints = async () => {
    try {
      const colRef = collection(db, "complaints");
      let querySnapshot;
      try {
        querySnapshot = await getDocs(colRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "complaints");
      }
      const items: Complaint[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          reporterId: data.reporterId || "",
          reporterName: data.reporterName || "Anonymous",
          title: data.title || "",
          description: data.description || "",
          category: data.category || "",
          severity: data.severity || "Medium",
          gpsLocation: data.gpsLocation || { lat: 12.9716, lng: 77.5946, address: "Civic Road" },
          imageUrl: data.imageUrl || "",
          status: data.status || "Pending",
          upvotesCount: data.upvotesCount || 0,
          commentsCount: data.commentsCount || 0,
          priorityScore: data.priorityScore || 50,
          suggestedDepartment: data.suggestedDepartment || "Public Works",
          aiReasoning: data.aiReasoning || "",
          createdAt: data.createdAt || new Date().toISOString(),
          resolvedAt: data.resolvedAt,
          resolvedEvidenceUrl: data.resolvedEvidenceUrl,
          verifiedBy: data.verifiedBy || []
        });
      });

      if (items.length === 0) {
        console.log("No complaints found. Seeding initial high-quality neighborhood data...");
        const seedData = getSeedComplaints();
        const seededList: Complaint[] = [];
        
        for (const seed of seedData) {
          let docRef;
          try {
            docRef = await addDoc(collection(db, "complaints"), seed);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, "complaints");
          }
          seededList.push({
            id: docRef.id,
            ...seed
          });
        }
        setComplaints(seededList);
      } else {
        setComplaints(items);
      }
    } catch (err) {
      console.error("Failed to load complaints from Firestore, using offline fallback:", err);
      setComplaints(getSeedComplaints().map((c, idx) => ({ id: `offline-${idx}`, ...c })));
    }
  };

  // Seed data definitions
  const getSeedComplaints = (): Omit<Complaint, "id">[] => [
    {
      reporterId: "seed-user-1",
      reporterName: "Arjun Kumar",
      title: "Broken Streetlight & Dark Patch near Sector 2 Park",
      description: "The streetlight opposite Central Park south gate has been fully defunct for 4 days. The entire pedestrian walkway is pitch black after 6 PM, posing safety issues for evening walkers.",
      category: "Streetlight & Electrical",
      severity: "High",
      gpsLocation: {
        lat: 12.9650,
        lng: 77.5850,
        address: "No. 42, Park View Layout, Sector 2"
      },
      imageUrl: "https://images.unsplash.com/photo-1517059224940-d4af9eec41b7?auto=format&fit=crop&q=80&w=400",
      status: "Pending",
      upvotesCount: 8,
      commentsCount: 2,
      priorityScore: 72,
      suggestedDepartment: "Electricity & Lighting Division",
      aiReasoning: "Multiple reports nearby. Lightlessness poses a verified threat to female and senior safety.",
      createdAt: new Date(Date.now() - 172800000).toISOString() // 2 days ago
    },
    {
      reporterId: "seed-user-2",
      reporterName: "Meera Patel",
      title: "Deep Pothole Grid causing traffic lock on Main Avenue",
      description: "Severe road bitumen erosion has created three deep interconnected potholes right in the middle of the heavy traffic intersection. Cars are swerving dangerously to avoid damage.",
      category: "Pothole & Road Damage",
      severity: "Critical",
      gpsLocation: {
        lat: 12.9716,
        lng: 77.5946,
        address: "MG Road Main Intersection, adjacent to State Library"
      },
      imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=400",
      status: "In-Progress",
      upvotesCount: 24,
      commentsCount: 5,
      priorityScore: 94,
      suggestedDepartment: "Public Works & Roads",
      aiReasoning: "Identified high risk intersection. Immediate vehicle alignment threat. Standard repair queue bypassed.",
      createdAt: new Date(Date.now() - 345600000).toISOString() // 4 days ago
    },
    {
      reporterId: "seed-user-3",
      reporterName: "Rohan Gupta",
      title: "Ruptured Water Supply Main flooding Koromangala Road",
      description: "Pressurized municipal clean water pipeline has burst. Thousands of gallons are gushing out onto the sidewalks and starting to erode the adjacent concrete wall foundations.",
      category: "Water Leakage & Drainage",
      severity: "High",
      gpsLocation: {
        lat: 12.9820,
        lng: 77.6050,
        address: "12th Cross Road, Koromangala 8th Block"
      },
      imageUrl: "https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&q=80&w=400",
      status: "Resolved",
      upvotesCount: 15,
      commentsCount: 3,
      priorityScore: 85,
      suggestedDepartment: "Water & Sewage Board",
      aiReasoning: "Clean water wastage detected. Sub-surface washouts expected if not addressed.",
      createdAt: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
      resolvedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      resolvedEvidenceUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400"
    }
  ];

  // Global Toast Dispatcher
  const triggerToast = (text: string, type: string = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Add notification helper
  const addNotification = async (userId: string, text: string, type: NotificationItem["type"]) => {
    const newNotif: Omit<NotificationItem, "id"> = {
      userId,
      text,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, "notifications"), newNotif);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "notifications");
    }
    setNotifications(prev => [
      { id: Math.random().toString(), ...newNotif },
      ...prev
    ]);
  };

  // Handle reporting a new complaint
  const handleReportSubmit = async (newIssue: Omit<Complaint, "id" | "createdAt" | "upvotesCount" | "commentsCount" | "status">) => {
    if (!currentUser) return;

    try {
      const complaintToSave: Omit<Complaint, "id"> = {
        ...newIssue,
        status: "Pending",
        upvotesCount: 1,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        verifiedBy: []
      };

      let docRef;
      try {
        docRef = await addDoc(collection(db, "complaints"), complaintToSave);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "complaints");
      }
      const savedComplaint: Complaint = { id: docRef.id, ...complaintToSave };
      
      setComplaints(prev => [savedComplaint, ...prev]);

      // Reward citizen +10 points
      const updatedPoints = currentUser.points + 10;
      let updatedBadges = [...currentUser.badges];
      
      if (updatedPoints >= 40 && !updatedBadges.includes("Guardian Spotter")) {
        updatedBadges.push("Guardian Spotter");
        triggerToast("🏆 Badge Unlocked: Guardian Spotter!", "info");
      }

      try {
        await updateDoc(doc(db, "users", currentUser.id), {
          points: updatedPoints,
          badges: updatedBadges
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.id}`);
      }

      setCurrentUser(prev => prev ? { ...prev, points: updatedPoints, badges: updatedBadges } : null);
      
      triggerToast("🎉 Issue Mapped Successfully! You earned +10 Civic Points!");
      addNotification(currentUser.id, "Your neighborhood report has been submitted for community verification. (+10 Pts)", "points");
      
      setActiveTab("dashboard");
    } catch (err) {
      console.error("Failed to post report:", err);
      triggerToast("Error filing report. Using local simulation...", "danger");
    }
  };

  // Upvoting or Volunteer verifying
  const handleVote = async (complaintId: string) => {
    if (!currentUser) return;

    const target = complaints.find(c => c.id === complaintId);
    if (!target) return;

    // Check if volunteer has already verified to prevent duplicate verification
    if (currentUser.role === "Volunteer" && target.verifiedBy?.includes(currentUser.id)) {
      triggerToast("You have already verified this complaint!", "warning");
      return;
    }

    try {
      const complaintRef = doc(db, "complaints", complaintId);
      const isVolunteer = currentUser.role === "Volunteer";

      let updates: any = {
        upvotesCount: increment(1)
      };

      if (isVolunteer) {
        updates.verifiedBy = arrayUnion(currentUser.id);
        updates.status = "Verified";
      }

      try {
        await updateDoc(complaintRef, updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `complaints/${complaintId}`);
      }

      // Update local state
      setComplaints(prev => prev.map(c => {
        if (c.id === complaintId) {
          return {
            ...c,
            upvotesCount: c.upvotesCount + 1,
            status: isVolunteer ? "Verified" : c.status,
            verifiedBy: isVolunteer ? [...(c.verifiedBy || []), currentUser.id] : c.verifiedBy
          };
        }
        return c;
      }));

      // Give Voter points
      const pointsReward = isVolunteer ? 15 : 5;
      const updatedPoints = currentUser.points + pointsReward;
      let updatedBadges = [...currentUser.badges];

      if (isVolunteer && updatedPoints >= 200 && !updatedBadges.includes("Validator Expert")) {
        updatedBadges.push("Validator Expert");
        triggerToast("🏆 Badge Unlocked: Validator Expert!", "info");
      }

      try {
        await updateDoc(doc(db, "users", currentUser.id), {
          points: updatedPoints,
          badges: updatedBadges
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.id}`);
      }

      setCurrentUser(prev => prev ? { ...prev, points: updatedPoints, badges: updatedBadges } : null);
      
      triggerToast(isVolunteer ? `✓ Report Authenticated! Earned +${pointsReward} Volunteer Points!` : `Upvoted! Earned +${pointsReward} Civic Points!`);
      
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  // Admin updating status / dispatching
  const handleUpdateStatus = async (complaintId: string, newStatus: Complaint["status"], resolvedUrl?: string, dept?: string) => {
    if (currentUser?.role !== "Admin") return;

    try {
      const complaintRef = doc(db, "complaints", complaintId);
      const updates: any = {
        status: newStatus,
        suggestedDepartment: dept || "Public Works"
      };

      if (newStatus === "Resolved") {
        updates.resolvedAt = new Date().toISOString();
        if (resolvedUrl) {
          updates.resolvedEvidenceUrl = resolvedUrl;
        }
      }

      try {
        await updateDoc(complaintRef, updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `complaints/${complaintId}`);
      }

      // Update local state
      setComplaints(prev => prev.map(c => {
        if (c.id === complaintId) {
          return {
            ...c,
            status: newStatus,
            suggestedDepartment: dept || c.suggestedDepartment,
            resolvedAt: newStatus === "Resolved" ? new Date().toISOString() : undefined,
            resolvedEvidenceUrl: resolvedUrl || c.resolvedEvidenceUrl
          };
        }
        return c;
      }));

      triggerToast(`✓ Status updated to ${newStatus} for district division.`);

      // Notify reporter of status change & grant +20 reward points if resolved!
      const complaint = complaints.find(c => c.id === complaintId);
      if (complaint && newStatus === "Resolved") {
        const reporterRef = doc(db, "users", complaint.reporterId);
        let reporterSnap;
        try {
          reporterSnap = await getDoc(reporterRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${complaint.reporterId}`);
        }
        
        if (reporterSnap && reporterSnap.exists()) {
          const repData = reporterSnap.data() as UserProfile;
          try {
            await updateDoc(reporterRef, {
              points: increment(20),
              badges: arrayUnion("Civic Champion")
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `users/${complaint.reporterId}`);
          }
          addNotification(complaint.reporterId, `🎉 Your reported issue '${complaint.title}' has been officially RESOLVED by ${dept || "Public Works"}! You earned a +20 resolved bonus and 'Civic Champion' badge!`, "status");
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Add Comment thread
  const handleAddComment = async (comment: Omit<Comment, "id" | "createdAt">) => {
    try {
      const colRef = collection(db, "comments");
      try {
        await addDoc(colRef, {
          ...comment,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "comments");
      }

      // Update complaint comments count
      const complaintRef = doc(db, "complaints", comment.complaintId);
      try {
        await updateDoc(complaintRef, {
          commentsCount: increment(1)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `complaints/${comment.complaintId}`);
      }

      setComplaints(prev => prev.map(c => {
        if (c.id === comment.complaintId) {
          return { ...c, commentsCount: c.commentsCount + 1 };
        }
        return c;
      }));

      triggerToast("Comment added to discussion thread.");
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  // Mock Leaders List
  const mockLeaderboard: UserProfile[] = [
    { id: "lead-1", email: "dave@gmail.com", name: "Dave Miller", role: "Citizen", points: 410, badges: ["Spotter Hero", "Civic Champion"], joinedAt: "" },
    { id: "lead-2", email: "pete@gmail.com", name: "Peter Parker", role: "Volunteer", points: 310, badges: ["Guardian Spotter", "Validator Expert"], joinedAt: "" },
    { id: "lead-3", email: "tony@gmail.com", name: "Tony Stark", role: "Citizen", points: 280, badges: ["Spotter Hero"], joinedAt: "" },
    currentUser ? currentUser : { id: "lead-empty", email: "", name: "Guest Hero", role: "Citizen", points: 0, badges: [], joinedAt: "" }
  ].filter(u => u.name !== "Guest Hero" || !currentUser);

  // Toggle Dark Mode
  const handleToggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    document.documentElement.setAttribute("data-theme", nextDark ? "dark" : "light");
  };

  // Find selected complaint object
  const selectedComplaint = complaints.find(c => c.id === selectedComplaintId) || null;

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ transition: "background-color 0.3s" }}>
      {/* Toast dispatch render list */}
      <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1100, maxWidth: "350px" }} id="toast-dispatcher-rack">
        {toasts.map(t => (
          <div key={t.id} className={`toast show align-items-center text-white border-0 mb-2 p-2 rounded-4 shadow ${t.type === "danger" ? "bg-danger" : t.type === "warning" ? "bg-warning text-dark" : t.type === "info" ? "bg-info text-dark" : "bg-success"}`} role="alert">
            <div className="d-flex">
              <div className="toast-body d-flex align-items-center gap-2 fw-semibold">
                <CheckCircle size={18} />
                <span>{t.text}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentUser ? (
        <>
          {/* Header Navbar */}
          <Navbar 
            user={currentUser}
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setSelectedComplaintId(null);
            }}
            onLogout={() => {
              setCurrentUser(null);
              triggerToast("Logged out successfully.");
            }}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
            lang={lang}
            onLangChange={(newLang) => setLang(newLang)}
          />

          {/* Main Layout Content View */}
          <main className="container flex-grow-1 py-4">
            {selectedComplaintId && selectedComplaint ? (
              <IssueDetail
                complaint={selectedComplaint}
                currentUser={currentUser}
                onBack={() => setSelectedComplaintId(null)}
                onUpdateStatus={handleUpdateStatus}
                onVote={handleVote}
                onAddComment={handleAddComment}
                lang={lang}
              />
            ) : activeTab === "dashboard" ? (
              <Dashboard 
                complaints={complaints}
                currentUser={currentUser}
                usersLeaderboard={mockLeaderboard}
                onSelectIssue={(id) => setSelectedComplaintId(id)}
                onNavigateToReport={() => setActiveTab("report")}
                lang={lang}
                userLocation={userLocation}
                darkMode={darkMode}
              />
            ) : activeTab === "report" ? (
              <ReportIssue 
                userId={currentUser.id}
                userName={currentUser.name}
                existingComplaints={complaints}
                onSubmit={handleReportSubmit}
                lang={lang}
                userLocation={userLocation}
                darkMode={darkMode}
              />
            ) : activeTab === "profile" ? (
              <Profile 
                currentUser={currentUser}
                complaints={complaints}
                onSelectIssue={(id) => setSelectedComplaintId(id)}
                onNavigateToReport={() => setActiveTab("report")}
                lang={lang}
                darkMode={darkMode}
              />
            ) : (
              <CivicBot user={currentUser} lang={lang} />
            )}
          </main>

          {/* Elegant Footer footer */}
          <footer className={`border-top mt-auto py-4 text-center text-muted small ${darkMode ? "bg-dark border-secondary text-white-50" : "bg-white"}`}>
            <div className="container">
              <p className="mb-1 fw-bold">Community Hero – Hyperlocal Problem Solver</p>
              <p className="mb-0" style={{ fontSize: "0.75rem" }}>
                Built powered by Google Gemini AI & Firebase Firestore.
              </p>
            </div>
          </footer>
        </>
      ) : (
        <div className="container d-flex flex-column justify-content-center min-vh-100">
          <Auth 
            onAuthSuccess={(profile) => {
              setCurrentUser(profile);
              triggerToast(`Welcome back, ${profile.name}!`);
            }} 
            lang={lang}
            onLangChange={(newLang) => setLang(newLang)}
          />
        </div>
      )}
    </div>
  );
}
