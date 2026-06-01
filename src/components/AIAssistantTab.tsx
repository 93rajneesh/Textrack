/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, MessageSquare, ArrowRight, User, Terminal, Send, Cpu } from 'lucide-react';

interface AIAssistantTabProps {
  currentContextPoId?: string;
}

export default function AIAssistantTab({ currentContextPoId }: AIAssistantTabProps) {
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<Array<{ prompt: string; answer: string }>>([
    {
      prompt: "recommend a knits factory with high capacity and BSCI certifications",
      answer: `### 🤖 Optimal Supplier Recommendation

Based on our verified directory of Indian factories, **Tirupur Prime Knits** is the highest recommended supplier for your query. Here is their breakdown:

*   **Location:** Tirupur, Tamil Nadu (India's premier circular knitting hub)
*   **Daily Capacity:** 25,000 units/day (Highly scalable)
*   **Trust Score:** **94%** (Outstanding delivery & quality history)
*   **Certifications:** BSCI, Oeko-Tex Standard 100, WRAP, SEDEX
*   **Specialization:** Organic single jersey, interlocks, pique, and fleece

#### Alternatively:
If you need active sportswear blends (polyester blends), consider **Ludhiana Active Sportswear** (capacity: 12,000 u/day).

Would you like me to draft an initial RFQ template to **Tirupur Prime Knits** on your behalf?`
    }
  ]);

  const presetQueries = [
    { text: "Find highest trustscore Knits factory", icon: "🧶" },
    { text: "AQL inspection checklist for dresses", icon: "📋" },
    { text: "Draft reply for custom Pantone approvals", icon: "✉️" },
    { text: "Predict delay risks of Mumbai customs cargo", icon: "🚢" }
  ];

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;
    setLoading(true);
    setPromptInput('');

    // Append a temporary conversation bubble
    const newInteraction = { prompt: queryText, answer: '' };
    setQaHistory((prev) => [...prev, newInteraction]);

    try {
      const response = await fetch('/api/gen-ai/sourcing-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          currentContextPoId
        })
      });
      const data = await response.json();
      
      setQaHistory((prev) => {
        const copy = [...prev];
        copy[copy.length - 1].answer = data.answer || "Sorry, I spent too long thinking. Let's try again.";
        return copy;
      });
    } catch (err: any) {
      setQaHistory((prev) => {
        const copy = [...prev];
        copy[copy.length - 1].answer = `⚠️ Sourcing Genius AI experienced a connection error: ${err?.message || 'Server timeout'}. Please verify your network.`;
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="ai-assistant-root">
      {/* Primary Chat Box */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[650px]" id="ai-chat-panel">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500/20 p-1.5 rounded-lg text-blue-400">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                Sourcing Genius AI<sup>™</sup>
              </h3>
              <p className="text-xs text-slate-300">Your B2B Sourcing Copilot & Consultant</p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
            Active v3.5
          </span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6 bg-slate-50/50">
          {qaHistory.map((item, index) => (
            <div key={index} className="space-y-4">
              {/* User Quote */}
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-2xl px-4 py-2.5 max-w-[85%] text-xs shadow-xs">
                  <div className="font-semibold mb-1 text-[10px] uppercase tracking-wider text-blue-200">Buyer Query</div>
                  {item.prompt}
                </div>
              </div>

              {/* Bot Response */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 max-w-[85%] text-xs shadow-xs text-slate-800 space-y-3 prose leading-relaxed">
                  <div className="font-semibold text-slate-900 text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Sourcing Genius AI
                  </div>
                  {item.answer ? (
                    <div className="markup-container whitespace-pre-line text-slate-700 leading-relaxed font-sans">
                      {item.answer}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400 italic">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                      Consulting Indian mills directory and market indexes...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && qaHistory[qaHistory.length - 1]?.answer && (
            <div className="flex gap-2 items-center text-xs text-slate-400 italic">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Generating expert reply...
            </div>
          )}
        </div>

        {/* Query Input Footer */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleQuery(promptInput);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ask me: 'Review stitching defect probability' or 'draft a custom packing list rule'..."
              className="flex-1 bg-slate-50 hover:bg-slate-100/75 focus:bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all placeholder:text-slate-400"
              disabled={loading}
              id="ai-prompt-input-field"
            />
            <button
              type="submit"
              disabled={loading || !promptInput.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3.5 py-2.5 flex items-center justify-center transition-all disabled:opacity-40 disabled:hover:bg-slate-900 cursor-pointer"
              id="ai-submit-prompt-btn"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Sourcing Assist Side Dashboard */}
      <div className="space-y-6">
        {/* Quick Sourcing Prompts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs" id="presets-panel">
          <h4 className="font-semibold text-xs text-slate-900 mb-3 uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Sourcing Prompt Library
          </h4>
          <p className="text-[11px] text-slate-500 mb-4 leading-normal">
            Click on any of our built-in industry expert prompts to immediately query our Gen-AI models.
          </p>
          <div className="space-y-2">
            {presetQueries.map((item, index) => (
              <button
                key={index}
                onClick={() => handleQuery(item.text)}
                disabled={loading}
                className="w-full text-left bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-center justify-between group transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm shrink-0">{item.icon}</span>
                  <span className="font-medium group-hover:text-blue-700 leading-tight block truncate pr-3">{item.text}</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* AI Competency Info Card */}
        <div className="p-5 bg-radial from-slate-900 via-slate-950 to-black text-white rounded-2xl shadow-xs border border-slate-800 space-y-4" id="ai-model-summary">
          <div className="flex items-center gap-2 text-amber-400">
            <Sparkles className="w-4 h-4" />
            <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-slate-300">Model Insights</h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Sourcing Genius AI represents custom trained neural logic utilizing **gemini-3.5-flash**. It reads current floor timelines, shipping delays, and factory certifications to automate supply chain risk.
          </p>
          <div className="border-t border-slate-800 pt-3 space-y-2 font-mono text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-500">API Key:</span>
              <span className="text-slate-300">Configured (Auto-hide)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Retrieval Grounding:</span>
              <span className="text-emerald-400">Indian Sourcing Hubs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Translation Latency:</span>
              <span className="text-violet-400">~120ms (Real-time)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
