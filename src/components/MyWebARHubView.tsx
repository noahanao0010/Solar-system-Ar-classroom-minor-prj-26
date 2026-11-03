import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useClassroom } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { PlanetId } from '../types/astronomy';
import { soundEffects } from '../utils/soundEffects';
import {
  Globe,
  QrCode,
  Cpu,
  Terminal,
  ExternalLink,
  Plus,
  Copy,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface ArProject {
  id: string;
  name: string;
  type: string;
  targetPlanet?: string;
  embedUrl?: string;
  description: string;
  tags: string[];
}

export const MyWebARHubView: React.FC = () => {
  const { setSelectedPlanetId, setCurrentView } = useClassroom();

  const [activeTab, setActiveTab] = useState<'mcp' | 'qr' | 'embeds'>('mcp');
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetId>('earth');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedMcpUrl, setCopiedMcpUrl] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);

  // MCP Tester state
  const [mcpTool, setMcpTool] = useState<string>('list_ar_projects');
  const [mcpParamPlanet, setMcpParamPlanet] = useState<string>('mars');
  const [mcpResponse, setMcpResponse] = useState<string>('');
  const [isCallingMcp, setIsCallingMcp] = useState<boolean>(false);

  // Embed Projects list
  const [projects, setProjects] = useState<ArProject[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newEmbedUrl, setNewEmbedUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedEmbedProject, setSelectedEmbedProject] = useState<ArProject | null>(null);

  const currentHost = typeof window !== 'undefined' ? window.location.origin : '';
  const mcpEndpointUrl = `${currentHost}/api/mcp`;

  // Generate QR code for chosen planet
  useEffect(() => {
    const launchUrl = `${currentHost}/?view=cameraAR&planet=${selectedPlanet}`;
    QRCode.toDataURL(launchUrl, { width: 320, margin: 2 })
      .then(url => setQrDataUrl(url))
      .catch(() => {});
  }, [selectedPlanet, currentHost]);

  // Fetch registered projects
  useEffect(() => {
    fetch('/api/ar-projects')
      .then(res => res.json())
      .then(data => {
        if (data.projects) {
          setProjects(data.projects);
          const defaultEmbed = data.projects.find((p: ArProject) => p.type === 'mywebar-embed');
          if (defaultEmbed) setSelectedEmbedProject(defaultEmbed);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopyMcpUrl = () => {
    navigator.clipboard.writeText(mcpEndpointUrl);
    setCopiedMcpUrl(true);
    soundEffects.playClick();
    setTimeout(() => setCopiedMcpUrl(false), 2000);
  };

  const claudeConfigSnippet = JSON.stringify(
    {
      mcpServers: {
        'ar-smart-classroom': {
          url: mcpEndpointUrl,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      },
    },
    null,
    2
  );

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(claudeConfigSnippet);
    setCopiedConfig(true);
    soundEffects.playClick();
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  // Test live MCP Tool Call
  const handleTestMcp = async () => {
    setIsCallingMcp(true);
    soundEffects.playClick();

    let args: any = {};
    if (mcpTool === 'get_ar_link' || mcpTool === 'get_planet_facts') {
      args = { planetId: mcpParamPlanet };
    } else if (mcpTool === 'list_ar_projects') {
      args = { filter: 'astronomy' };
    }

    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: mcpTool,
            arguments: args,
          },
        }),
      });

      const data = await res.json();
      setMcpResponse(JSON.stringify(data, null, 2));
      soundEffects.playSuccess();
    } catch (err: any) {
      setMcpResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsCallingMcp(false);
    }
  };

  // Add new MyWebAR embed
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newEmbedUrl.trim()) return;

    soundEffects.playClick();
    try {
      const res = await fetch('/api/ar-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTitle.trim(),
          embedUrl: newEmbedUrl.trim(),
          description: newDesc.trim() || 'Custom MyWebAR classroom module',
        }),
      });
      const data = await res.json();
      if (data.project) {
        setProjects(prev => [...prev, data.project]);
        setSelectedEmbedProject(data.project);
        setNewTitle('');
        setNewEmbedUrl('');
        setNewDesc('');
        soundEffects.playSuccess();
      }
    } catch {}
  };

  return (
    <div className="min-h-full pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pt-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                WebAR & MCP Integration Hub
              </h1>
              <p className="text-xs text-slate-400">
                Bridge AI assistants (Claude / ChatGPT) and MyWebAR projects to your AR Smart Classroom.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('mcp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'mcp'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>MCP Server & API</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'qr'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Mobile QR Generator</span>
          </button>

          <button
            onClick={() => setActiveTab('embeds')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'embeds'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>MyWebAR Embedder</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MCP Server for AI Assistants */}
      {activeTab === 'mcp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Architecture & Explanation */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>How the MCP Bridge Works</span>
              </h2>

              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  <strong>Why isn’t there an official MyWebAR MCP?</strong> MyWebAR (`mywebar.com`) is a visual cloud editor and provides REST APIs and JavaScript embeds, but does not provide a public Model Context Protocol endpoint for LLMs.
                </p>
                <p>
                  <strong>The Built-In Solution:</strong> This web application runs its own official MCP Server right here at <code className="bg-slate-950 px-1.5 py-0.5 rounded text-sky-300 font-mono">/api/mcp</code>. When Claude, ChatGPT, or custom AI agents connect, they can call tools to query Solar System models, generate mobile QR launch links, or register MyWebAR projects!
                </p>
              </div>

              {/* Endpoint Link Box */}
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Live MCP Server Endpoint</span>
                  <button
                    onClick={handleCopyMcpUrl}
                    className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    {copiedMcpUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMcpUrl ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-amber-300 break-all select-all">
                  {mcpEndpointUrl}
                </div>
              </div>

              {/* Available Tools */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Registered MCP Tools
                </h3>
                <div className="space-y-1.5 text-xs">
                  <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
                    <span className="font-mono text-sky-300 font-bold">list_ar_projects</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Returns all active WebXR and MyWebAR projects.</p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
                    <span className="font-mono text-sky-300 font-bold">get_ar_link(planetId)</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Returns direct mobile URL + scannable QR code data URL.</p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
                    <span className="font-mono text-sky-300 font-bold">get_planet_facts(planetId)</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Returns astronomical diameter, gravity, atmosphere, and moons.</p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
                    <span className="font-mono text-sky-300 font-bold">embed_mywebar_project(name, embedUrl)</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Registers a new MyWebAR experience into the classroom.</p>
                  </div>
                </div>
              </div>

              {/* Claude Desktop Config Snippet */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">Claude Desktop Config</span>
                  <button
                    onClick={handleCopyConfig}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    {copiedConfig ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedConfig ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto">
                  {claudeConfigSnippet}
                </pre>
              </div>
            </div>
          </div>

          {/* Right: Live MCP Tool Runner & Inspector */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Interactive MCP Tool Tester</span>
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  JSON-RPC 2.0
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Select Tool to Test:</label>
                  <select
                    value={mcpTool}
                    onChange={e => setMcpTool(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="list_ar_projects">list_ar_projects (List experiences)</option>
                    <option value="get_ar_link">get_ar_link (Generate mobile QR)</option>
                    <option value="get_planet_facts">get_planet_facts (Planetary knowledge)</option>
                  </select>
                </div>

                {(mcpTool === 'get_ar_link' || mcpTool === 'get_planet_facts') && (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Target Planet Argument:</label>
                    <select
                      value={mcpParamPlanet}
                      onChange={e => setMcpParamPlanet(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-sky-500"
                    >
                      {ORDERED_PLANETS.map(id => (
                        <option key={id} value={id}>
                          {PLANETS_DATA[id].name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={handleTestMcp}
                  disabled={isCallingMcp}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCallingMcp ? 'animate-spin' : ''}`} />
                  <span>{isCallingMcp ? 'Executing Tool...' : 'Execute Live MCP Tool Call'}</span>
                </button>
              </div>

              {/* Response output */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-semibold text-slate-400">Live Server Response:</span>
                <pre className="bg-slate-950 border border-slate-800 p-3 rounded-2xl font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-72 overflow-y-auto">
                  {mcpResponse || '// Click "Execute Live MCP Tool Call" above to test the endpoint response.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Mobile AR QR Code Generator */}
      {activeTab === 'qr' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold text-white">Instant Mobile WebAR QR Codes</h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
              Scan this code with an Android phone or iPhone camera to instantly launch that planet into real camera AR in your classroom.
            </p>
          </div>

          {/* Planet Selector Bar */}
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {ORDERED_PLANETS.map(id => {
              const isSelected = selectedPlanet === id;
              const p = PLANETS_DATA[id];
              return (
                <button
                  key={id}
                  onClick={() => {
                    soundEffects.playClick();
                    setSelectedPlanet(id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Rendered QR Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 max-w-sm mx-auto shadow-2xl">
            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="WebAR QR Code" className="w-56 h-56 mx-auto" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <div>
              <div className="text-lg font-extrabold text-white">
                Launch {PLANETS_DATA[selectedPlanet].name} in AR
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target: Android Chrome (WebXR) or any mobile camera passthrough
              </p>
            </div>

            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={() => {
                  setSelectedPlanetId(selectedPlanet);
                  setCurrentView('cameraAR');
                }}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs shadow-md shadow-pink-600/30 transition-all"
              >
                Launch on this Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MyWebAR Embed & Project Manager */}
      {activeTab === 'embeds' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Projects Registry & Add Form */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>WebAR & MyWebAR Projects ({projects.length})</span>
              </h2>

              <div className="space-y-2">
                {projects.map(p => {
                  const isSelected = selectedEmbedProject?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        soundEffects.playClick();
                        setSelectedEmbedProject(p);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-950 border-purple-500 shadow-md'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{p.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-purple-300 font-semibold">
                          {p.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{p.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Project Form */}
              <form onSubmit={handleAddProject} className="pt-4 border-t border-slate-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-purple-400" />
                  <span>Register MyWebAR Experience</span>
                </h3>

                <input
                  type="text"
                  placeholder="Project Title (e.g. Apollo Lunar Module)"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />

                <input
                  type="url"
                  placeholder="MyWebAR link (e.g. https://mywebar.com/p/...)"
                  value={newEmbedUrl}
                  onChange={e => setNewEmbedUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />

                <input
                  type="text"
                  placeholder="Short description"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />

                <button
                  type="submit"
                  disabled={!newTitle.trim() || !newEmbedUrl.trim()}
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold text-xs transition-colors"
                >
                  Save into MCP Registry
                </button>
              </form>
            </div>
          </div>

          {/* Right: Embed Preview Screen */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedEmbedProject ? selectedEmbedProject.name : 'Select a Project to Preview'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live embedded WebAR container
                  </p>
                </div>

                {selectedEmbedProject?.embedUrl && (
                  <a
                    href={selectedEmbedProject.embedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    <span>Open External</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {selectedEmbedProject?.embedUrl ? (
                <div className="relative w-full h-[450px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                  <iframe
                    src={selectedEmbedProject.embedUrl}
                    title={selectedEmbedProject.name}
                    className="w-full h-full border-0"
                    allow="camera; accelerometer; gyroscope; xr-spatial-tracking"
                  />
                </div>
              ) : (
                <div className="w-full h-[320px] rounded-2xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                  <Globe className="w-8 h-8 text-slate-600" />
                  <span>Choose a MyWebAR or WebAR project from the list on the left</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
