import React, { useState, useEffect } from "react";
import { 
  MessageSquare, Radio, Users, Sparkles, Bell, 
  LogOut, ShieldAlert, Cpu, Settings, ChevronRight, X 
} from "lucide-react";

import Onboarding from "./components/Onboarding.jsx";
import ForumArea from "./components/ForumArea.jsx";
import ChatArea from "./components/ChatArea.jsx";
import ModeratorLab from "./components/ModeratorLab.jsx";
import NotificationToast from "./components/NotificationToast.jsx";
import { User, AppNotification } from "./types.js";

type ActiveTab = "forums" | "chat" | "lab";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("forums");
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState(3); // seeded offset
  
  // Custom Status setter
  const [customStatusInput, setCustomStatusInput] = useState("");
  const [isEditingStatus, setIsEditingStatus] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("community_hub_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentUser(parsed);
      } catch (err) {
        localStorage.removeItem("community_hub_user");
      }
    }

    const handleStartDM = (e: Event) => {
      const customEv = e as CustomEvent;
      setActiveTab("chat");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("select_dm_recipient", { detail: customEv.detail }));
      }, 150);
    };

    window.addEventListener("start_dm", handleStartDM);
    return () => {
      window.removeEventListener("start_dm", handleStartDM);
    };
  }, []);

  // Set localStorage sync
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("community_hub_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    localStorage.removeItem("community_hub_user");
    setCurrentUser(null);
    setNotifications([]);
    setUnreadCount(0);
  };

  // Fetch initial notifications
  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/notifications", {
        headers: { "x-user-id": currentUser.id }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  // Establish standard SSE real-time connection stream
  useEffect(() => {
    if (!currentUser) return;

    // Connect to EventSource stream
    const sseUrl = `/api/realtime?userId=${currentUser.id}`;
    let eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      console.log("Real-time SSE channel established with server.");
    };

    // Parse and dispatch SSE events
    eventSource.addEventListener("message", (e) => {
      // General messages
    });

    const handleEventPayload = (event: MessageEvent, eventName: string) => {
      try {
        const data = JSON.parse(event.data);
        
        // Dispatch custom events to decouple modular components
        if (eventName.startsWith("forum:")) {
          window.dispatchEvent(new CustomEvent("sse:forum_event", { 
            detail: { type: eventName, detail: data } 
          }));
        } else if (eventName.startsWith("chat:")) {
          window.dispatchEvent(new CustomEvent("sse:chat_event", { 
            detail: { type: eventName, detail: data } 
          }));
        } else if (eventName === "presence_update") {
          setActiveUsersCount(data.filter((u: any) => u.status === "online" || u.status === "idle").length);
          window.dispatchEvent(new CustomEvent("sse:chat_event", { 
            detail: { type: eventName, detail: data } 
          }));
        } else if (eventName === "notification") {
          // Increment unread and fetch notifications
          setNotifications(prev => [data, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          window.dispatchEvent(new CustomEvent("sse:notification_event", { 
            detail: data 
          }));
        }
      } catch (err) {
        console.error("Failed to parse SSE event data:", err);
      }
    };

    // Standard event listeners mapping
    const events = [
      "chat:message", "chat:typing", "chat:channel_created", "presence_update",
      "forum:post_created", "forum:post_updated", "forum:comment_created", 
      "forum:vote_updated", "forum:comment_updated", "notification"
    ];

    events.forEach(ev => {
      eventSource.addEventListener(ev, (event) => handleEventPayload(event as MessageEvent, ev));
    });

    eventSource.onerror = () => {
      console.warn("SSE connection interrupted. Reconnecting automatically.");
      eventSource.close();
      // Auto-reconnect safety
      setTimeout(() => {
        if (currentUser) {
          eventSource = new EventSource(sseUrl);
        }
      }, 5000);
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser]);

  // Mark all notifications as read
  const handleMarkNotificationsRead = async () => {
    if (!currentUser) return;
    try {
      await fetch("/api/notifications/all/read", {
        method: "POST",
        headers: { "x-user-id": currentUser.id }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Role trigger helper
  const handleToggleSandboxRole = () => {
    if (!currentUser) return;
    const nextRole = currentUser.role === "moderator" ? "user" : "moderator";
    
    // Call server login endpoint to sync state
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: currentUser.username,
        avatarUrl: currentUser.avatarUrl,
        role: nextRole
      })
    })
    .then(res => res.json())
    .then(data => {
      setCurrentUser(data.user);
      localStorage.setItem("community_hub_user", JSON.stringify(data.user));
    })
    .catch(console.error);
  };

  // State Status submission
  const handleSubmitCustomStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    fetch("/api/users/status", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-user-id": currentUser.id
      },
      body: JSON.stringify({ customStatus: customStatusInput.trim() })
    })
    .then(res => res.json())
    .then(updated => {
      setCurrentUser(updated);
      localStorage.setItem("community_hub_user", JSON.stringify(updated));
      setIsEditingStatus(false);
      setCustomStatusInput("");
    })
    .catch(console.error);
  };

  if (!currentUser) {
    return <Onboarding onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-905 overflow-hidden text-slate-100 font-sans" id="applet-viewport">
      
      {/* Dynamic Slide-in Notifications Toast */}
      <NotificationToast currentUser={currentUser} />

      {/* Structured Outer Layout Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-950 px-4 md:px-6 flex items-center justify-between shrink-0 z-30" id="global-portal-header">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-400 to-indigo-500 flex items-center justify-center shadow shadow-indigo-500/10">
            <Radio className="w-4.5 h-4.5 text-slate-950 font-bold" />
          </div>
          <span className="font-bold tracking-tight text-white text-md">
            Community Hub
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 border border-slate-705 text-slate-400">
            Real-time
          </span>
        </div>

        <div className="flex items-center gap-4">
          
          {/* Active members tracking summary */}
          <div className="hidden md:flex items-center gap-1 text-xs text-slate-400 font-medium">
            <Users className="w-4 h-4 text-teal-400" />
            <span>{activeUsersCount} online</span>
          </div>

          {/* Interactive Toggle for easy Sandbox Roles Toggles */}
          <button
            onClick={handleToggleSandboxRole}
            className={`hidden sm:flex items-center gap-1.5 py-1 px-3.5 rounded-xl border text-xs font-semibold select-none transition-all cursor-pointer ${
              currentUser.role === "moderator"
                ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-400"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
            }`}
            title="Dynamically toggle permissions between a standard user and mod"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Role: {currentUser.role}</span>
          </button>

          {/* Real-time notification Bell and dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 transition-all relative cursor-pointer"
              id="bell-notification-trigger"
            >
              <Bell className="w-4.5 h-4.5 text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full text-slate-950 text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification drop drawer */}
            {isNotificationOpen && (
              <div 
                className="absolute right-0 mt-3 w-80 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-4 z-40 space-y-3"
                id="notifications-dropdown"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Notifications ({unreadCount})</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkNotificationsRead}
                      className="text-[10px] text-teal-400 hover:underline font-semibold cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2" id="dropdown-notifications-log">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-[11px]">
                      No notifications yet. You will hear from us on comment replies!
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-2.5 rounded-xl border text-xs transition-all ${
                          notif.isRead 
                            ? "bg-slate-900/40 border-slate-850 text-slate-400" 
                            : "bg-slate-900 border-teal-500/20 text-slate-100"
                        }`}
                      >
                        <p className="font-semibold leading-relaxed">{notif.title}</p>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal">{notif.body}</p>
                        <span className="text-[8px] opacity-60 font-mono mt-1 block">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile settings panel */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-850 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Disconnect User Session"
              id="portal-logout-button"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Primary Workspace container splits navigation and modules */}
      <div className="flex-1 flex overflow-hidden" id="workspace-layout">
        
        {/* Navigation Sidebar Drawer */}
        <aside className="w-16 md:w-56 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0" id="sidebar-tabs-rail">
          
          <div className="p-2 md:p-4 space-y-2" id="sidebar-navigation">
            
            <button
              onClick={() => setActiveTab("forums")}
              className={`w-full py-3 px-2 md:px-4 rounded-xl text-left text-xs font-semibold flex items-center justify-center md:justify-start gap-3 transition-all cursor-pointer ${
                activeTab === "forums"
                  ? "bg-slate-900 border-l-2 border-teal-500 text-teal-400"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
              id="tab-forums-button"
            >
              <MessageSquare className="w-4.5 h-4.5" />
              <span className="hidden md:inline">Forums Forum</span>
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`w-full py-3 px-2 md:px-4 rounded-xl text-left text-xs font-semibold flex items-center justify-center md:justify-start gap-3 transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "bg-slate-900 border-l-2 border-teal-500 text-teal-400"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
              id="tab-chat-button"
            >
              <Radio className="w-4.5 h-4.5" />
              <span className="hidden md:inline">Interactive Rooms</span>
            </button>

            <button
              onClick={() => setActiveTab("lab")}
              className={`w-full py-3 px-2 md:px-4 rounded-xl text-left text-xs font-semibold flex items-center justify-center md:justify-start gap-3 transition-all cursor-pointer ${
                activeTab === "lab"
                  ? "bg-slate-900 border-l-2 border-teal-500 text-teal-400"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
              id="tab-moderator-lab-button"
            >
              <Cpu className="w-4.5 h-4.5" />
              <span className="hidden md:inline">Compliance Lab</span>
            </button>
          </div>

          {/* Custom Status status widget on bottom of sidebar */}
          <div className="p-3 border-t border-slate-850/80 hidden md:block" id="status-bubble">
            <div className="bg-slate-900/60 p-3 rounded-2xl space-y-2 border border-slate-850">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Your custom state</span>
              
              {isEditingStatus ? (
                <form onSubmit={handleSubmitCustomStatus} className="space-y-2">
                  <input
                    type="text"
                    placeholder="e.g. coding..."
                    maxLength={35}
                    value={customStatusInput}
                    onChange={(e) => setCustomStatusInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[10px] text-white focus:outline-none"
                    required
                  />
                  <div className="flex gap-1 justify-end">
                    <button 
                      type="button" 
                      onClick={() => setIsEditingStatus(false)} 
                      className="text-[9px] text-slate-500 hover:text-slate-300 font-semibold uppercase"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="text-[9px] text-teal-400 hover:underline font-bold uppercase"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex justify-between items-start gap-1">
                  <span className="text-[11px] text-slate-300 leading-normal italic line-clamp-2">
                    {currentUser.customStatus || "No status set."}
                  </span>
                  <button
                    onClick={() => {
                      setIsEditingStatus(true);
                      setCustomStatusInput(currentUser.customStatus || "");
                    }}
                    className="text-[10px] text-indigo-400 hover:underline shrink-0 cursor-pointer font-medium"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Selected Workspace Window Router */}
        {activeTab === "forums" && <ForumArea currentUser={currentUser} />}
        {activeTab === "chat" && <ChatArea currentUser={currentUser} />}
        {activeTab === "lab" && <ModeratorLab />}
      </div>

    </div>
  );
}
