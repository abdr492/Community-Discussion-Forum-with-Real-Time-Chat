import React, { useState } from "react";
import { Sparkles, ShieldCheck, ShieldAlert, Cpu, Check, AlertCircle } from "lucide-react";

export default function ModeratorLab() {
  const [testText, setTestText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTestCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testText.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/moderation/ai-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testText.trim() })
      });

      if (!res.ok) throw new Error("Moderation request rejected");
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        error: true,
        reason: err.message || "Failed to contact moderator endpoint"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-900 border-l border-slate-800 p-6 md:p-8 overflow-y-auto" id="moderator-lab-workspace">
      
      {/* Intro Header */}
      <div className="max-w-2xl mx-auto space-y-2 mb-8" id="modlab-header">
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 font-mono flex items-center gap-1">
          <Cpu className="w-4 h-4 text-indigo-400" />
          AI Developer Laboratory
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
          Lightweight Compliance & Moderation Sandbox
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Test and analyze how our server's filters process phrases. Try typing normal greetings, tech discussion notes, or testing prohibited keywords to discover the instant detection rules.
        </p>
      </div>

      <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-1 gap-6" id="modlab-grid">
        
        {/* Sandbox Form */}
        <div className="bg-slate-850/80 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Write test phrases
          </h3>

          <form onSubmit={handleTestCheck} className="space-y-4">
            <div>
              <textarea
                placeholder="Type anything... (e.g., 'Hello! I love coding in React 19' or testing restricted profanity phrases)"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                rows={4}
                maxLength={800}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl py-3 px-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 font-sans"
                required
              />
            </div>

            <div className="flex flex-wrap gap-2 text-slate-500 text-[11px] leading-relaxed select-none">
              <span>💡 Presets:</span>
              <button 
                type="button" 
                onClick={() => setTestText("This React framework code with esbuild is absolutely fantastic!")}
                className="text-teal-400 hover:underline cursor-pointer"
              >
                Safe comment
              </button>
              <span>•</span>
              <button 
                type="button" 
                onClick={() => setTestText("Stop writing code, you are a complete bastard! k i l l y o u r s e l f.")}
                className="text-red-400 hover:underline cursor-pointer"
              >
                Violating comment
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 px-6 rounded-xl cursor-pointer shadow transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "querying compliance model..." : "Analyze Phrase with AI Model"}
            </button>
          </form>
        </div>

        {/* Real-time Response Analysis Panel */}
        {result && (
          <div className="bg-slate-850/40 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4 animate-fade-in" id="modlab-results-panel">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4.5 h-4.5 text-teal-400" />
              Analysis Metrics
            </h3>

            {result.error ? (
              <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl text-red-400 text-xs">
                Error running check: {result.reason}
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Result Status Banner */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  result.isToxic 
                    ? "bg-red-950/30 border-red-500/40 text-red-200" 
                    : "bg-teal-950/30 border-teal-500/40 text-teal-200"
                }`}>
                  <div className="mt-0.5">
                    {result.isToxic ? (
                      <ShieldAlert className="w-5 h-5 text-red-400" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-teal-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      {result.isToxic ? "Compliance Violation Detected" : "Content Approved"}
                    </h4>
                    <p className="text-[11px] opacity-80 mt-1 leading-relaxed">
                      {result.reason}
                    </p>
                  </div>
                </div>

                {/* API configuration state */}
                <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-2xl space-y-3 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-1.5">
                    <span>Engine Capability</span>
                    <span className="text-slate-300 font-semibold uppercase">
                      {result.geminiActive ? "Gemini-3.5-Flash Active (Full AI)" : "Local Ruleset Filter (Fallback API)"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-slate-400 pb-1.5">
                    <span>Evaluated phrase</span>
                    <span className="text-slate-200 truncate max-w-xs block italic">
                      "{result.text}"
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400">
                    <span>Is Toxic flag</span>
                    <span className={`font-semibold ${result.isToxic ? "text-red-400" : "text-teal-400"}`}>
                      {result.isToxic ? "TRUE (Redacted / Hidden)" : "FALSE (Visible to standard users)"}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-2xl text-[11px] text-slate-400/80 leading-relaxed">
                  📢 <strong>Developer tip:</strong> If the model is shown as Local Ruleset/Offline, populate your Gemini API secrets inside the <strong>Settings &gt; Secrets</strong> pane in the AI Studio editor to instantaneously engage live multi-factor LLM sentiment checks!
                </div>

              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
