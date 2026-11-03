import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import QRCode from 'qrcode';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// In-memory registry of AR projects and MyWebAR embeds
interface ArProject {
  id: string;
  name: string;
  type: 'native-threejs' | 'mywebar-embed' | 'webxr-hit-test';
  targetPlanet?: string;
  embedUrl?: string;
  qrCodeUrl?: string;
  description: string;
  tags: string[];
}

const AR_PROJECTS_REGISTRY: ArProject[] = [
  {
    id: 'proj-solar-system',
    name: 'Interactive Solar System AR',
    type: 'native-threejs',
    description: 'Animated 3D planetary orbits and surface tracking.',
    tags: ['astronomy', 'webxr', 'solar-system'],
  },
  {
    id: 'proj-earth-ar',
    name: 'Earth 3D & Internal Core Dissector',
    type: 'webxr-hit-test',
    targetPlanet: 'earth',
    description: 'Earth surface topography, atmosphere, and cutaway core in AR.',
    tags: ['earth', 'atmosphere', 'geology'],
  },
  {
    id: 'proj-mars-ar',
    name: 'Mars Red Planet Rover Landing Site',
    type: 'webxr-hit-test',
    targetPlanet: 'mars',
    description: 'Olympus Mons, Valles Marineris canyon, and iron oxide terrain in AR.',
    tags: ['mars', 'space-exploration'],
  },
  {
    id: 'proj-saturn-ar',
    name: 'Saturn & Ice Ring Dynamics',
    type: 'webxr-hit-test',
    targetPlanet: 'saturn',
    description: 'Realistic concentric ice ring system with axial tilt in AR.',
    tags: ['saturn', 'rings', 'gas-giant'],
  },
  {
    id: 'proj-mywebar-sample',
    name: 'MyWebAR Space Exploration Portal',
    type: 'mywebar-embed',
    embedUrl: 'https://mywebar.com/p/project/demo-space',
    description: 'External MyWebAR experience embedded directly in the classroom.',
    tags: ['mywebar', 'embed', 'interactive'],
  },
];

// Planetary scientific database for MCP queries
const PLANET_KNOWLEDGE: Record<string, any> = {
  earth: {
    diameterKm: 12742,
    gravity: '9.81 m/s²',
    temperature: '15°C',
    moons: ['The Moon (Luna)'],
    highlights: 'Only known astronomical object harboring liquid oceans and life.',
  },
  mars: {
    diameterKm: 6779,
    gravity: '3.72 m/s²',
    temperature: '-62°C',
    moons: ['Phobos', 'Deimos'],
    highlights: 'Home to Olympus Mons (highest volcano) and Valles Marineris canyon.',
  },
  venus: {
    diameterKm: 12104,
    gravity: '8.87 m/s²',
    temperature: '464°C',
    moons: [],
    highlights: 'Hottest planet in the Solar System due to runaway greenhouse effect.',
  },
  jupiter: {
    diameterKm: 139820,
    gravity: '24.79 m/s²',
    temperature: '-110°C',
    moons: ['Ganymede', 'Europa', 'Io', 'Callisto', '91 others'],
    highlights: 'Largest planet with the Great Red Spot storm raging over 300 years.',
  },
  saturn: {
    diameterKm: 116460,
    gravity: '10.44 m/s²',
    temperature: '-140°C',
    moons: ['Titan', 'Enceladus', '144 others'],
    highlights: 'Glorious ice ring system spanning 282,000 km, density less than liquid water.',
  },
};

// ----------------------------------------------------
// 1. Model Context Protocol (MCP) Endpoints
// Standard JSON-RPC 2.0 interface for AI assistants
// ----------------------------------------------------

const MCP_TOOLS = [
  {
    name: 'list_ar_projects',
    description: 'List all available AR planetary experiences, WebXR simulations, and embedded MyWebAR projects in the classroom.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Optional filter tag (e.g. "mywebar", "astronomy", "rings")',
        },
      },
    },
  },
  {
    name: 'get_ar_link',
    description: 'Generate a direct mobile-friendly launch URL and scannable QR code for any AR planet experience.',
    inputSchema: {
      type: 'object',
      properties: {
        planetId: {
          type: 'string',
          enum: ['earth', 'mars', 'venus', 'jupiter', 'saturn', 'uranus', 'neptune', 'mercury', 'sun'],
          description: 'The target planet ID to experience in AR.',
        },
      },
      required: ['planetId'],
    },
  },
  {
    name: 'get_planet_facts',
    description: 'Retrieve physical and astronomical facts for a given planet.',
    inputSchema: {
      type: 'object',
      properties: {
        planetId: {
          type: 'string',
          description: 'The planet identifier (e.g. earth, mars, jupiter).',
        },
      },
      required: ['planetId'],
    },
  },
  {
    name: 'embed_mywebar_project',
    description: 'Register and embed a new MyWebAR or external WebAR experience into the AR Smart Classroom.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Title of the MyWebAR project' },
        embedUrl: { type: 'string', description: 'The MyWebAR project link or embed URL (e.g. https://mywebar.com/p/...)' },
        description: { type: 'string', description: 'Brief description of the experience' },
      },
      required: ['name', 'embedUrl'],
    },
  },
];

