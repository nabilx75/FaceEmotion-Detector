import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// High limits for base64 camera images
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Express POST predict route matching front-end fetch
app.post("/api/predict.php", async (req, res) => {
  const { image } = req.body;
  
  if (!image) {
    return res.status(400).json({ error: "Missing 'image' base64 payload." });
  }

  // Parse the MIME type and raw base64 data to keep things super tidy
  let base64Data = image;
  let mimeType = "image/jpeg";
  if (image.startsWith("data:")) {
    const parts = image.split(";base64,");
    mimeType = parts[0].split(":")[1];
    base64Data = parts[1];
  }

  // 1. Try local Python Flask backend proxy first
  try {
    const flaskRes = await fetch("http://localhost:5000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ image: base64Data })
    });

    if (flaskRes.ok) {
      const data = await flaskRes.json();
      console.log("Flask model prediction successful!");
      return res.json(data);
    } else {
      console.warn(`Flask server returned status: ${flaskRes.status}. Falling back to Gemini...`);
    }
  } catch (err) {
    console.log("Flask backend not running on http://localhost:5000. Using server-side Gemini API...");
  }

  // 2. Fallback to Gemini Pro/Flash via GoogleGenAI SDK
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    return res.status(503).json({
      error: "Service unavailable",
      message: "The PyTorch Python backend is not running, and no Gemini API Key is configured in Server Secrets. Please start the local Python Flask app or configure your API Key in Settings > Secrets."
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    const systemInstruction = `You are MoodLens, a real-time emotion detection AI engine.
Analyze the provided face image and predict the scores for each of these 7 emotions: angry, disgust, fear, happy, neutral, sad, surprise.
Assign probability scores between 0.0 and 1.0 such that they sum to approximately 1.0.
Identify the primary emotion class with the highest score and set it as "emotion" (all-lowercase), with its score as the "confidence" value.
You MUST output a single, raw, valid JSON object matching the exact structure below, with nothing else in the response:
{
  "emotion": "happy",
  "confidence": 0.94,
  "scores": {
    "angry": 0.01,
    "disgust": 0.005,
    "fear": 0.01,
    "happy": 0.94,
    "neutral": 0.005,
    "sad": 0.02,
    "surprise": 0.01
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        "Classify the emotion shown in this facial portrait."
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const bodyText = response.text?.trim() || "";
    const parsedData = JSON.parse(bodyText);
    return res.json(parsedData);

  } catch (err) {
    console.error("Gemini API inference failed:", err);
    return res.status(500).json({
      error: "Inference failed",
      message: err.message || "An unexpected error occurred during AI analysis."
    });
  }
});

// Configure Vite or Serve static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MoodLens server boot active on: http://localhost:${PORT}`);
  });
}

startServer();
