import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parser with large limit for images
app.use(express.json({ limit: "20mb" }));

// Initialize Google Gen AI lazily and gracefully
let aiClient: any = null;

function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      console.warn("WARNING: GEMINI_API_KEY is not configured or uses placeholder. Fallback mode active.");
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// 1. AI Image Analysis, Severity Prediction & Issue Categorization Route
app.post("/api/analyze-image", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 parameter" });
    }

    const ai = getAiClient();
    
    if (!ai) {
      // Fallback simulated response when Gemini key is missing
      console.log("Gemini API key missing. Simulating civic image analysis...");
      const categories = ["Pothole & Road Damage", "Garbage & Waste Accumulation", "Water Leakage & Drainage", "Streetlight & Electrical", "Public Safety & Vandalism"];
      const chosenCategory = categories[Math.floor(Math.random() * categories.length)];
      const severities = ["Low", "Medium", "High", "Critical"];
      const chosenSeverity = chosenCategory === "Water Leakage & Drainage" || chosenCategory === "Streetlight & Electrical" ? "High" : severities[Math.floor(Math.random() * 3)];
      
      const responseJson = {
        title: `Reported ${chosenCategory}`,
        category: chosenCategory,
        severity: chosenSeverity,
        description: `This community issue has been identified as a ${chosenCategory.toLowerCase()}. It requires prompt attention to restore public service and ensure citizen safety. Auto-detected via local simulated vision analysis.`,
        suggestedDepartment: chosenCategory === "Pothole & Road Damage" ? "Public Works & Roads" : 
                             chosenCategory === "Garbage & Waste Accumulation" ? "Sanitation & Waste Management" :
                             chosenCategory === "Water Leakage & Drainage" ? "Water & Sewage Board" :
                             chosenCategory === "Streetlight & Electrical" ? "Electricity & Lighting Division" : "Municipal Security Services",
        priorityScore: chosenSeverity === "Critical" ? 95 : chosenSeverity === "High" ? 80 : chosenSeverity === "Medium" ? 55 : 30,
        duplicateProbability: "Low (No similar issues nearby)",
        reasoning: "Image shows structural/environmental public layout irregularity. Analysis indicates localized impairment of public space matching standard service categories."
      };
      
      return res.json(responseJson);
    }

    // Clean base64 data header if present
    let rawBase64 = imageBase64;
    let actualMime = mimeType || "image/jpeg";
    if (imageBase64.includes(";base64,")) {
      const parts = imageBase64.split(";base64,");
      rawBase64 = parts[1];
      const mimeMatch = parts[0].match(/data:(.*)/);
      if (mimeMatch) {
        actualMime = mimeMatch[1];
      }
    }

    const prompt = `
      You are Community Hero AI, a vision system for civic management.
      Analyze this community complaint image. Identify the type of issue (pothole, garbage, leak, broken light, etc.), its category, and estimate its severity.
      Return EXACTLY a JSON object with this schema. Do not include markdown codeblocks or any commentary outside the JSON:
      {
        "title": "Short descriptive title of the issue",
        "category": "One of: Pothole & Road Damage, Garbage & Waste Accumulation, Water Leakage & Drainage, Streetlight & Electrical, Public Safety & Vandalism, or Public Infrastructure",
        "severity": "One of: Low, Medium, High, Critical",
        "description": "A professionally drafted 2-3 sentence complaint description for municipal authorities based on the image evidence",
        "suggestedDepartment": "Recommended municipal department (e.g. Roads, Sanitation, Water Board, Electrical Division)",
        "priorityScore": "A number between 1 and 100 indicating emergency level",
        "duplicateProbability": "Low, Medium, or High",
        "reasoning": "1 sentence explain why you chose this severity and priority level"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        prompt,
        {
          inlineData: {
            data: rawBase64,
            mimeType: actualMime
          }
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text || "{}";
    const cleanedText = resultText.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const parsed = JSON.parse(cleanedText);
    return res.json(parsed);

  } catch (error: any) {
    console.error("AI Image Analysis Error:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze image with Gemini AI" });
  }
});

// 2. Civic AI Chatbot Assistant Route
app.post("/api/chatbot", async (req, res) => {
  try {
    const { messages, userRole, userPoints } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing or invalid messages parameter" });
    }

    const ai = getAiClient();
    
    if (!ai) {
      // Chatbot mock response if Gemini is missing
      const lastMsg = messages[messages.length - 1]?.content || "";
      let reply = "Hello! I am your Community Hero Civic Assistant. I can help you report issues, explain municipal departments, track points, and show you how to earn badges. How can I assist you with community improvements today?";
      
      const lower = lastMsg.toLowerCase();
      if (lower.includes("badge") || lower.includes("point")) {
        reply = "In **Community Hero**, you earn **10 points** for every reported complaint, **5 points** for each upvote/verification, and **20 points** for verified resolutions! Earn badges like **Spotter Hero**, **Civic Guardian**, and **Validator Expert** by actively helping your neighborhood.";
      } else if (lower.includes("pothole") || lower.includes("garbage") || lower.includes("report")) {
        reply = "To report an issue, go to the **Report Issue** section in your dashboard. You can upload an image, and our **Community Hero AI** will auto-detect the issue type, predict severity, fill in the report details, and assign the appropriate department! You can also share your GPS coordinates.";
      } else if (lower.includes("volunteer") || lower.includes("verify")) {
        reply = "Volunteers play a critical role by inspecting reported issues in person. They can vote on whether the issue is genuine or a duplicate, add comment threads, and post picture evidence of resolutions. This helps municipal workers prioritize work!";
      }

      return res.json({ response: reply });
    }

    // Map messages format to Gemini contents parameter
    const formattedContents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: `You are CivicHero, the friendly and knowledgeable AI Assistant for the 'Community Hero' Hyperlocal Civic Platform. 
        The current user has the role of "${userRole || 'Citizen'}" and has ${userPoints || 0} community points.
        Keep answers helpful, proactive, and concise. Advise them on how to report issues, earn points/badges (Spotter, Civic Guardian, Resolver), use the map, volunteer verification duties, or how the municipal departments resolve issues.
        Use clean Markdown for formatting.`
      }
    });

    return res.json({ response: response.text });

  } catch (error: any) {
    console.error("AI Chatbot Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process chat with Gemini AI" });
  }
});

// 3. AI Priority recommendations & duplicate checks (for Admin / Volunteers)
app.post("/api/priority-recommendations", async (req, res) => {
  try {
    const { complaints } = req.body;
    
    if (!complaints || !Array.isArray(complaints)) {
      return res.status(400).json({ error: "Missing complaints parameter" });
    }

    if (complaints.length === 0) {
      return res.json({ recommendations: [] });
    }

    const ai = getAiClient();
    
    if (!ai) {
      // Dynamic fallback for recommendations
      const recommendations = complaints.map(c => {
        let score = c.severity === "Critical" ? 95 : c.severity === "High" ? 75 : c.severity === "Medium" ? 45 : 20;
        if (c.upvotesCount > 5) score += 5;
        return {
          id: c.id,
          title: c.title,
          suggestedPriority: score > 80 ? "Critical" : score > 60 ? "High" : score > 35 ? "Medium" : "Low",
          priorityScore: Math.min(100, score),
          actionStep: `Assign immediately to ${c.departmentAssigned || "Public Works"} with dispatch code COMM-${c.id.substring(0,4).toUpperCase()}.`,
          duplicateDetected: false
        };
      });
      return res.json({ recommendations });
    }

    const complaintSummaries = complaints.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      severity: c.severity,
      upvotesCount: c.upvotesCount || 0,
      commentsCount: c.commentsCount || 0,
      departmentAssigned: c.departmentAssigned || "Unassigned"
    }));

    const prompt = `
      You are an elite City Operations AI Analyst.
      Examine the following list of active civic complaints and compute an optimized dispatch schedule.
      Identify potential duplicates (issues with highly similar titles and descriptions) and prioritize complaints based on threat to public safety, severity, citizen demand (upvotes), and category.
      
      Complaints List:
      ${JSON.stringify(complaintSummaries, null, 2)}

      Return EXACTLY a JSON array of recommendations matching this format:
      [
        {
          "id": "complaint-id",
          "title": "complaint title",
          "suggestedPriority": "Low / Medium / High / Critical",
          "priorityScore": 85, // number 1-100
          "actionStep": "Specific dispatch/mitigation action step",
          "duplicateDetected": true/false
        }
      ]
      Do not include markdown codeblocks or any surrounding commentary. Only return valid JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text || "[]";
    const cleanedText = resultText.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const parsed = JSON.parse(cleanedText);
    return res.json({ recommendations: parsed });

  } catch (error: any) {
    console.error("AI Priority Recommendations Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate priority recommendations" });
  }
});

// Configure Vite middleware or production build output
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Community Hero Server booted successfully and listening on http://localhost:${PORT}`);
  });
}

startServer();
