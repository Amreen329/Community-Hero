import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Send, Bot, User, Award, Loader2, Sparkles, MessageSquare, ArrowRight } from "lucide-react";
import { UserProfile } from "../types";
import { translations, LanguageCode } from "../translations";

interface CivicBotProps {
  user: UserProfile | null;
  lang: LanguageCode;
}

export default function CivicBot({ user, lang }: CivicBotProps) {
  const t = (key: string) => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  const [messages, setMessages] = useState<Array<{ role: "user" | "bot"; content: string }>>([]);

  // Set localized initial greeting message whenever active language changes
  useEffect(() => {
    const greetings: Record<LanguageCode, string> = {
      en: `Hello ${user ? user.name : "Citizen"}! 🌟 I am **CivicHero**, your community support AI. I can guide you on:
      
- 📋 How to **report civic problems** (potholes, leaks, dump sites).
- 🏆 How to **earn community points & badges** (Spotter, Guardian, Expert).
- 🔍 **Volunteer verification duties** & voting.
- 🏢 Tracking which **municipal department** is assigned to an issue.

What would you like to build or resolve today?`,
      hi: `नमस्ते ${user ? user.name : "नागरिक"}! 🌟 मैं **सिविकहीरो** हूं, आपका सामुदायिक सहायता सहायक। मैं आपकी सहायता कर सकता हूं:
      
- 📋 **नागरिक समस्याओं की रिपोर्ट** कैसे करें (गड्ढे, रिसाव, कचरा डंप)।
- 🏆 **सामुदायिक अंक और बैज** कैसे अर्जित करें (स्पॉटर, गार्जियन, एक्सपर्ट)।
- 🔍 **स्वयंसेवक सत्यापन कर्तव्य** और मतदान।
- 🏢 यह ट्रैक करना कि किसी समस्या के लिए कौन सा **नगरपालिका विभाग** नियुक्त किया गया है।

आप आज किस समस्या का समाधान करना चाहेंगे?`,
      te: `నమస్కారం ${user ? user.name : "పౌరుడా"}! 🌟 నేను **సివిక్ హీరో**, మీ పరిసరాల సహాయక సహాయకుడు. నేను మీకు ఈ అంశాలపై మార్గనిర్ದೇಶనం చేయగలను:
      
- 📋 **పరిసర సమస్యలను ఎలా నివేదించాలి** (గుంతలు, నీటి లీకేజీలు, వ్యర్థాలు).
- 🏆 **కమ్యూనిಟಿ పాయింట్లు & బ్యాడ్జీలు ఎలా సంపాదించాలి** (స్పాటర్, గార్డియన్, ఎక్స్‌పర్ట్).
- 🔍 **వాలంటీర్ ధృవీకరణ విధులు** & ఓటింగ్.
- 🏢 ఏ **మునిసిపల్ విభాగం** సమస్యను పరిష్కరిస్తుందో తెలుసుకోవడం.

ఈరోజు మీరు ఏ సమస్యను నివేదించాలనుకుంటున్నారు?`,
      ta: `வணக்கம் ${user ? user.name : "குடிமகனே"}! 🌟 நான் **சிவிக்ஹீரோ**, உங்கள் சமூக உதவி AI. நான் உங்களுக்கு வழிகாட்ட முடியும்:
      
- 📋 **நகர்ப்புற சிக்கல்களை எவ்வாறு புகாரளிப்பது** (பள்ளங்கள், கசிவுகள், குப்பை கிடங்குகள்).
- 🏆 **சமூகப் புள்ளிகள் மற்றும் பேட்ஜ்களை எவ்வாறு பெறுவது** (ஸ்பாட்டர், கார்டியன், நிபுணர்).
- 🔍 **தன்னார்வ சரிபார்ப்பு கடமைகள்** மற்றும் வாக்களிப்பு.
- 🏢 எந்த **நகராட்சித் துறை** ஒரு சிக்கலுக்கு ஒதுக்கப்பட்டுள்ளது என்பதைக் கண்காணித்தல்.

இன்று நீங்கள் எதைத் தீர்க்க விரும்புகிறீர்கள்?`,
      kn: `ನಮಸ್ಕಾರ ${user ? user.name : "ನಾಗರಿಕರೇ"}! 🌟 ನಾನು **ಸಿವಿಕ್‌ಹೀರೋ**, ನಿಮ್ಮ ಸಮುದಾಯ ಬೆಂಬಲ ಸಹಾಯ ಎಐ. ನಾನು ನಿಮಗೆ ಈ ಕೆಳಗಿನ ವಿಷಯಗಳಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:
      
- 📋 **ನಾಗರಿಕ ಸಮಸ್ಯೆಗಳನ್ನು ಹೇಗೆ ವರದಿ ಮಾಡುವುದು** (ಗುಂಡಿಗಳು, ಸೋರಿಕೆಗಳು, ಕಸದ ರಾಶಿ).
- 🏆 **ಸಮುದಾಯ ಅಂಕಗಳು ಮತ್ತು ಬ್ಯಾಡ್ಜ್‌ಗಳನ್ನು ಹೇಗೆ ಗಳಿಸುವುದು** (ಸ್ಪಾಟರ್, ಗಾರ್ಡಿಯನ್, ಎಕ್ಸ್‌ಪರ್ಟ್).
- 🔍 **ಸ್ವಯಂಸೇವಕ ಪರಿಶೀಲನೆ ಕರ್ತವ್ಯಗಳು** ಮತ್ತು ಮತದಾನ.
- 🏢 ಸಮಸ್ಯೆ ಯಾವ **ನಗರಸಭೆ ಇಲಾಖೆಗೆ** ಹಂಚಿಕೆಯಾಗಿದೆ ಎಂಬುದನ್ನು ತಿಳಿಯುವುದು.

ಇಂದು ನೀವು ಯಾವ ಸಮಸ್ಯೆಯನ್ನು ಪರಿಹರಿಸಲು ಬಯಸುತ್ತೀರಿ?`,
      ml: `നമസ്കാരം ${user ? user.name : "പൗരൻ"}! 🌟 ഞാൻ **സിവിക്ഹീറോ** ആണ്, നിങ്ങളുടെ കമ്മ്യൂണിറ്റി സഹായ എഐ. എനിക്ക് നിങ്ങളെ താഴെ പറയുന്നവയിൽ സഹായിക്കാനാകും:
      
- 📋 **പരാതികൾ എങ്ങനെ റിപ്പോർട്ട് ചെയ്യാം** (കുഴികൾ, ചോർച്ചകൾ, മാലിന്യങ്ങൾ).
- 🏆 **കമ്മ്യൂണിറ്റി പോയിന്റുകളും ബാഡ്ജുകളും എങ്ങനെ നേടാം** (സ്പോട്ടർ, ഗാർഡിയൻ, വിദഗ്ദ്ധൻ).
- 🔍 **വോളന്റിയർ വെരിഫിക്കേഷൻ ചുമതലകൾ** & വോട്ടിംഗ്.
- 🏢 ഏത് **മുനിസിപ്പൽ ഡിപ്പാർട്ട്‌മെന്റാണ്** പ്രശ്നം പരിഹരിക്കേണ്ടത് എന്ന് കണ്ടെത്തുക.

ഇന്ന് നിങ്ങൾ ഏത് പ്രശ്നം പരിഹരിക്കാൻ ആഗ്രഹിക്കുന്നു?`
    };

    setMessages([
      {
        role: "bot",
        content: greetings[lang] || greetings.en
      }
    ]);
  }, [lang, user]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg = textToSend.trim();
    setInput("");
    
    // Add user message to state
    const newMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Map history to server's required structure
      const apiMessages = newMessages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content
      }));

      const res = await axios.post("/api/chatbot", {
        messages: apiMessages,
        userRole: user?.role || "Citizen",
        userPoints: user?.points || 0
      });

      setMessages(prev => [...prev, { role: "bot", content: res.data.response }]);
    } catch (err: any) {
      console.error("Chatbot API error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: "bot",
          content: "Oops! My transmission connection took a small pothole damage of its own. Here is a simulated response: Your community points can be converted into civic recognition badges under your Profile! Please try messaging me again soon."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const starterPrompts = [
    { label: t("q1"), text: "Explain how I can earn points and active badges in Community Hero." },
    { label: t("q2"), text: "What is the penalty for illegal garbage dumping?" },
    { label: t("q3"), text: "How is the Civic Priority Score calculated?" },
    { label: t("q4"), text: "How do volunteers verify reported issues?" }
  ];

  return (
    <div className="card shadow border-0 d-flex flex-column" style={{ height: "600px", border: "1px solid rgba(0,0,0,0.12)" }} id="civic-chatbot-card">
      <div className="card-header bg-dark text-white p-3 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <div className="bg-success bg-opacity-25 p-2 rounded-circle">
            <Bot className="text-success" size={24} />
          </div>
          <div>
            <h5 className="mb-0 fw-bold d-flex align-items-center gap-1 text-white">
              {t("botTitle")} <Sparkles size={16} className="text-warning animate-pulse" />
            </h5>
            <small className="text-success-light fw-bold">● Civic Helper Online</small>
          </div>
        </div>
        <div className="badge bg-secondary fw-bold text-white">
          Role: {user?.role || "Guest"}
        </div>
      </div>

      {/* Messages viewport */}
      <div className="card-body overflow-y-auto bg-light p-4 d-flex flex-column gap-3 flex-grow-1" style={{ minHeight: "0" }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`d-flex gap-2 max-w-75 ${msg.role === "user" ? "align-self-end flex-row-reverse" : "align-self-start"}`}
            style={{ maxWidth: "80%" }}
            id={`chat-bubble-${index}`}
          >
            <div className={`p-2 rounded-circle align-self-start d-flex align-items-center justify-content-center ${msg.role === "user" ? "bg-primary text-white" : "bg-dark text-white"}`} style={{ width: "36px", height: "36px", flexShrink: 0 }}>
              {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
            </div>
            <div className={`p-3 rounded-4 shadow-sm ${msg.role === "user" ? "bg-primary text-white" : "bg-white text-dark border"}`}>
              <div style={{ whiteSpace: "pre-line", fontSize: "0.95rem" }} className="fw-semibold">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="d-flex gap-2 align-self-start" style={{ maxWidth: "80%" }}>
            <div className="p-2 rounded-circle bg-dark text-white d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px" }}>
              <Bot size={18} />
            </div>
            <div className="p-3 rounded-4 bg-white border text-muted d-flex align-items-center gap-2">
              <Loader2 className="animate-spin text-success" size={18} />
              <span className="fw-medium">CivicHero is drafting community guidance...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick starter questions */}
      <div className="px-4 py-2 bg-white border-top border-bottom">
        <small className="text-muted fw-bold d-block mb-1">{t("suggestedQuestions")}:</small>
        <div className="d-flex flex-wrap gap-2">
          {starterPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p.text)}
              className="btn btn-outline-secondary btn-sm rounded-pill py-1 px-3 text-start small d-flex align-items-center gap-1 bg-white text-dark border-secondary-subtle hover:bg-light"
              disabled={loading}
              id={`starter-btn-${i}`}
              style={{ minHeight: "32px" }}
            >
              <MessageSquare size={12} className="text-primary" />
              <span className="fw-bold text-dark">{p.label}</span>
              <ArrowRight size={10} className="ms-1 text-muted" />
            </button>
          ))}
        </div>
      </div>

      {/* Input section */}
      <div className="p-3 bg-white border-top">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="input-group"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("botPlaceholder")}
            className="form-control text-dark bg-white fw-medium border-secondary-subtle"
            disabled={loading}
            id="chat-input-text"
          />
          <button type="submit" className="btn btn-dark d-flex align-items-center gap-2 px-4 text-white" disabled={!input.trim() || loading} id="chat-submit-btn" style={{ minHeight: "42px" }}>
            <Send size={16} />
            <span className="d-none d-sm-inline fw-bold">{t("botSend")}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
