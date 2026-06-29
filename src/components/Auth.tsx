import React, { useState } from "react";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Loader2, ShieldCheck, Mail, Lock, User, Sparkles, Globe } from "lucide-react";
import { UserProfile } from "../types";
import { translations, LanguageCode, SUPPORTED_LANGUAGES } from "../translations";

interface AuthProps {
  onAuthSuccess: (user: UserProfile) => void;
  lang: LanguageCode;
  onLangChange: (lang: LanguageCode) => void;
}

export default function Auth({ onAuthSuccess, lang, onLangChange }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"Citizen" | "Volunteer" | "Admin">("Citizen");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const t = (key: string) => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isSignUp) {
        // Firebase Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;

        // Create Profile in Firestore
        const profile: UserProfile = {
          id: fbUser.uid,
          email: fbUser.email || email,
          name: name.trim() || "Anonymous Hero",
          role,
          points: 10, // starting points
          badges: ["Spotter Cadet"],
          joinedAt: new Date().toISOString()
        };

        try {
          await setDoc(doc(db, "users", fbUser.uid), profile);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}`);
        }
        onAuthSuccess(profile);
      } else {
        // Firebase Log In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;

        // Fetch profile
        const docRef = doc(db, "users", fbUser.uid);
        let docSnap;
        try {
          docSnap = await getDoc(docRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${fbUser.uid}`);
        }

        if (docSnap && docSnap.exists()) {
          onAuthSuccess(docSnap.data() as UserProfile);
        } else {
          // If no document exists, create a default one
          const defaultProfile: UserProfile = {
            id: fbUser.uid,
            email: fbUser.email || email,
            name: fbUser.displayName || email.split("@")[0],
            role: "Citizen",
            points: 10,
            badges: ["Spotter Cadet"],
            joinedAt: new Date().toISOString()
          };
          try {
            await setDoc(doc(db, "users", fbUser.uid), defaultProfile);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}`);
          }
          onAuthSuccess(defaultProfile);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const code = err.code || "";
      if (code === "auth/operation-not-allowed") {
        setErrorMsg(
          "Email & Password Sign-In is disabled in your Firebase project. To enable it, navigate to your Firebase Console > Authentication > Sign-in method, click 'Add new provider', and enable 'Email/Password'. Alternatively, please sign in using Google or click any Guest Bypass button below!"
        );
      } else if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
        setErrorMsg(
          "Invalid email or password. If you do not have an account yet, please click 'Register Profile' below to sign up first, or use the quick 1-click guest bypass buttons below to evaluate different roles instantly!"
        );
      } else if (code === "auth/email-already-in-use") {
        setErrorMsg(
          "An account with this email address already exists. Please sign in instead, or use the quick 1-click guest bypass buttons."
        );
      } else if (code === "auth/weak-password") {
        setErrorMsg(
          "The password is too weak. Please choose a password that is at least 6 characters long."
        );
      } else {
        setErrorMsg(err.message || "Authentication failed. Try quick guest login below.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      // Check if user profile already exists
      const docRef = doc(db, "users", fbUser.uid);
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${fbUser.uid}`);
      }

      let profile: UserProfile;
      if (docSnap && docSnap.exists()) {
        profile = docSnap.data() as UserProfile;
      } else {
        // Create new user profile
        profile = {
          id: fbUser.uid,
          email: fbUser.email || "",
          name: fbUser.displayName || "Anonymous Hero",
          role: "Citizen", // Default role
          points: 10,
          badges: ["Spotter Cadet"],
          joinedAt: new Date().toISOString()
        };
        try {
          await setDoc(docRef, profile);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}`);
        }
      }
      onAuthSuccess(profile);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setErrorMsg("Google Sign-In popup was closed before completion.");
      } else if (err.code === "auth/operation-not-allowed") {
        setErrorMsg(
          "Google Sign-In is disabled in your Firebase project. To enable it, navigate to your Firebase Console > Authentication > Sign-in method, click 'Add new provider', and enable 'Google'. Alternatively, please use the Guest Bypass buttons below!"
        );
      } else {
        setErrorMsg(err.message || "Google Authentication failed. Please try guest login below.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick Guest Login for sandbox evaluation
  const handleGuestLogin = (selectedRole: "Citizen" | "Volunteer" | "Admin") => {
    setLoading(true);
    setErrorMsg("");
    
    const mockId = `mock-user-${selectedRole.toLowerCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const profile: UserProfile = {
      id: mockId,
      email: `${selectedRole.toLowerCase()}@communityhero.org`,
      name: selectedRole === "Admin" ? "Commissioner Dave" : selectedRole === "Volunteer" ? "Rohan Gupta (Volunteer)" : "Arjun Kumar",
      role: selectedRole,
      points: selectedRole === "Admin" ? 450 : selectedRole === "Volunteer" ? 180 : 30,
      badges: selectedRole === "Admin" ? ["Civic Overlord", "Resolution King"] : selectedRole === "Volunteer" ? ["Guardian Spotter", "Verification Expert"] : ["Spotter Cadet"],
      joinedAt: new Date().toISOString()
    };

    // Save asynchronously without blocking the user's login experience
    try {
      setDoc(doc(db, "users", mockId), profile).catch((err) => {
        console.warn("Optional guest user document sync failed:", err);
      });
    } catch (e) {
      console.warn("Firestore document path creation failed:", e);
    }
    
    // Log in instantly
    onAuthSuccess(profile);
    setLoading(false);
  };

  return (
    <div className="row justify-content-center align-items-center min-vh-100 py-5" id="auth-main-row">
      <div className="col-md-5">
        <div className="card shadow border-0 p-4 rounded-4" id="auth-form-card" style={{ border: "1px solid rgba(0,0,0,0.15)" }}>
          {/* Language Selector in Auth Card */}
          <div className="d-flex justify-content-end mb-3">
            <div className="d-flex align-items-center gap-1.5 px-3 py-1.5 bg-light rounded-pill border shadow-sm">
              <Globe size={14} className="text-success" />
              <select
                value={lang}
                onChange={(e) => onLangChange(e.target.value as LanguageCode)}
                className="form-select form-select-sm border-0 bg-transparent fw-bold text-dark p-0"
                style={{ fontSize: "0.8rem", width: "auto", outline: "none", cursor: "pointer" }}
                id="auth-language-picker"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="text-dark">
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-center mb-4">
            <div className="bg-success bg-opacity-10 rounded-circle p-3 d-inline-block mb-3 animate-bounce">
              <ShieldCheck className="text-success" size={40} />
            </div>
            <h3 className="fw-black text-dark mb-1">{t("authTitle")}</h3>
            <p className="text-muted small fw-semibold">{t("authSubtitle")}</p>
            <p className="text-muted small px-2" style={{ fontSize: "0.8rem", lineHeight: "1.4" }}>
              {t("authDesc")}
            </p>
          </div>

          {errorMsg && (
            <div className="alert alert-danger py-3 px-3 small border-0 shadow-sm mb-3 text-dark bg-danger bg-opacity-10">
              <div className="fw-semibold mb-1 text-danger">Authentication Notice:</div>
              <p className="mb-2 text-danger">{errorMsg}</p>
              <div className="mt-3 border-top border-danger border-opacity-20 pt-2">
                <div className="fw-bold mb-2 text-danger">⚡ Quick 1-Click Bypass:</div>
                <div className="d-flex flex-wrap gap-2">
                  <button 
                    type="button" 
                    onClick={() => handleGuestLogin("Citizen")} 
                    className="btn btn-sm btn-primary fw-bold text-white"
                  >
                    Enter as Citizen
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleGuestLogin("Volunteer")} 
                    className="btn btn-sm btn-success fw-bold text-white"
                  >
                    Enter as Volunteer
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleGuestLogin("Admin")} 
                    className="btn btn-sm btn-danger fw-bold text-white"
                  >
                    Enter as Admin
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleAuth}>
            {isSignUp && (
              <div className="mb-3">
                <label className="form-label fw-bold text-dark small">{t("fullName")}</label>
                <div className="input-group">
                  <span className="input-group-text bg-white text-muted"><User size={16} /></span>
                  <input
                    type="text"
                    required
                    placeholder="Arjun Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-control border-secondary-subtle fw-medium text-dark bg-white"
                    id="auth-signup-name"
                  />
                </div>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label fw-bold text-dark small">{t("emailAddress")}</label>
              <div className="input-group">
                <span className="input-group-text bg-white text-muted"><Mail size={16} /></span>
                <input
                  type="email"
                  required
                  placeholder="name@neighborhood.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control border-secondary-subtle fw-medium text-dark bg-white"
                  id="auth-input-email"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold text-dark small">Account Password</label>
              <div className="input-group">
                <span className="input-group-text bg-white text-muted"><Lock size={16} /></span>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control border-secondary-subtle fw-medium text-dark bg-white"
                  id="auth-input-password"
                />
              </div>
            </div>

            {isSignUp && (
              <div className="mb-4">
                <label className="form-label fw-bold text-dark small">{t("selectRole")}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="form-select border-secondary-subtle text-dark fw-bold bg-white"
                  id="auth-signup-role-select"
                >
                  <option value="Citizen">{t("roleCitizen")}</option>
                  <option value="Volunteer">{t("roleVolunteer")}</option>
                  <option value="Admin">{t("roleAdmin")}</option>
                </select>
              </div>
            )}

            <button type="submit" className="btn btn-dark w-100 py-3 fw-bold text-white shadow-sm d-flex align-items-center justify-content-center gap-2 mb-2" disabled={loading} id="btn-auth-submit" style={{ minHeight: "48px" }}>
              {loading ? <Loader2 className="animate-spin text-success" size={20} /> : <Sparkles size={18} className="text-warning" />}
              <span>{isSignUp ? t("signUp") : t("signIn")}</span>
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="btn btn-outline-dark w-100 py-2.5 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2 mb-3 bg-white text-dark"
              disabled={loading}
              id="btn-google-auth"
              style={{ minHeight: "44px" }}
            >
              <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.67-.35-1.37-.35-2.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="btn btn-link text-decoration-none small text-primary fw-bold p-0"
                id="btn-auth-toggle-mode"
              >
                {isSignUp ? t("haveAccount") : t("noAccount")}
              </button>
            </div>
          </form>

          <div className="my-4 border-top text-center position-relative border-secondary border-opacity-15">
            <span className="position-absolute translate-middle bg-white px-2 text-muted small fw-bold" style={{ top: "0" }}>
              {t("orConnectWith")}
            </span>
          </div>

          <div className="row g-2">
            <div className="col-4">
              <button type="button" onClick={() => handleGuestLogin("Citizen")} className="btn btn-outline-primary btn-sm w-100 fw-bold py-2" id="guest-btn-citizen" style={{ fontSize: "0.75rem" }}>
                {t("low") === "कम" ? "नागरिक" : t("low") === "తక్కువ" ? "పౌరుడు" : t("low") === "குறைந்த" ? "குடிமகன்" : t("low") === "ಕಡಿಮೆ" ? "ನಾಗರಿಕ" : t("low") === "കുറഞ്ഞ" ? "പൗരൻ" : "Citizen"}
              </button>
            </div>
            <div className="col-4">
              <button type="button" onClick={() => handleGuestLogin("Volunteer")} className="btn btn-outline-success btn-sm w-100 fw-bold py-2 text-success" id="guest-btn-volunteer" style={{ fontSize: "0.75rem" }}>
                {t("low") === "कम" ? "स्वयंसेवक" : t("low") === "తక్కువ" ? "వాలంటీర్" : t("low") === "குறைந்த" ? "தன்னார்வலர்" : t("low") === "ಕಡಿಮೆ" ? "ಸ್ವಯಂಸೇವಕ" : t("low") === "കുറഞ്ഞ" ? "വോളന്റിയർ" : "Volunteer"}
              </button>
            </div>
            <div className="col-4">
              <button type="button" onClick={() => handleGuestLogin("Admin")} className="btn btn-outline-danger btn-sm w-100 fw-bold py-2" id="guest-btn-admin" style={{ fontSize: "0.75rem" }}>
                {t("low") === "कम" ? "एडमिन" : t("low") === "తక్కువ" ? "అడ్మిన్" : t("low") === "குறைந்த" ? "நிர்வாகி" : t("low") === "ಕಡಿಮೆ" ? "ಅಡ್ಮಿನ್" : t("low") === "കുറഞ്ഞ" ? "അഡ്മിൻ" : "Admin"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
