import React, { useState } from "react";
import { Shield, Sparkles, UserCheck } from "lucide-react";

interface OnboardingProps {
  onLoginSuccess: (user: any) => void;
}

const PREBUILT_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", // Coral Pink Hat
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", // Minimalist Beanie guy
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", // Golden Curl Girl
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", // Blue shirt guy
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150", // Simple sweater girl
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150"  // Confident grey polo
];

export default function Onboarding({ onLoginSuccess }: OnboardingProps) {
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(PREBUILT_AVATARS[0]);
  const [role, setRole] = useState<"user" | "moderator">("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please choose a handle first");
      return;
    }
    if (username.length < 3) {
      setError("Handle should be at least 3 letters long");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          avatarUrl: selectedAvatar,
          role: role
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login request rejected");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Could not spin up session. Verify server is alive.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-teal-500 selection:text-white" id="onboarding-container">
      <div 
        className="w-full max-w-md bg-slate-800/80 border border-slate-700/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        id="onboarding-card"
      >
        {/* Glow accent */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center mb-8 text-center" id="onboarding-header">
          <div className="w-14 h-14 bg-gradient-to-tr from-teal-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/15 mb-4 animate-pulse">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Join Community Hub
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-[280px]">
            Explore tech forums, chat with members, and test live AI moderation filters.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" id="onboarding-form">
          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Choose your handle
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-medium">@</span>
              <input 
                type="text"
                placeholder="developer_username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                maxLength={18}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-8 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-sans text-sm"
                id="username-input"
                required
              />
            </div>
          </div>

          {/* Profile Avatar Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Choose your avatar
            </label>
            <div className="grid grid-cols-6 gap-2 pt-1" id="avatar-picker-grid">
              {PREBUILT_AVATARS.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedAvatar(url)}
                  className={`relative aspect-square rounded-xl overflow-hidden hover:scale-110 active:scale-95 transition-all outline-none ${
                    selectedAvatar === url 
                      ? "ring-2 ring-teal-400 scale-105" 
                      : "ring-1 ring-slate-700/60 opacity-60 hover:opacity-100"
                  }`}
                  id={`avatar-button-${i}`}
                >
                  <img src={url} alt="User avatar choice" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Role Selection Option */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Sandbox Testing Role
            </label>
            <div className="grid grid-cols-2 gap-3" id="role-selector-grid">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                  role === "user"
                    ? "bg-slate-900 border-teal-500 text-teal-400 font-semibold"
                    : "bg-slate-900/50 border-slate-700/60 text-slate-400 hover:text-white"
                }`}
                id="role-user-button"
              >
                <UserCheck className="w-4 h-4" />
                Standard User
              </button>
              <button
                type="button"
                onClick={() => setRole("moderator")}
                className={`py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                  role === "moderator"
                    ? "bg-slate-900 border-indigo-500 text-indigo-400 font-semibold"
                    : "bg-slate-900/50 border-slate-700/60 text-slate-400 hover:text-white"
                }`}
                id="role-moderator-button"
              >
                <Shield className="w-4 h-4" />
                Moderator (Admin)
              </button>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed pt-1">
              💡 Selecting <strong className="text-indigo-400">Moderator</strong> grants toggles to flag toxic threads, pin posts, or redact comment breaches across the portal.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-400 text-xs text-center" id="error-box">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-teal-500 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50"
            id="login-submit-button"
          >
            {loading ? "Registering Session..." : "Enter Community Portal"}
          </button>
        </form>
      </div>
    </div>
  );
}
