import { useState } from 'react';
import { Bot, Boxes, CheckCircle2, FolderOpen, Gamepad2, Github, ShieldCheck, Sparkles, Wrench } from 'lucide-react';

declare global {
  interface Window {
    robloxAI: { generateProject: (name: string) => Promise<{ ok: boolean; path?: string; files?: number; error?: string }> };
  }
}

export default function App() {
  const [projectName, setProjectName] = useState('Starter Meadow');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [createdPath, setCreatedPath] = useState('');

  async function generate() {
    setBusy(true); setMessage(''); setCreatedPath('');
    try {
      const result = await window.robloxAI.generateProject(projectName);
      if (result.ok) {
        setCreatedPath(result.path || '');
        setMessage('Created ' + (result.files || 0) + ' starter files. Read IMPORT-INSTRUCTIONS.md before using Studio.');
      } else setMessage(result.error || 'Project generation failed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unexpected error.'); }
    finally { setBusy(false); }
  }

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Bot size={23}/></div><div><strong>RobloxAI</strong><span>GAME BUILDER</span></div></div>
      <div className="nav-label">WORKSPACE</div>
      <div className="nav-item active"><Boxes size={17}/> Project generator</div>
      <div className="nav-item muted"><Wrench size={17}/> Studio bridge <small>PLANNED</small></div>
      <div className="nav-item muted"><ShieldCheck size={17}/> Test & repair <small>PLANNED</small></div>
      <div className="sidebar-bottom"><i/> Local desktop MVP <span>v0.1.0</span></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><span>Workspace /</span> Project generator</div><a href="https://github.com/mirfayzfarxodov1-png/RobloxAI-Agent" target="_blank" rel="noreferrer"><Github size={16}/> GitHub repo</a></header>
      <div className="hero">
        <div className="eyebrow"><Sparkles size={14}/> ROBLOX DEVELOPMENT AGENT</div>
        <h1>From idea to<br/><em>playable foundation.</em></h1>
        <p>Generate a clean Roblox project structure with server-side Luau scripts, a starter interface, and import instructions. Studio automation comes in a later milestone.</p>
        <div className="hero-tags"><span><CheckCircle2 size={14}/> Local file generation</span><span><CheckCircle2 size={14}/> Server-authoritative starter</span><span><CheckCircle2 size={14}/> No overwrite by default</span></div>
      </div>
      <div className="workspace-grid">
        <section className="panel">
          <div className="panel-heading"><div className="panel-icon"><Gamepad2 size={18}/></div><div><h2>Create a Roblox project</h2><p>Configure your first starter project</p></div><span className="step">01 / 03</span></div>
          <label htmlFor="project-name">PROJECT FOLDER NAME</label>
          <input id="project-name" value={projectName} onChange={e => setProjectName(e.target.value)} maxLength={50} placeholder="My Roblox Game"/>
          <div className="scope-card"><div className="scope-top"><span>STARTER TEMPLATE</span><span className="scope-badge">MVP</span></div><h3>Starter Meadow</h3><p>A small pet-collection foundation focused on the core loop.</p><div className="feature-list"><span><CheckCircle2 size={15}/> Coins & egg opening</span><span><CheckCircle2 size={15}/> Pet inventory data</span><span><CheckCircle2 size={15}/> Basic on-screen UI</span><span><CheckCircle2 size={15}/> DataStore starter</span></div></div>
          <button className="primary" onClick={generate} disabled={busy || !projectName.trim()}>{busy ? 'Creating project...' : <><FolderOpen size={17}/> Choose folder & generate</>}</button>
          {message && <div className={createdPath ? 'result success' : 'result error'}>{createdPath ? <CheckCircle2 size={17}/> : <ShieldCheck size={17}/>}<div>{message}{createdPath && <code>{createdPath}</code>}</div></div>}
        </section>
        <section className="panel">
          <div className="panel-heading"><div className="panel-icon purple"><Sparkles size={18}/></div><div><h2>Agent pipeline</h2><p>What is available in this version</p></div></div>
          <div className="pipeline">
            <div className="pipeline-row"><div className="pipeline-number done"><CheckCircle2 size={16}/></div><div><strong>Project scaffolding</strong><p>Create files and import notes locally</p></div><span className="pill ready">READY</span></div>
            <div className="pipeline-row"><div className="pipeline-number"><Bot size={16}/></div><div><strong>AI planning & code generation</strong><p>Connect an AI provider securely</p></div><span className="pill planned">NEXT</span></div>
            <div className="pipeline-row"><div className="pipeline-number"><Wrench size={16}/></div><div><strong>Roblox Studio bridge</strong><p>Send scripts and collect Studio logs</p></div><span className="pill planned">NEXT</span></div>
            <div className="pipeline-row"><div className="pipeline-number"><ShieldCheck size={16}/></div><div><strong>Automated test & repair</strong><p>Run checks, inspect failures, retry safely</p></div><span className="pill planned">NEXT</span></div>
          </div>
          <div className="notice"><ShieldCheck size={18}/><div><strong>Safe by default</strong><p>The app writes only into a folder you select and refuses to replace an existing project folder.</p></div></div>
        </section>
      </div>
      <footer>RobloxAI Agent <span>Built for iterative, testable Roblox development</span></footer>
    </section>
  </main>;
}
