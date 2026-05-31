import React, { useState, useEffect } from "react";
import { 
  MessageSquare, Pin, Search, ThumbsUp, ThumbsDown, 
  Flag, PinOff, Plus, ArrowLeft, Send, Sparkles, AlertCircle,
  Clock, X
} from "lucide-react";
import { ForumPost, ForumComment, User } from "../types";
import UserProfileModal from "./UserProfileModal.jsx";

interface ForumAreaProps {
  currentUser: User;
  onPostSelected?: (post: ForumPost) => void;
}

export default function ForumArea({ currentUser }: ForumAreaProps) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [selectedUserIdForModal, setSelectedUserIdForModal] = useState<string | null>(null);
  
  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Recent Searches States
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem("recent_forum_searches");
    return saved ? JSON.parse(saved) : [];
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Debounce effect to auto-track user searches after typing stops for 1.5 seconds
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const delayDebounceFn = setTimeout(() => {
      const clean = searchQuery.trim();
      if (clean.length >= 2) {
        setRecentSearches(prev => {
          const filtered = prev.filter(q => q.toLowerCase() !== clean.toLowerCase());
          const updated = [clean, ...filtered].slice(0, 5);
          localStorage.setItem("recent_forum_searches", JSON.stringify(updated));
          return updated;
        });
      }
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);
  
  // Create Post States
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTags, setNewPostTags] = useState("");
  const [createPostError, setCreatePostError] = useState("");
  const [createPostLoading, setCreatePostLoading] = useState(false);

  // Poll configuration states
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  // Comment Writing State
  const [newCommentText, setNewCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Moderation note modal
  const [modReason, setModReason] = useState("");
  const [activeModdingPost, setActiveModdingPost] = useState<ForumPost | null>(null);
  const [activeModdingComment, setActiveModdingComment] = useState<ForumComment | null>(null);

  // Fetch Forum Feed
  const fetchPosts = async () => {
    try {
      let url = "/api/forum/posts";
      const params: string[] = [];
      if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
      if (selectedTag) params.push(`tag=${encodeURIComponent(selectedTag)}`);
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      const res = await fetch(url, {
        headers: { "x-user-id": currentUser.id }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setPosts(data);
      }
    } catch (err) {
      console.error("Error fetching forum posts:", err);
    }
  };

  // Fetch comments for chosen post
  const fetchComments = async (postId: string) => {
    try {
      const res = await fetch(`/api/forum/posts/${postId}/comments`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setComments(data);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [searchQuery, selectedTag]);

  // Real-time Event Receiver Sync via standard listener hooks (notified from parent App.tsx)
  useEffect(() => {
    const handleForumUpdate = (e: any) => {
      const payload = e.detail || e;
      const { type, detail } = payload;
      if (type === "forum:post_created") {
        setPosts(prev => [detail, ...prev]);
      } else if (type === "forum:post_updated") {
        setPosts(prev => prev.map(p => p.id === detail.id ? detail : p));
        if (selectedPost && selectedPost.id === detail.id) {
          setSelectedPost(detail);
        }
      } else if (type === "forum:comment_created") {
        const { comment, post } = detail;
        if (selectedPost && selectedPost.id === comment.postId) {
          setComments(prev => [...prev, comment]);
          setSelectedPost(post);
        }
        setPosts(prev => prev.map(p => p.id === post.id ? post : p));
      } else if (type === "forum:vote_updated") {
        const { postId, voteCount, votes } = detail;
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, voteCount, votes } : p));
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(prev => prev ? { ...prev, voteCount, votes } : null);
        }
      } else if (type === "forum:comment_updated") {
        setComments(prev => prev.map(c => c.id === detail.id ? detail : c));
      } else if (type === "forum:poll_updated") {
        const { postId, poll } = detail;
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, poll } : p));
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(prev => prev ? { ...prev, poll } : null);
        }
      }
    };

    window.addEventListener("sse:forum_event", handleForumUpdate);
    return () => {
      window.removeEventListener("sse:forum_event", handleForumUpdate);
    };
  }, [selectedPost]);

  // Handle post selected
  const handleSelectPost = (post: ForumPost) => {
    setSelectedPost(post);
    fetchComments(post.id);
  };

  // Vote handler
  const handleVote = async (postId: string, type: "up" | "down" | null) => {
    try {
      const res = await fetch(`/api/forum/posts/${postId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id
        },
        body: JSON.stringify({ type })
      });
      if (!res.ok) throw new Error("Could not compute vote");
      const updatedPost = await res.json();
      // Optimistic state sync
      setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(updatedPost);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePollVote = async (postId: string, optionId: string) => {
    try {
      const res = await fetch(`/api/forum/posts/${postId}/poll/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id
        },
        body: JSON.stringify({ optionId })
      });
      if (!res.ok) throw new Error("Could not compute poll vote");
      const updatedPost = await res.json();
      setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(updatedPost);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Comments
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedPost) return;

    setCommentLoading(true);
    try {
      const res = await fetch(`/api/forum/posts/${selectedPost.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id
        },
        body: JSON.stringify({ content: newCommentText.trim() })
      });
      if (!res.ok) throw new Error("Could not send reply");
      const savedComment = await res.json();
      
      setComments(prev => [...prev, savedComment]);
      setNewCommentText("");
      
      // Update comment count locally
      setSelectedPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, commentCount: p.commentCount + 1 } : p));
    } catch (err) {
      console.error(err);
    } finally {
      setCommentLoading(false);
    }
  };

  // Pin Post
  const handlePinPost = async (postId: string) => {
    try {
      const res = await fetch(`/api/forum/posts/${postId}/pin`, {
        method: "POST",
        headers: { "x-user-id": currentUser.id }
      });
      if (!res.ok) throw new Error("Permission denied or server offline");
      const updated = await res.json();
      setPosts(prev => prev.map(p => p.id === postId ? updated : p));
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(updated);
      }
    } catch (err) {
      alert("Only users holding the Moderator role are authorized to pin forum threads.");
    }
  };

  // Moderate Post (Flag toxic / block manual)
  const handleModeratePost = async (flag: boolean) => {
    if (!activeModdingPost) return;
    try {
      const res = await fetch(`/api/forum/posts/${activeModdingPost.id}/moderate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id
        },
        body: JSON.stringify({ flag, reason: modReason || "Moderator flagged text guidelines policy." })
      });
      if (!res.ok) throw new Error("Censor command rejected");
      const updated = await res.json();
      setPosts(prev => prev.map(p => p.id === activeModdingPost.id ? updated : p));
      if (selectedPost && selectedPost.id === activeModdingPost.id) {
        setSelectedPost(updated);
      }
      setActiveModdingPost(null);
      setModReason("");
    } catch (err) {
      alert("Permission denied or moderation error.");
    }
  };

  // Moderate Comment
  const handleModerateComment = async (flag: boolean) => {
    if (!activeModdingComment) return;
    try {
      const res = await fetch(`/api/forum/comments/${activeModdingComment.id}/moderate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id
        },
        body: JSON.stringify({ flag, reason: modReason || "Comment flag review." })
      });
      if (!res.ok) throw new Error("Censor reply command rejected");
      const updatedComment = await res.json();
      setComments(prev => prev.map(c => c.id === activeModdingComment.id ? updatedComment : c));
      setActiveModdingComment(null);
      setModReason("");
    } catch (err) {
      alert("Permission denied or moderation error.");
    }
  };

  // Add Thread/Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      setCreatePostError("Title and thread body are both required");
      return;
    }

    setCreatePostLoading(true);
    setCreatePostError("");

    try {
      const tagsArray = newPostTags
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const res = await fetch("/api/forum/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id
        },
        body: JSON.stringify({
          title: newPostTitle.trim(),
          content: newPostContent.trim(),
          tags: tagsArray,
          poll: hasPoll && pollQuestion.trim() ? {
            question: pollQuestion.trim(),
            options: pollOptions.filter(o => o.trim() !== "")
          } : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not publish thread");
      }

      setPosts(prev => [data, ...prev]);
      setIsCreatingPost(false);
      setNewPostTitle("");
      setNewPostContent("");
      setNewPostTags("");
      setHasPoll(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      
      if (data.isModerated) {
        alert(`⚠️ Thread Published (Flagged by AI): Auto-Moderation checked this entry:\n"${data.moderationReason}"\nIt has been blurred/marked as Redacted for standard users.`);
      }
    } catch (err: any) {
      setCreatePostError(err.message || "Could not make post");
    } finally {
      setCreatePostLoading(false);
    }
  };

  // Collect all unique tags for the sidebar filter
  const allUniqueTags = Array.from(
    new Set(posts.flatMap(p => p.tags))
  ).filter(t => typeof t === "string" && t.trim() !== "");

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-900 border-l border-slate-800" id="forum-workspace">
      
      {/* Sidebar Filter Rails */}
      <div className="w-60 bg-slate-900 shadow-xl border-r border-slate-800 p-4 shrink-0 hidden md:block" id="forum-tags-rail">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Discussion tags</span>
          {(selectedTag || searchQuery) && (
            <button
              onClick={() => { setSelectedTag(null); setSearchQuery(""); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="space-y-1" id="forum-tag-list">
          <button
            onClick={() => setSelectedTag(null)}
            className={`w-full text-left py-2 px-3 rounded-xl text-xs font-medium transition-all ${
              !selectedTag 
                ? "bg-slate-800 text-teal-400 font-semibold" 
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            All Threads ({posts.length})
          </button>
          
          {allUniqueTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`w-full text-left py-2 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                selectedTag === tag 
                  ? "bg-slate-800 text-teal-400 font-semibold" 
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <span>#{tag}</span>
              <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-500">
                {posts.filter(p => p.tags.includes(tag)).length}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 p-4 bg-slate-850/60 border border-slate-850 rounded-2xl relative overflow-hidden" id="presence-mod-indicator">
          <div className="z-10 relative space-y-2">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              AI Auto-Moderation
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Posts and chat messages are verified through server-side filters. Toxicity or profanity triggers automatic redaction.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>

      {/* Main Column Feed & Post Details */}
      <div className="flex-1 flex flex-col overflow-hidden" id="forum-feed-pane">
        
        {selectedPost ? (
          // ==================== DETAILED THREAD VIEW ====================
          <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6" id="forum-post-details-container">
            <button
              onClick={() => setSelectedPost(null)}
              className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-teal-400 mb-6 transition-all self-start cursor-pointer hover:-translate-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to forum feed
            </button>

            {/* Post Wrapper Card */}
            <div className={`p-6 border rounded-3xl bg-slate-850/80 mb-6 relative overflow-hidden transition-all ${
              selectedPost.isModerated ? "border-red-500/30 bg-red-950/5" : "border-slate-800/80"
            }`} id={`post-detailed-card-${selectedPost.id}`}>
              {selectedPost.isPinned && (
                <span className="absolute top-4 right-4 text-xs font-semibold text-teal-400 flex items-center gap-1 bg-teal-500/10 py-1 px-2.5 rounded-full">
                  <Pin className="w-3.5 h-3.5" />
                  Pinned
                </span>
              )}

              {/* Author & Meta Row */}
              <div className="flex items-center gap-3 mb-4">
                <div 
                  onClick={() => setSelectedUserIdForModal(selectedPost.authorId)}
                   className="flex items-center gap-3 cursor-pointer select-none group/meta"
                >
                  <img 
                    src={selectedPost.authorAvatar} 
                    alt={selectedPost.authorName} 
                    className="w-10 h-10 rounded-full object-cover border border-slate-700 group-hover/meta:border-teal-500 transition-all" 
                  />
                  <div>
                    <div className="text-sm font-semibold text-white group-hover/meta:text-teal-400 transition-colors">@{selectedPost.authorName}</div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(selectedPost.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Title and Content body */}
              {selectedPost.isModerated && currentUser.role !== "moderator" ? (
                <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl text-red-300 text-sm space-y-2 mb-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    [REDACTED BY MODERATION POLICY]
                  </div>
                  <p className="text-xs text-red-400/80 leading-relaxed italic">
                    Reason: {selectedPost.moderationReason || "Violated community toxicity standard policies."}
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-white tracking-tight mb-3 font-sans leading-snug">
                    {selectedPost.title}
                  </h2>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-6">
                    {selectedPost.content}
                  </p>
                </>
              )}

              {/* Poll component rendering */}
              {selectedPost.poll && (
                <div className="mb-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-sm" id={`poll-widget-${selectedPost.id}`}>
                  <div className="flex items-start gap-2.5">
                    <span className="text-teal-400 text-lg">📊</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Community Poll</h4>
                      <h3 className="text-sm font-bold text-white leading-snug mt-1">{selectedPost.poll.question}</h3>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {(() => {
                      const totalVotes = selectedPost.poll.options.reduce((sum, o) => sum + o.votes.length, 0);
                      const hasVotedAny = selectedPost.poll.options.some(o => o.votes.includes(currentUser.id));
                      
                      return selectedPost.poll.options.map(opt => {
                        const hasVotedThis = opt.votes.includes(currentUser.id);
                        const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                        
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handlePollVote(selectedPost.id, opt.id)}
                            className={`w-full text-left relative overflow-hidden rounded-xl border p-3 hover:border-teal-500/40 transition-all select-none cursor-pointer group flex flex-col justify-center ${
                              hasVotedThis 
                                ? "bg-teal-950/20 border-teal-500/30 text-teal-300 animate-pulse" 
                                : "bg-slate-950/40 border-slate-850 text-slate-300 hover:bg-slate-900/50"
                            }`}
                          >
                            {/* Live matching slider progress bar inside */}
                            <div 
                              className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ${
                                hasVotedThis ? "bg-teal-500/10" : "bg-slate-800/20"
                              }`} 
                              style={{ width: `${pct}%` }}
                            />

                            <div className="relative z-10 flex items-center justify-between text-xs font-medium w-full">
                              <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full transition-transform ${
                                  hasVotedThis ? "bg-teal-400 scale-110" : "bg-transparent group-hover:bg-slate-500/40"
                                }`} />
                                <span>{opt.text}</span>
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">
                                {pct}% <span className="opacity-60">({opt.votes.length})</span>
                              </span>
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/30 text-[10px] text-slate-500 font-mono">
                    <span>👥 Total votes: {selectedPost.poll.options.reduce((sum, o) => sum + o.votes.length, 0)}</span>
                    <span>🗳️ Click any option to vote or change</span>
                  </div>
                </div>
              )}

              {/* If Moderated and user is indeed moderator, showcase original post but with redacted flag */}
              {selectedPost.isModerated && currentUser.role === "moderator" && (
                <div className="mb-4 p-3 bg-red-950/20 border border-red-500/30 rounded-2xl text-xs text-red-400 flex flex-col gap-1">
                  <div className="font-semibold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Moderator Flag Active</div>
                  <div>Raw text displayed to Admins. Reason: {selectedPost.moderationReason}</div>
                </div>
              )}

              {/* Tags and Vote panel */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
                <div className="flex flex-wrap gap-1.5">
                  {selectedPost.tags.map(t => (
                    <span key={t} className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-400 font-mono">
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleVote(selectedPost.id, selectedPost.votes[currentUser.id] === "up" ? null : "up")}
                    className={`p-2 rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all ${
                      selectedPost.votes[currentUser.id] === "up" 
                        ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" 
                        : "bg-slate-900 text-slate-400 hover:text-white border border-transparent"
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{selectedPost.voteCount}</span>
                  </button>

                  <button
                    onClick={() => handleVote(selectedPost.id, selectedPost.votes[currentUser.id] === "down" ? null : "down")}
                    className={`p-2 rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all ${
                      selectedPost.votes[currentUser.id] === "down" 
                        ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                        : "bg-slate-900 text-slate-400 hover:text-white border border-transparent"
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>

                  {/* Moderator Controls explicitly check role property */}
                  {currentUser.role === "moderator" && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handlePinPost(selectedPost.id)}
                        className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                          selectedPost.isPinned 
                            ? "border-teal-500/30 bg-teal-500/10 text-teal-400" 
                            : "border-slate-700 bg-slate-900 text-slate-400 hover:text-white"
                        }`}
                        title="Pin this thread"
                      >
                        {selectedPost.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                      </button>
                      
                      <button
                        onClick={() => {
                          setActiveModdingPost(selectedPost);
                          setModReason(selectedPost.moderationReason || "");
                        }}
                        className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                          selectedPost.isModerated 
                            ? "bg-red-500/20 text-red-400 border-red-500/40" 
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:text-red-400"
                        }`}
                        title="Moderate / Redact toggle"
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comments Log */}
            <div className="space-y-4 mb-8" id="post-comments-section">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
                Replies ({comments.length})
              </h3>

              {comments.length === 0 ? (
                <div className="text-center p-8 bg-slate-900 rounded-3xl border border-slate-800 text-slate-500 text-xs">
                  No replies yet. Be the first to start the conversation!
                </div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className={`p-4 rounded-2xl bg-slate-850/60 border transition-all ${
                    c.isModerated ? "border-red-500/20 bg-red-950/5" : "border-slate-800/60"
                  }`} id={`comment-card-${c.id}`}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div 
                        onClick={() => setSelectedUserIdForModal(c.authorId)}
                        className="flex items-center gap-2 cursor-pointer select-none group/comment-meta"
                      >
                        <img src={c.authorAvatar} alt={c.authorName} className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-800 group-hover/comment-meta:ring-teal-500/30 transition-all" />
                        <span className="text-xs font-semibold text-white group-hover/comment-meta:text-teal-400 transition-colors">@{c.authorName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(c.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {c.isModerated && currentUser.role !== "moderator" ? (
                      <div className="text-red-400/80 italic text-xs py-1">
                        ⚠️ [Reply content moderated for toxicity guidelines - {c.moderationReason || "Flagged"}]
                      </div>
                    ) : (
                      <p className="text-slate-300 text-sm leading-relaxed pl-1">
                        {c.content}
                      </p>
                    )}

                    {/* Mod controls on comments */}
                    {currentUser.role === "moderator" && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/40">
                        <span className="text-[10px] text-slate-500 italic">
                          {c.isModerated && `Flagged: ${c.moderationReason}`}
                        </span>
                        <button
                          onClick={() => {
                            setActiveModdingComment(c);
                            setModReason(c.moderationReason || "");
                          }}
                          className={`text-[10px] cursor-pointer font-medium px-2 py-0.5 rounded transition-all ${
                            c.isModerated 
                              ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                              : "text-slate-400 hover:text-red-400"
                          }`}
                        >
                          {c.isModerated ? "Remove Redaction" : "Redact"}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quick Post Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2 sticky bottom-0 bg-slate-900 pt-3 pb-4" id="reply-form">
              <input 
                type="text"
                placeholder="Write a constructive reply or ask a question..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                maxLength={400}
                className="flex-1 bg-slate-850 border border-slate-700/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                id="comment-input-box"
                required
              />
              <button
                type="submit"
                disabled={commentLoading}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Reply
              </button>
            </form>
          </div>
        ) : (
          // ==================== ALL POSTS LIST FEED ====================
          <div className="flex-1 overflow-y-auto" id="all-posts-listing-wrapper">
            
            {/* Top Filter and Create Actions Bar */}
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md p-4 border-b border-slate-800/80 flex flex-col sm:flex-row gap-3 items-center justify-between" id="forum-controls">
              
              {/* Search Element */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search articles & threads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const clean = searchQuery.trim();
                      if (clean) {
                        setRecentSearches(prev => {
                          const filtered = prev.filter(q => q.toLowerCase() !== clean.toLowerCase());
                          const updated = [clean, ...filtered].slice(0, 5);
                          localStorage.setItem("recent_forum_searches", JSON.stringify(updated));
                          return updated;
                        });
                        (e.target as HTMLInputElement).blur();
                      }
                    }
                  }}
                  className="w-full bg-slate-850 border border-slate-700/60 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all"
                  id="forum-search-box"
                />

                {/* Floating Recent Searches list overlay dropdown */}
                {isSearchFocused && recentSearches.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-25 py-2 animate-fade-in divide-y divide-slate-800/60">
                    <div className="px-3 py-1 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">
                      <span>Recent Searches</span>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setRecentSearches([]);
                          localStorage.removeItem("recent_forum_searches");
                        }}
                        className="text-teal-400 hover:text-teal-300 font-semibold cursor-pointer text-[10px]"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="py-1">
                      {recentSearches.map((query, idx) => (
                        <div
                          key={`${query}-${idx}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearchQuery(query);
                            setIsSearchFocused(false);
                          }}
                          className="w-full px-3 py-1.5 hover:bg-slate-900 flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0 group-hover:text-teal-400" />
                            <span className="truncate">{query}</span>
                          </div>
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setRecentSearches(prev => {
                                const updated = prev.filter(q => q !== query);
                                localStorage.setItem("recent_forum_searches", JSON.stringify(updated));
                                return updated;
                              });
                            }}
                            className="p-1 rounded-md text-slate-600 hover:text-red-400 hover:bg-slate-800/80 transition-colors"
                            title="Remove from history"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-1 sm:pb-0" id="filter-pillboxes">
                {/* Mobile tags selector in horizontal rail */}
                {selectedTag && (
                  <button 
                    onClick={() => setSelectedTag(null)}
                    className="md:hidden px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-xs text-indigo-400 font-semibold"
                  >
                    #{selectedTag} ✕
                  </button>
                )}

                <button
                  onClick={() => setIsCreatingPost(true)}
                  className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-semibold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-500/10 ml-auto whitespace-nowrap"
                  id="create-thread-toggle-button"
                >
                  <Plus className="w-4 h-4" />
                  New Thread
                </button>
              </div>
            </div>

            {/* Creating Entry form (Inline or top drawer block) */}
            {isCreatingPost && (
              <div className="p-5 border-b border-slate-800 bg-slate-850/40 relative overflow-hidden" id="creating-post-drawer">
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-teal-400 to-indigo-500" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                    Publish Community Forum Thread
                  </span>
                  <button
                    onClick={() => { setIsCreatingPost(false); setCreatePostError(""); }}
                    className="text-slate-500 hover:text-white text-xs cursor-pointer font-medium"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleCreatePost} className="space-y-4" id="new-post-form">
                  <div className="space-y-1">
                    <input 
                      type="text"
                      placeholder="Title: Sum up your post concisely..."
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      maxLength={80}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <textarea 
                      placeholder="What is your article topic? Provide full details. Profanity check is active..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      rows={5}
                      maxLength={3000}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 font-sans"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <input 
                      type="text"
                      placeholder="Tags: comma, separated, tokens (e.g. react, hardware)"
                      value={newPostTags}
                      onChange={(e) => setNewPostTags(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 font-mono"
                    />
                  </div>

                  {/* Poll Attachment options inside ForumArea */}
                  <div className="p-3 bg-slate-900 border border-slate-800/60 rounded-xl space-y-3 shadow-inner">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={hasPoll}
                        onChange={(e) => setHasPoll(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-500/30"
                      />
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <span className="text-teal-400 font-normal">📊</span>
                        Attach interactive community poll
                      </span>
                    </label>

                    {hasPoll && (
                      <div className="space-y-3 pt-2.5 border-t border-slate-800/40">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">Poll Question</label>
                          <input 
                            type="text"
                            placeholder="e.g. Which rendering system do you prefer?"
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            required={hasPoll}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">Poll Options</label>
                          {pollOptions.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-1.5">
                              <input 
                                type="text"
                                placeholder={`Option ${oIdx + 1}`}
                                value={opt}
                                onChange={(e) => {
                                  const list = [...pollOptions];
                                  list[oIdx] = e.target.value;
                                  setPollOptions(list);
                                }}
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-slate-655 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                required={hasPoll && oIdx < 2}
                              />
                              {pollOptions.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPollOptions(pollOptions.filter((_, idx) => idx !== oIdx));
                                  }}
                                  className="p-1.5 text-[10px] text-red-400 hover:text-red-300 bg-red-950/25 border border-red-900/40 hover:bg-red-950/50 rounded-lg transition-all cursor-pointer font-medium"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => {
                              setPollOptions([...pollOptions, ""]);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-medium mt-1.5 cursor-pointer"
                          >
                            <span>➕ Add Poll Option</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {createPostError && (
                    <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-400 text-xs">
                      {createPostError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={createPostLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer select-none transition-all duration-200"
                  >
                    {createPostLoading ? "Checking moderation safety..." : "Publish Forum Thread"}
                  </button>
                </form>
              </div>
            )}

            {/* Threads Loop Feed */}
            <div className="p-4 space-y-4" id="threads-wrapper-feed">
              {posts.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  No matching forum threads found. Press "New Thread" button above to publish one!
                </div>
              ) : (
                posts.map(post => (
                  <div
                    key={post.id}
                    onClick={() => handleSelectPost(post)}
                    className={`p-5 rounded-2xl bg-slate-850/40 hover:bg-slate-800/40 border transition-all cursor-pointer group relative overflow-hidden ${
                      post.isModerated ? "border-red-500/20 bg-red-950/2" : "border-slate-800/80 hover:border-slate-700/80"
                    }`}
                    id={`post-list-item-${post.id}`}
                  >
                    {/* Pin element */}
                    {post.isPinned && (
                      <span className="absolute top-4 right-4 text-[10px] font-bold text-teal-400 flex items-center gap-0.5 bg-teal-500/15 py-0.5 px-2 rounded-md">
                        <Pin className="w-3 h-3" />
                        Pinned
                      </span>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUserIdForModal(post.authorId);
                        }}
                        className="flex items-center gap-1.5 cursor-pointer hover:underline text-slate-300 transition-all select-none group/meta"
                      >
                        <img 
                          src={post.authorAvatar} 
                          alt={post.authorName} 
                          className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-800 group-hover/meta:ring-teal-500/40" 
                        />
                        <span className="text-xs font-semibold group-hover/meta:text-teal-400">@{post.authorName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(post.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Moderated content vs public detail */}
                    {post.isModerated && currentUser.role !== "moderator" ? (
                      <div className="mb-3 p-3 bg-red-950/10 border border-red-500/15 rounded-xl text-xs text-red-400/80">
                        [Flagged and moderated for community guidelines policy match]
                      </div>
                    ) : (
                      <>
                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-teal-400 tracking-tight transition-colors mb-1.5 leading-snug">
                          {post.title}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3.5">
                          {post.content}
                        </p>
                      </>
                    )}

                    {post.isModerated && currentUser.role === "moderator" && (
                      <div className="mb-2.5 text-[10px] text-red-400 font-medium">⚠️ Moderated flag active: {post.moderationReason}</div>
                    )}

                    {/* Footer tags and counts */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex flex-wrap gap-1">
                        {post.tags.map(t => (
                          <span
                            key={t}
                            onClick={(e) => { e.stopPropagation(); setSelectedTag(t); }}
                            className="text-[9px] bg-slate-900 hover:bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-400 font-mono transition-colors"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 font-semibold pl-1">
                        {post.poll && (
                          <span className="flex items-center gap-1 text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded text-[10px]" title="Includes community poll">
                            📊 Poll
                          </span>
                        )}
                        <span className="flex items-center gap-1 hover:text-white">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {post.commentCount}
                        </span>
                        <span className="flex items-center gap-1 hover:text-teal-400">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {post.voteCount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manual Moderation Details Overlay Dialog for testing */}
      {(activeModdingPost || activeModdingComment) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="modding-modal">
          <div className="w-full max-w-sm bg-slate-905 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-1.5">
              <Flag className="text-red-400 w-4 h-4" />
              Toggle Moderation redaction
            </h3>

            <div className="space-y-4">
              <p className="text-slate-400 text-xs leading-relaxed">
                As a designated community moderator, you can blur the text copy of this item and publish guidelines infraction notices for public view.
              </p>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                  Censor reason / policy ticket
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Unsolicited advertisement, toxic content."
                  value={modReason}
                  onChange={(e) => setModReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-color-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    if (activeModdingPost) {
                      handleModeratePost(false);
                    } else {
                      handleModerateComment(false);
                    }
                  }}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  Clear Censor
                </button>
                <button
                  onClick={() => {
                    if (activeModdingPost) {
                      handleModeratePost(true);
                    } else {
                      handleModerateComment(true);
                    }
                  }}
                  className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  Apply Redaction
                </button>
              </div>

              <button
                onClick={() => { setActiveModdingPost(null); setActiveModdingComment(null); setModReason(""); }}
                className="w-full text-center text-slate-500 hover:text-slate-300 text-xs font-medium pt-1 block cursor-pointer"
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUserIdForModal && (
        <UserProfileModal
          userId={selectedUserIdForModal}
          currentUser={currentUser}
          onClose={() => setSelectedUserIdForModal(null)}
          onStartDM={(otherUserId) => {
            window.dispatchEvent(new CustomEvent("start_dm", { detail: otherUserId }));
          }}
        />
      )}
    </div>
  );
}
