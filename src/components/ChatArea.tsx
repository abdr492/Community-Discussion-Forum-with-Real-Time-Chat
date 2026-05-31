import React, { useState, useEffect, useRef } from "react";
import { 
  Send, Hash, Users, Sparkles, MessageCircle,Plus,
  Skull, AlertTriangle, ShieldAlert, Lock, User
} from "lucide-react";
import { User as AppUser, Channel, ChatMessage } from "../types";
import UserProfileModal from "./UserProfileModal.jsx";

interface ChatAreaProps {
  currentUser: AppUser;
}

export default function ChatArea({ currentUser }: ChatAreaProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("general");
  const [selectedRecipient, setSelectedRecipient] = useState<AppUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [selectedUserIdForModal, setSelectedUserIdForModal] = useState<string | null>(null);
  
  // Create channel inputs
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [channelError, setChannelError] = useState("");

  // Input state
  const [typedMessage, setTypedMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch Channels list
  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/chat/channels");
      const data = await res.json();
      if (Array.isArray(data)) {
        setChannels(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch directories
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsersList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch active messages based on target selection
  const fetchMessages = async () => {
    try {
      let endpoint = `/api/chat/channels/${selectedChannelId}/messages`;
      if (selectedRecipient) {
        endpoint = `/api/chat/direct/${selectedRecipient.id}/messages`;
      }

      const res = await fetch(endpoint, {
        headers: { "x-user-id": currentUser.id }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (err) {
      console.error("Error loading chat messages:", err);
    }
  };

  // Auto scroll logic
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchChannels();
    fetchUsers();

    const handleSelectDMEvent = (e: Event) => {
      const customEv = e as CustomEvent;
      const recipientId = customEv.detail;
      // Fetch users list to find that recipient and select them
      fetch("/api/users")
        .then(res => res.json())
        .then(list => {
          if (Array.isArray(list)) {
            const found = list.find(u => u.id === recipientId);
            if (found) {
              setSelectedRecipient(found);
              setSelectedChannelId(""); // clear active channel text header
            }
          }
        })
        .catch(console.error);
    };

    window.addEventListener("select_dm_recipient", handleSelectDMEvent);
    return () => {
      window.removeEventListener("select_dm_recipient", handleSelectDMEvent);
    };
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [selectedChannelId, selectedRecipient]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Typing event poster
  const sendTypingNotification = async (isTyping: boolean) => {
    const activeRoomId = selectedRecipient 
      ? [currentUser.id, selectedRecipient.id].sort().join("_")
      : selectedChannelId;

    try {
      await fetch("/api/chat/typing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id
        },
        body: JSON.stringify({ roomId: activeRoomId, isTyping })
      });
    } catch (err) {
      // quiet fail
    }
  };

  const typingTimeoutRef = useRef<any>(null);
  const handleTypedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTypedMessage(e.target.value);
    
    // Trigger typing notify
    sendTypingNotification(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingNotification(false);
    }, 2000);
  };

  // Submit chat handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    const messageText = typedMessage.trim();
    setTypedMessage("");

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingNotification(false);

    let url = `/api/chat/channels/${selectedChannelId}/messages`;
    if (selectedRecipient) {
      url = `/api/chat/direct/${selectedRecipient.id}/messages`;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id
        },
        body: JSON.stringify({ text: messageText })
      });
      if (!res.ok) throw new Error("Could not pipe message");
      const data = await res.json();
      
      setMessages(prev => [...prev, data]);
      
      if (data.isModerated) {
        alert(`🛡️ Message Flagged by Automod Rules:\nReason: ${data.moderationReason}\nThis was Redacted from public view.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Channel Action
  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id
        },
        body: JSON.stringify({
          name: newChannelName.trim(),
          description: newChannelDesc.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not publish channel");

      setChannels(prev => [...prev, data]);
      setNewChannelName("");
      setNewChannelDesc("");
      setIsCreatingChannel(false);
      setSelectedChannelId(data.id);
      setSelectedRecipient(null);
    } catch (err: any) {
      setChannelError(err.message || "Error appending channel link.");
    }
  };

  // Listen for realtime chat elements from SSE in App.tsx
  useEffect(() => {
    const handleChatRealtime = (e: any) => {
      const { type, detail } = e;
      
      if (type === "chat:message") {
        const activeRoomId = selectedRecipient 
          ? [currentUser.id, selectedRecipient.id].sort().join("_")
          : selectedChannelId;

        if (detail.roomId === activeRoomId) {
          // Idempotent duplicate check
          setMessages(prev => {
            if (prev.some(m => m.id === detail.id)) return prev;
            return [...prev, detail];
          });
        }
      } else if (type === "chat:typing") {
        const activeRoomId = selectedRecipient 
          ? [currentUser.id, selectedRecipient.id].sort().join("_")
          : selectedChannelId;

        if (detail.roomId === activeRoomId && detail.userId !== currentUser.id) {
          setTypingUsers(prev => ({
            ...prev,
            [detail.username]: detail.isTyping
          }));
        }
      } else if (type === "presence_update") {
        setUsersList(detail);
      } else if (type === "chat:channel_created") {
        setChannels(prev => {
          if (prev.some(c => c.id === detail.id)) return prev;
          return [...prev, detail];
        });
      }
    };

    window.addEventListener("sse:chat_event", handleChatRealtime);
    return () => {
      window.removeEventListener("sse:chat_event", handleChatRealtime);
    };
  }, [selectedChannelId, selectedRecipient]);

  // Toggling chat target
  const handleSelectChannel = (chanId: string) => {
    setSelectedChannelId(chanId);
    setSelectedRecipient(null);
    setTypingUsers({});
  };

  const handleSelectRecipient = (recip: AppUser) => {
    setSelectedRecipient(recip);
    setTypingUsers({});
  };

  // Typing list string
  const activeTypingList = Object.entries(typingUsers)
    .filter(([_, isTyping]) => isTyping)
    .map(([uname]) => `@${uname}`);

  const activeHeaderName = selectedRecipient 
    ? `@${selectedRecipient.username}` 
    : `#${selectedChannelId}`;

  const currentChannelObj = !selectedRecipient 
    ? channels.find(c => c.id === selectedChannelId) 
    : null;

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-900 border-l border-slate-800" id="chat-workspace">
      
      {/* Rooms & Directories Panel - Left Pane */}
      <div className="w-64 bg-slate-950 border-r border-slate-800 shrink-0 flex flex-col justify-between" id="chat-rooms-pane">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Channels lists header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Public Channels</span>
              <button
                onClick={() => setIsCreatingChannel(true)}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                title="Create a Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5" id="channels-navigation-list">
              {channels.map(chan => (
                <button
                  key={chan.id}
                  onClick={() => handleSelectChannel(chan.id)}
                  className={`w-full text-left py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                    !selectedRecipient && selectedChannelId === chan.id
                      ? "bg-slate-800 text-teal-400 font-semibold shadow-inner"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Hash className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  <span className="truncate">{chan.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* DMs Lists directory */}
          <div className="space-y-2">
            <div className="px-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Direct Messages</span>
            </div>

            <div className="space-y-0.5" id="dm-users-navigation-list">
              {usersList
                .filter(u => u.id !== currentUser.id)
                .map(u => {
                  const isOnline = u.status === "online";
                  const isIdle = u.status === "idle";
                  const statusColor = isOnline 
                    ? "bg-teal-400 ring-teal-500/20" 
                    : isIdle 
                      ? "bg-amber-400 ring-amber-500/20" 
                      : "bg-slate-600 ring-slate-700/20";

                  return (
                    <button
                      key={u.id}
                      onClick={() => handleSelectRecipient(u)}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                        selectedRecipient && selectedRecipient.id === u.id
                          ? "bg-slate-800 text-teal-400 font-semibold shadow-inner"
                          : "text-slate-400 hover:bg-slate-900 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div 
                          className="relative shrink-0 cursor-pointer group"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserIdForModal(u.id);
                          }}
                          title={`Click avatar to view @${u.username}'s profile`}
                        >
                          <img src={u.avatarUrl} alt={u.username} className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-800 group-hover:ring-teal-400 transition-colors" />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-slate-950 ${statusColor}`} />
                        </div>
                        <span className="truncate">@{u.username}</span>
                      </div>
                      <span className="text-[9px] bg-slate-900 border border-slate-800 px-1 py-0.2 rounded font-semibold scale-90 opacity-85">
                        {u.role === "moderator" ? "MOD" : "USER"}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

        </div>

        {/* Self Account profile summary */}
        <div className="p-3 bg-slate-905 border-t border-slate-800/80 flex items-center justify-between gap-2" id="user-info-banner">
          <div className="flex items-center gap-2 truncate">
            <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-8 h-8 rounded-full border border-slate-700 object-cover" />
            <div className="truncate">
              <div className="text-xs font-bold text-white leading-none mb-0.5">@{currentUser.username}</div>
              <div className="text-[10px] text-teal-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-ping" />
                {currentUser.role === "moderator" ? "moderator (admin)" : "member account"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat log - Center Pane */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden" id="chat-messages-container-pane">
        
        {/* Chat Room Banner Header */}
        <div className="h-14 border-b border-slate-800 p-4 bg-slate-900 flex items-center justify-between" id="chat-room-banner">
          <div>
            <div 
              onClick={() => {
                if (selectedRecipient) {
                  setSelectedUserIdForModal(selectedRecipient.id);
                }
              }}
              className={`text-sm font-bold text-white flex items-center gap-1.5 font-sans ${selectedRecipient ? 'cursor-pointer hover:text-teal-400 select-none' : ''}`}
            >
              {selectedRecipient ? <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" /> : <Hash className="w-4 h-4 text-slate-500 shrink-0" />}
              {activeHeaderName}
            </div>
            {currentChannelObj && (
              <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-sm md:max-w-md">
                {currentChannelObj.description || "No topic set for this team room."}
              </p>
            )}
            {selectedRecipient && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                Private direct communication with @{selectedRecipient.username} ({selectedRecipient.status === "online" ? "active" : "away"}).
              </p>
            )}
          </div>

          <div className="text-[11px] font-mono text-slate-500 pr-1 select-none">
            real-time sync: SSE + Express
          </div>
        </div>

        {/* Message Feeds Scroll block */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900" id="chat-conversation-log">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 py-10 text-center" id="empty-chat-banner">
              <MessageCircle className="w-10 h-10 opacity-30 text-indigo-400" />
              <p className="text-xs max-w-xs leading-relaxed">
                This is the very beginning of the chat log in {activeHeaderName}. Send a greeting or code sample to start!
              </p>
            </div>
          ) : (
            messages.map(msg => {
              const belongsToMe = msg.userId === currentUser.id;
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 max-w-[85%] ${belongsToMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                  id={`chat-msg-row-${msg.id}`}
                >
                  <img 
                    src={msg.avatarUrl} 
                    alt={msg.username} 
                    onClick={() => setSelectedUserIdForModal(msg.userId)}
                    className="w-8 h-8 rounded-full border border-slate-700/80 object-cover shrink-0 mt-0.5 cursor-pointer hover:border-teal-400 transition-colors" 
                  />
                  
                  <div className="space-y-0.5">
                    <div className={`flex items-center gap-2 text-[10px] ${belongsToMe ? "justify-end" : ""}`}>
                      <span 
                        onClick={() => setSelectedUserIdForModal(msg.userId)}
                        className="font-bold text-slate-300 cursor-pointer hover:underline hover:text-teal-400"
                      >
                        @{msg.username}
                      </span>
                      <span className="text-slate-500 tracking-wider">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {msg.isModerated && currentUser.role !== "moderator" ? (
                      <div className="px-3.5 py-2.5 rounded-2xl bg-red-950/25 border border-red-500/25 text-red-400 italic text-xs flex items-center gap-1.5 shadow-sm">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>[Redacted by Automod Rules]</span>
                      </div>
                    ) : (
                      <div className={`px-4 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                        belongsToMe 
                          ? "bg-gradient-to-tr from-teal-500 to-teal-600 text-slate-950 rounded-tr-none font-medium" 
                          : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60"
                      }`}>
                        {msg.text}

                        {msg.isModerated && currentUser.role === "moderator" && (
                          <div className="mt-1 pb-0.5 border-t border-red-505/20 pt-1 text-[9px] text-red-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Auto-Flag: {msg.moderationReason}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 bg-slate-905 border-t border-slate-800" id="chat-footer-controls">
          
          {/* Typing Alert indicators */}
          <div className="h-4 mb-1 pl-1 text-[10px] text-slate-400 flex items-center gap-1">
            {activeTypingList.length > 0 && (
              <>
                <span className="font-bold text-teal-400 animate-pulse">{activeTypingList.join(", ")}</span>
                <span>{activeTypingList.length === 1 ? "is typing..." : "are typing..."}</span>
              </>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2" id="chat-input-form">
            <input 
              type="text"
              placeholder={`Send message to ${activeHeaderName}...`}
              value={typedMessage}
              onChange={handleTypedInputChange}
              maxLength={400}
              className="flex-1 bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              id="message-text-bar"
              required
            />
            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-4 py-3 rounded-xl cursor-pointer transition-all flex items-center justify-center shrink-0 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* dialog modal block to append custom channels */}
      {isCreatingChannel && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" id="channel-create-modal">
          <div className="w-full max-w-sm bg-slate-850 border border-slate-700 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-1.5">
              <Plus className="text-teal-400 w-4.5 h-4.5" />
              Create a Channels Room
            </h3>

            <form onSubmit={handleCreateChannelSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Room name</label>
                <input 
                  type="text"
                  placeholder="e.g. general, frontend-review"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  maxLength={24}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Topic Description</label>
                <input 
                  type="text"
                  placeholder="e.g. Where we review design components and assets."
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  maxLength={100}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-400"
                />
              </div>

              {channelError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-400 text-xs">
                  {channelError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsCreatingChannel(false); setChannelError(""); }}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer shadow"
                >
                  Add Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Detail modal hooks overlay inside ChatArea */}
      {selectedUserIdForModal && (
        <UserProfileModal 
          userId={selectedUserIdForModal} 
          currentUser={currentUser}
          onClose={() => setSelectedUserIdForModal(null)} 
          onStartDM={(otherUserId) => {
            const foundUser = usersList.find(u => u.id === otherUserId);
            if (foundUser) {
              setSelectedRecipient(foundUser);
              setSelectedChannelId("");
            }
          }}
        />
      )}
    </div>
  );
}
