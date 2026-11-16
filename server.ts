import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Dynamic QR Code Generator endpoint for mobile AR launch
app.get('/api/qr', async (req: Request, res: Response) => {
  const text = (req.query.text as string) || (process.env.APP_URL || `http://localhost:${PORT}`);
  try {
    const dataUrl = await QRCode.toDataURL(text, { width: 320, margin: 2 });
    res.json({ text, dataUrl });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate QR code', message: err.message });
  }
});

// Teacher Visual Animated Presentation Architect Agent (Server-side @google/genai)
app.post('/api/teacher/presentation-agent', async (req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.',
      code: 'MISSING_API_KEY',
    });
    return;
  }

  const { message, history = [], currentSlide, allSlideTitles = [], slideIndex = 0 } = req.body || {};
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'A message string is required.' });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are an Agentic Astronomy Presentation Architect for the AR Smart Classroom app.
Your job is to collaborate with teachers to design visual, animated 3D Solar System & Camera AR lessons.
Valid targetPlanet values: "all", "sun", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "iss", "hubble", "jwst", "sputnik", "saturn-v", "starship", "sls", "apollo-lander", "voyager", "mars-rover", "space-shuttle", "milky-way", "andromeda", "triangulum", "sombrero", "whirlpool", "cartwheel", "cigar", "large-magellanic-cloud", "cosmic-web", "observable-universe".
Valid theme values (3D camera flyby animations): "solar-corona", "terrestrial-survey", "asteroid-canyon", "gas-ring-sweep", "ice-frontier", "spacecraft-fleet", "deep-cosmos".
Valid material kinds: "3d-asset", "ar-lab", "compare", "quiz", "worksheet".
Valid targetView values: "solarSystem", "cameraAR", "explorer", "compare", "quiz", "missions".
Valid customImportant severity values: "critical", "exam-focus", "lab-note".

Strict formatting rules:
- NEVER include emojis anywhere in titles, headings, talkingPoints, or other fields. Use crisp academic plain text.
- Keep proposedSlide.title concise (4 to 9 words, under 65 characters).
- Always return valid JSON matching the schema:
  - assistantMessage: concise, insightful 2-3 sentence explanation of your visual animation and teaching plan.
  - suggestions: 2 to 3 concrete visual animation concepts tailored to the teacher's topic, describing camera movement, visual effects (corona dive, ring grazing sweep, AR gravity drop, terminator shadow rotation, etc.), and student AR activity.
  - proposedSlide: whenever the teacher asks to create, draft, update, animate, or suggest a lesson/slide, set includeProposedSlide to true and populate ALL key fields (concise title, subheading, targetPlanet, theme, 3-4 talkingPoints, engaging promptQuestion, didYouKnow, spoken narrationScript, 1-2 prerequisites, 1-2 interactive materials, and customImportant fields).`;

    const trimmedHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .map((h: any) => `${h.role === 'user' ? 'Teacher' : 'Agent'}: ${String(h.content || '').slice(0, 500)}`)
          .join('\n')
      : '';

    const promptContext = `Deck Slides (${allSlideTitles.length} total): ${JSON.stringify(allSlideTitles)}
Active Slide #${Number(slideIndex) + 1}: ${JSON.stringify(currentSlide || {})}
${trimmedHistory ? `\nRecent Conversation:\n${trimmedHistory}` : ''}
\nTeacher Request: ${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptContext,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assistantMessage: {
              type: Type.STRING,
              description: 'Helpful response explaining the recommended visual animation & teaching approach.',
            },
            includeProposedSlide: {
              type: Type.BOOLEAN,
              description: 'True when proposing a full ready-to-apply lesson slide.',
            },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  animationType: { type: Type.STRING, description: 'Short label e.g. Ring Grazing Flyby, AR Gravity Drop, Core Cutaway' },
                  cameraChoreography: { type: Type.STRING, description: 'How the 3D camera & scene animate visually' },
                  theme: { type: Type.STRING },
                  targetPlanet: { type: Type.STRING },
                  arActivityIdea: { type: Type.STRING, description: 'Hands-on AR camera or 3D lab activity for students' },
                },
                required: ['title', 'animationType', 'cameraChoreography', 'theme', 'targetPlanet', 'arActivityIdea'],
              },
            },
            proposedSlide: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subheading: { type: Type.STRING },
                targetPlanet: { type: Type.STRING },
                theme: { type: Type.STRING },
                talkingPoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                promptQuestion: { type: Type.STRING },
                didYouKnow: { type: Type.STRING },
                narrationScript: { type: Type.STRING },
                prerequisites: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                customImportantHeading: { type: Type.STRING },
                customImportantContent: { type: Type.STRING },
                customImportantSeverity: { type: Type.STRING },
                materials: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      kind: { type: Type.STRING },
                      targetView: { type: Type.STRING },
                      targetAssetId: { type: Type.STRING },
                      note: { type: Type.STRING },
                    },
                    required: ['title', 'kind', 'targetView'],
                  },
                },
              },
              required: [
                'title',
                'subheading',
                'targetPlanet',
                'theme',
                'talkingPoints',
                'promptQuestion',
                'didYouKnow',
              ],
            },
          },
          required: ['assistantMessage', 'includeProposedSlide', 'suggestions'],
        },
      },
    });

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (err: any) {
    const statusCode = typeof err?.status === 'number' ? err.status : 500;
    res.status(statusCode).json({
      error: err?.message || 'Failed to run Gemini presentation architect agent.',
      code: err?.code || 'GEMINI_AGENT_ERROR',
    });
  }
});

// ----------------------------------------------------
// Vite Middleware (Dev) or Static Serve (Prod)
// ----------------------------------------------------

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AR Smart Classroom running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
