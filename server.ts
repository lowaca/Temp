import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Setup JSON parsing with limit
app.use(express.json({ limit: "10mb" }));

// Lazy initializer for GoogleGenAI
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Please add your key in the AI Studio Settings > Secrets panel.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// REST route for chatting to Gemini
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, systemInstruction, searchGrounding } = req.body;

    if (!Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid request: messages must be an array." });
      return;
    }

    // Initialize Gemini SDK lazily
    const ai = getGeminiClient();

    // Map the messages to GenAI contents layout:
    // role: "user" | "model"
    // parts: [{ text: string }]
    const contents = messages.map((msg: { role: string; content: string }) => {
      // Map user/assistant to user/model roles appropriate for Gemini
      const role = msg.role === "assistant" ? "model" : "user";
      return {
        role,
        parts: [{ text: msg.content }],
      };
    });

    const config: any = {};
    
    // Set custom system instructions if defined
    if (systemInstruction && systemInstruction.trim() !== "") {
      config.systemInstruction = systemInstruction.trim();
    }

    // Configure search grounding tool if enabled
    if (searchGrounding) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config,
    });

    const text = response.text || "";
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];

    res.json({
      text,
      groundingChunks,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      error: error?.message || "Internal server error occurred while invoking Gemini API.",
    });
  }
});

// Configure Vite or production serving as middleware
async function setupApp() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting development server with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting production server with static hosting...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

setupApp().catch((err) => {
  console.error("Failed to bootstrap server:", err);
});