// MCP Discovery Manifest
app.get(['/api/mcp/manifest', '/.well-known/mcp.json'], (_req: Request, res: Response) => {
  res.json({
    schema_version: 'v1',
    name_for_model: 'ar_smart_classroom_mcp',
    name_for_human: 'AR Smart Classroom MCP Server',
    description_for_model:
      'Provides tools to list WebAR and MyWebAR projects, generate mobile QR launch codes, and query planetary astronomy models.',
    description_for_human: 'AI integration tools for AR Smart Classroom and MyWebAR experiences.',
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
    },
    tools: MCP_TOOLS,
  });
});

// MCP JSON-RPC 2.0 Handler
app.post(['/api/mcp', '/mcp'], async (req: Request, res: Response) => {
  const { jsonrpc, id, method, params } = req.body || {};

  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32600, message: 'Invalid Request: jsonrpc must be 2.0' },
    });
  }

  // 1. Initialize
  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: 'ar-smart-classroom-mcp',
          version: '1.0.0',
        },
        capabilities: {
          tools: {},
        },
      },
    });
  }

  // 2. Tools List
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: MCP_TOOLS,
      },
    });
  }

  // 3. Tools Call
  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};

    try {
      if (name === 'list_ar_projects') {
        const filter = args?.filter?.toLowerCase();
        const results = filter
          ? AR_PROJECTS_REGISTRY.filter(p => p.tags.some(t => t.includes(filter)) || p.name.toLowerCase().includes(filter))
          : AR_PROJECTS_REGISTRY;

        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ count: results.length, projects: results }, null, 2),
              },
            ],
          },
        });
      }

      if (name === 'get_ar_link') {
        const planetId = args?.planetId || 'earth';
        const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
        const launchUrl = `${baseUrl}/?view=cameraAR&planet=${planetId}`;
        const qrDataUrl = await QRCode.toDataURL(launchUrl, { width: 256, margin: 2 });

        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    planetId,
                    launchUrl,
                    qrCodeDataUrl: qrDataUrl,
                    instructions: 'Scan this QR code with mobile camera to launch the WebAR planet immediately.',
                  },
                  null,
                  2
                ),
              },
            ],
          },
        });
      }

      if (name === 'get_planet_facts') {
        const planetId = (args?.planetId || 'earth').toLowerCase();
        const facts = PLANET_KNOWLEDGE[planetId] || { message: 'Planet not in summary index; see 3D Solar Model.' };

        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(facts, null, 2) }],
          },
        });
      }

      if (name === 'embed_mywebar_project') {
        const { name: pName, embedUrl, description } = args || {};
        if (!pName || !embedUrl) {
          throw new Error('name and embedUrl are required');
        }

        const newProject: ArProject = {
          id: `proj-custom-${Date.now()}`,
          name: pName,
          type: 'mywebar-embed',
          embedUrl,
          description: description || 'Embedded WebAR experience',
          tags: ['custom', 'mywebar'],
        };

        AR_PROJECTS_REGISTRY.push(newProject);

        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, message: 'MyWebAR project registered successfully.', project: newProject }, null, 2),
              },
            ],
          },
        });
      }

      return res.status(404).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Tool not found: ${name}` },
      });
    } catch (err: any) {
      return res.status(500).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: err.message || 'Internal error' },
      });
    }
  }

  return res.status(404).json({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
});

// ----------------------------------------------------
// 2. REST API Endpoints for Frontend Hub
// ----------------------------------------------------

// List all AR & MyWebAR projects
app.get('/api/ar-projects', (_req: Request, res: Response) => {
  res.json({ projects: AR_PROJECTS_REGISTRY });
});

// Add new custom MyWebAR embed
app.post('/api/ar-projects', (req: Request, res: Response) => {
  const { name, embedUrl, description, targetPlanet } = req.body;
  if (!name || !embedUrl) {
    return res.status(400).json({ error: 'name and embedUrl are required.' });
  }

  const newProject: ArProject = {
    id: `proj-custom-${Date.now()}`,
    name,
    type: 'mywebar-embed',
    embedUrl,
    targetPlanet,
    description: description || 'Custom MyWebAR classroom module',
    tags: ['mywebar', 'custom'],
  };

  AR_PROJECTS_REGISTRY.push(newProject);
  res.json({ success: true, project: newProject });
});

// Dynamic QR Code Generator endpoint
app.get('/api/qr', async (req: Request, res: Response) => {
  const text = (req.query.text as string) || (process.env.APP_URL || `http://localhost:${PORT}`);
  try {
    const dataUrl = await QRCode.toDataURL(text, { width: 320, margin: 2 });
    res.json({ text, dataUrl });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate QR code', message: err.message });
  }
});

// ----------------------------------------------------
// 3. Vite Middleware (Dev) or Static Serve (Prod)
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
    console.log(`MCP Endpoint available at POST http://0.0.0.0:${PORT}/api/mcp`);
  });
}

startServer();
