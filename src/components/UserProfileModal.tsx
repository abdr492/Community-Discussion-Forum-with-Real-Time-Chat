import React, { useState } from "react";
import { X, MessageSquare, Clock, Shield, Sparkles, User as UserIcon } from "lucide-react";
import { User } from "../types";

interface UserProfileModalProps {
  userId: string;
  currentUser: User | null;
  onClose: () => void;
  onStartDM: (otherUserId: string) => void;
}

export default function UserProfileModal({
  userId,
  currentUser,
  onClose,
  onStartDM
}: UserProfileModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch target user's details on hover or mount
  React.useEffect(() => {
    let active = true;
    async function fetchUser() {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error("Could not fetch community roster");
        const list: User[] = await res.ok ? await res.json() : [];
        const found = list.find((u) => u.id === userId);
        if (active) {
          if (found) {
            setUser(found);
          } else {
            setError("User not found in roster");
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          setError("Failed to load profile");
          setIsLoading(false);
        }
      }
    }
    fetchUser();
    return () => {
      active = false;
    };
  }, [userId]);

  // Helper to resolve specialty roles and colorful badges
  const getUserBadgesAndBio = (id: string, role: string) => {
    switch (id) {
      case "alice_mod":
        return {
          title: "Hub Administrator",
          badges: ["🛡️ Staff Moderator", "⚖️ Safety Auditor", "📢 Community Lead"],
          bio: "Managing Council Hub policies and standard systems. Ping me for custom workspace permissions or compliance reports."
        };
      case "bob_dev":
        return {
          title: "Vite & React Pioneer",
          badges: ["⚛️ React Core Enthusiast", "⚡ Optimization Guru", "🔧 SSE Sync Pilot"],
          bio: "Frontend engineer building instantaneous WebSockets and Server-Sent Events client systems. Live in the code runtime!"
        };
      case "charlie_fox":
        return {
          title: "Principal Vector Artist",
          badges: ["🎨 Stylist Master", "✨ Figma Wizard", "📐 Micro-grid Designer"],
          bio: "Pixel perfect enthusiast. Standardizing dark design themes and modular card frameworks so the dashboard remains ultra easy on the eyes."
        };
      case "diana_ux":
        return {
          title: "Creative UX Designer",
          badges: ["🎭 Interaction Specialist", "📐 Scale Architect", "🎨 Figma Lead"],
          bio: "Obsessed with spacing, font sizes, and buttery-smooth user transitions. Let's make user experiences immediate and frictionless!"
        };
      case "ethan_rust":
        return {
          title: "Systems Engineer",
          badges: ["🦀 Crustacean (Rust)", "⚙️ WASM Compiler", "📊 Perf Benchmarker"],
          bio: "Writing compile-safe Rust systems, linear memory models, and custom WebAssembly pipelines to keep computational latency close to non-existent."
        };
      case "fiona_ai":
        return {
          title: "Cognitive AI Auditor",
          badges: ["🧠 Model Curator", "🛡️ Bias Evaluator", "✨ Prompt Eng"],
          bio: "Evaluating local sentiment classifiers and Gemini API models. Building failsafe regex-to-AI hybrid fallbacks."
        };
      case "george_stack":
        return {
          title: "Full-Stack Generalist",
          badges: ["🧱 Infrastructure Pilot", "🐕 Canine Companion", "🐳 Containerizer"],
          bio: "Managing backend container distribution and API gateway ingress loops. Off to walk my golden retriever — back shortly!"
        };
      case "hannah_qa":
        return {
          title: "Automation Guardian",
          badges: ["🐛 Bug Hunter", "🚨 Code Coverage", "🛡️ CI Pilot"],
          bio: "Analyzing coverage metrics and filing high-priority bugs before they escape to deployment production."
        };
      default:
        return {
          title: role === "moderator" ? "Moderator" : "Community Colleague",
          badges: ["👋 Verified Member", "💻 Active Contributor"],
          bio: "Valued member of the Council Hub community, taking part in real-time forums and active engineering discussions."
        };
    };
  };

  const statusColors = {
    online: "bg-emerald-500 ring-emerald-500/30",
    idle: "bg-amber-500 ring-amber-500/30",
    offline: "bg-slate-500 ring-slate-500/30"
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="profile-modal-loading">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm text-center">
          <div className="w-12 h-12 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-slate-400">Loading community profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="profile-modal-error">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-slate-300">Profile Error</span>
            <button onClick={onClose} className="p-1 text-slate-500 hover:text-white rounded-md hover:bg-slate-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-red-400 mb-4">{error || "Could not load user profile metadata."}</p>
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 rounded-xl transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isSelf = currentUser?.id === user.id;
  const profileDetails = getUserBadgesAndBio(user.id, user.role);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-fade-in" id={`profile-modal-${user.id}`}>
      <div 
        className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-800/80 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colorful Gradient Header Banner */}
        <div className="h-24 bg-gradient-to-r from-teal-500/20 via-purple-500/10 to-transparent relative border-b border-slate-800/40">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900/60 transition-colors z-10"
            title="Close profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar Area with Status Pips */}
          <div className="flex justify-between items-end -mt-12 mb-4">
            <div className="relative">
              <img 
                src={user.avatarUrl} 
                alt={user.username}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-2xl object-cover bg-slate-800 border-4 border-slate-950 shadow-xl"
              />
              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-slate-950 ${statusColors[user.status] || "bg-slate-500"} flex items-center justify-center shadow-lg ring-4 ${statusColors[user.status] || "bg-slate-500"}`} />
            </div>

            {/* Inline Presence Text */}
            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-900 border border-slate-800/50 ${user.status === 'online' ? 'text-emerald-400' : user.status === 'idle' ? 'text-amber-400' : 'text-slate-400'}`}>
                {user.status}
              </span>
            </div>
          </div>

          {/* User Names & Specialty Title */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">@{user.username}</h3>
              {user.role === "moderator" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider text-red-400 bg-red-950/30 border border-red-900/40 uppercase">
                  <Shield className="w-3 h-3" /> Staff
                </span>
              )}
            </div>
            <p className="text-xs text-teal-400 font-medium mt-0.5">{profileDetails.title}</p>
          </div>

          {/* Custom Code Status Bar */}
          {user.customStatus && (
            <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/40 text-xs text-slate-300 italic flex items-start gap-2.5 shadow-inner">
              <span className="text-teal-400 shrink-0 text-sm select-none">💬</span>
              <p className="leading-relaxed select-all">“{user.customStatus}”</p>
            </div>
          )}

          {/* Profile Short Bio description */}
          <div className="mt-5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Roster Bio</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-sans select-all">{profileDetails.bio}</p>
          </div>

          {/* Badges Collection Grid */}
          <div className="mt-5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Qualifications & Badges</h4>
            <div className="flex flex-wrap gap-1.5">
              {profileDetails.badges.map((badge, key) => (
                <span 
                  key={key} 
                  className="inline-flex items-center text-[11px] font-medium text-slate-200 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800/60 shadow-sm"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* User details last active */}
          <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Last Sync: {user.lastActive ? new Date(user.lastActive).toLocaleTimeString() : "N/A"}</span>
            </div>
          </div>

          {/* Actions Bottom Bar */}
          {!isSelf && (
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  onStartDM(user.id);
                  onClose();
                }}
                className="flex-1 bg-gradient-to-r from-teal-500 to-teal-650 hover:from-teal-450 hover:to-teal-600 active:scale-98 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Message @{user.username}
              </button>
            </div>
          )}
          {isSelf && (
            <div className="mt-6 p-2 rounded-xl bg-teal-950/10 border border-teal-900/25 text-[11px] text-center text-teal-400/90 font-medium">
              ✨ Viewing your own community identity card
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
