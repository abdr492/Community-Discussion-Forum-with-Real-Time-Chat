import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { 
  User, Channel, ChatMessage, ForumPost, ForumComment, 
  AppNotification, PresenceStatus, UserRole 
} from "./src/types.js"; // Use TS extensions or CJS build imports appropriately in server

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up server-state variables in memory (resets on reload, acts as durable live DB in context)
let users: User[] = [
  {
    id: "alice_mod",
    username: "alice_moderator",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    role: "moderator",
    status: "online",
    customStatus: "Keeping the hub tidy ✨",
    lastActive: new Date().toISOString()
  },
  {
    id: "bob_dev",
    username: "bob_codes",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    role: "user",
    status: "online",
    customStatus: "React 19 & Vite 6 is amazing ⚛️",
    lastActive: new Date().toISOString()
  },
  {
    id: "charlie_fox",
    username: "charlie_creativ",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    role: "user",
    status: "online",
    customStatus: "Building and vector styling!",
    lastActive: new Date().toISOString()
  },
  {
    id: "diana_ux",
    username: "diana_ux",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    role: "user",
    status: "online",
    customStatus: "Polishing some Figma vector components 🎨",
    lastActive: new Date().toISOString()
  },
  {
    id: "ethan_rust",
    username: "ethan_rust",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    role: "user",
    status: "idle",
    customStatus: "Writing compile-safe system engines 🦀",
    lastActive: new Date().toISOString()
  },
  {
    id: "fiona_ai",
    username: "fiona_ai",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    role: "user",
    status: "online",
    customStatus: "Fine-tuning localized sentiment models 🧠",
    lastActive: new Date().toISOString()
  },
  {
    id: "george_stack",
    username: "george_stack",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    role: "user",
    status: "offline",
    customStatus: "Walking the dog - back in a bit! 🐕",
    lastActive: new Date().toISOString()
  },
  {
    id: "hannah_qa",
    username: "hannah_qa",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    role: "user",
    status: "online",
    customStatus: "Filing high-priority bug reports 🐛",
    lastActive: new Date().toISOString()
  }
];

let channels: Channel[] = [
  { id: "general", name: "general", description: "General chatter, memes, and casual conversation." },
  { id: "announcements", name: "announcements", description: "Official updates, news, and guidelines for the community." },
  { id: "dev-talk", name: "dev-talk", description: "Code snippets, programming languages, and tech stacks." },
  { id: "ideas-feedback", name: "ideas-feedback", description: "Got requests? Voice them here to improve Community Hub." }
];

let chatMessages: ChatMessage[] = [
  // #general channel history
  {
    id: "msg_g1",
    roomId: "general",
    userId: "alice_mod",
    username: "alice_moderator",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    text: "Welcome to our live general chat! Feel free to talk about anything.",
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    isModerated: false
  },
  {
    id: "msg_g2",
    roomId: "general",
    userId: "bob_dev",
    username: "bob_codes",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    text: "Thanks Alice! Excited to test this out. The SSE real-time sync is incredibly snappy.",
    timestamp: new Date(Date.now() - 3600000 * 4.8).toISOString(),
    isModerated: false
  },
  {
    id: "msg_g3",
    roomId: "general",
    userId: "charlie_fox",
    username: "charlie_creativ",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    text: "Loving this dark slate terminal look. Spacing looks really professional and easy on the eyes.",
    timestamp: new Date(Date.now() - 3600000 * 4.5).toISOString(),
    isModerated: false
  },
  {
    id: "msg_g4",
    roomId: "general",
    userId: "diana_ux",
    username: "diana_ux",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    text: "Thanks Charlie! We spent yesterday polishing the layout grids. Minimal margins are the key.",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    isModerated: false
  },
  {
    id: "msg_g5",
    roomId: "general",
    userId: "hannah_qa",
    username: "hannah_qa",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    text: "Ran quick automated testing. Key transitions and sidebar navigations load under 15ms. Good work dev team!",
    timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    isModerated: false
  },
  {
    id: "msg_g6",
    roomId: "general",
    userId: "fiona_ai",
    username: "fiona_ai",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    text: "Has anyone tried the Compliance Lab? Check out how the model detects toxicity live or falls back gracefully.",
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    isModerated: false
  },
  {
    id: "msg_g7",
    roomId: "general",
    userId: "bob_dev",
    username: "bob_codes",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    text: "I did! Tested a standard greeting vs some restricted system words. The regex dictionary fallbacks are clever.",
    timestamp: new Date(Date.now() - 3600000 * 2.8).toISOString(),
    isModerated: false
  },

  // #announcements history
  {
    id: "msg_a1",
    roomId: "announcements",
    userId: "alice_mod",
    username: "alice_moderator",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    text: "System Note: Please stick to constructive and friendly behavior in all rooms. AI moderation checks are live! 🛡️",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    isModerated: false
  },
  {
    id: "msg_a2",
    roomId: "announcements",
    userId: "alice_mod",
    username: "alice_moderator",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    text: "🚀 Server Upgrade complete! All dynamic backend TypeScript modules now bundle via automated esbuild streams into dist/server.cjs. Build speeds have dropped to under 1.5 seconds.",
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    isModerated: false
  },
  {
    id: "msg_a3",
    roomId: "announcements",
    userId: "ethan_rust",
    username: "ethan_rust",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    text: "Instant bundle releases are the holy grail. Keep backend startup logic low-cost!",
    timestamp: new Date(Date.now() - 3600000 * 16).toISOString(),
    isModerated: false
  },

  // #dev-talk history
  {
    id: "msg_d1",
    roomId: "dev-talk",
    userId: "ethan_rust",
    username: "ethan_rust",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    text: "Who has successfully migrated their custom components to utilize native React 19 Client Actions? 🦀",
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    isModerated: false
  },
  {
    id: "msg_d2",
    roomId: "dev-talk",
    userId: "bob_dev",
    username: "bob_codes",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    text: "I spent all morning moving some form handlers over to `useActionState`. It tracks pending states natively, which saves throwing `isLoading` booleans everywhere.",
    timestamp: new Date(Date.now() - 3600000 * 7.5).toISOString(),
    isModerated: false
  },
  {
    id: "msg_d3",
    roomId: "dev-talk",
    userId: "fiona_ai",
    username: "fiona_ai",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    text: "Exactly. It acts as an atomic transaction block. Pair it with browser Optimistic Updates and the UI feels completely immediate.",
    timestamp: new Date(Date.now() - 3600000 * 7).toISOString(),
    isModerated: false
  },
  {
    id: "msg_d4",
    roomId: "dev-talk",
    userId: "charlie_fox",
    username: "charlie_creativ",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    text: "Is anyone seeing issues with postcss packages on Tailwind v4? Or should we just adopt native CSS imports?",
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    isModerated: false
  },
  {
    id: "msg_d5",
    roomId: "dev-talk",
    userId: "diana_ux",
    username: "diana_ux",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    text: "Highly recommend native CSS imports in Tailwind v4. The `@theme` block allows configuring variables without writing any Javascript config.",
    timestamp: new Date(Date.now() - 3600000 * 5.5).toISOString(),
    isModerated: false
  },

  // #ideas-feedback history
  {
    id: "msg_f1",
    roomId: "ideas-feedback",
    userId: "charlie_fox",
    username: "charlie_creativ",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    text: "Can we get custom user profiles or status messages on the sidebar?",
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    isModerated: false
  },
  {
    id: "msg_f2",
    roomId: "ideas-feedback",
    userId: "alice_mod",
    username: "alice_moderator",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    text: "Fabulous idea! Just added custom text statuses so people can see what everyone's currently coding.",
    timestamp: new Date(Date.now() - 3600000 * 11.5).toISOString(),
    isModerated: false
  },
  {
    id: "msg_f3",
    roomId: "ideas-feedback",
    userId: "diana_ux",
    username: "diana_ux",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    text: "We should also restrict custom status strings to 35 characters so they don't leak or break the sidebar columns on mobile screens.",
    timestamp: new Date(Date.now() - 3600000 * 11).toISOString(),
    isModerated: false
  },

  // PRE-LOADED DIRECT MESSAGES
  // 1. alice_mod <-> bob_dev DM Room Id: "alice_mod_bob_dev"
  {
    id: "dm_ab1",
    roomId: "alice_mod_bob_dev",
    userId: "alice_mod",
    username: "alice_moderator",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    text: "Hey Bob, noticed your latest mock-comment in the Compliance Lab. Passed perfectly!",
    timestamp: new Date(Date.now() - 3600000 * 10).toISOString(),
    isModerated: false
  },
  {
    id: "dm_ab2",
    roomId: "alice_mod_bob_dev",
    userId: "bob_dev",
    username: "bob_codes",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    text: "Awesome! Yeah, I wanted to see if the fallback offline model or Gemini API catches semantic intent. The response time is phenomenal.",
    timestamp: new Date(Date.now() - 3600000 * 9.8).toISOString(),
    isModerated: false
  },
  {
    id: "dm_ab3",
    roomId: "alice_mod_bob_dev",
    userId: "alice_mod",
    username: "alice_moderator",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    text: "Exactly. If we ever run dry on API key credits, the fallback dictionary still handles classic offensive words immediately.",
    timestamp: new Date(Date.now() - 3600000 * 9.5).toISOString(),
    isModerated: false
  },

  // 2. alice_mod <-> charlie_fox DM Room Id: "alice_mod_charlie_fox"
  {
    id: "dm_ac1",
    roomId: "alice_mod_charlie_fox",
    userId: "alice_mod",
    username: "alice_moderator",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    text: "Hey Charlie, are the new vector icons for the forums ready?",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    isModerated: false
  },
  {
    id: "dm_ac2",
    roomId: "alice_mod_charlie_fox",
    userId: "charlie_fox",
    username: "charlie_creativ",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    text: "Almost there Alice! Just exporting optimized SVG assets from my workspace. Will post them to announcements shortly.",
    timestamp: new Date(Date.now() - 3600000 * 3.8).toISOString(),
    isModerated: false
  },
  {
    id: "dm_ac3",
    roomId: "alice_mod_charlie_fox",
    userId: "alice_mod",
    username: "alice_moderator",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    text: "Perfect. No rush, just wanted to check alignment.",
    timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    isModerated: false
  },

  // 3. bob_dev <-> diana_ux DM Room Id: "bob_dev_diana_ux"
  {
    id: "dm_bd1",
    roomId: "bob_dev_diana_ux",
    userId: "bob_dev",
    username: "bob_codes",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    text: "Diana, do you have the precise colors for our Chat message containers?",
    timestamp: new Date(Date.now() - 3600000 * 32).toISOString(),
    isModerated: false
  },
  {
    id: "dm_bd2",
    roomId: "bob_dev_diana_ux",
    userId: "diana_ux",
    username: "diana_ux",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    text: "Yes! Let's default to `bg-gradient-to-tr from-teal-500 to-teal-600` for self (it makes names pop), and `bg-slate-800` borders on slate dark for others.",
    timestamp: new Date(Date.now() - 3600000 * 31.8).toISOString(),
    isModerated: false
  },
  {
    id: "dm_bd3",
    roomId: "bob_dev_diana_ux",
    userId: "bob_dev",
    username: "bob_codes",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    text: "Phenomenal. Fits our clean night-slate look flawlessly.",
    timestamp: new Date(Date.now() - 3600000 * 31.5).toISOString(),
    isModerated: false
  },

  // 4. ethan_rust <-> fiona_ai DM Room Id: "ethan_rust_fiona_ai"
  {
    id: "dm_ef1",
    roomId: "ethan_rust_fiona_ai",
    userId: "ethan_rust",
    username: "ethan_rust",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    text: "Fiona, are we hosting the baseline sentiment analysis filter locally on Express, or do we proxy it?",
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    isModerated: false
  },
  {
    id: "dm_ef2",
    roomId: "ethan_rust_fiona_ai",
    userId: "fiona_ai",
    username: "fiona_ai",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    text: "It is fully hybrid! It matches local badwords with a regex matcher first for instantaneous fallbacks, and triggers Gemini queries asynchronously if API keys exist.",
    timestamp: new Date(Date.now() - 3600000 * 11.5).toISOString(),
    isModerated: false
  },
  {
    id: "dm_ef3",
    roomId: "ethan_rust_fiona_ai",
    userId: "ethan_rust",
    username: "ethan_rust",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    text: "Nice job. Resilient offline logic prevents server cascade crashes.",
    timestamp: new Date(Date.now() - 3600000 * 11).toISOString(),
    isModerated: false
  }
];

let forumPosts: ForumPost[] = [
  {
    id: "post_1",
    title: "Welcome to Council Hub Forum! Guidelines & Info",
    content: "We are thrilled to launch this unified forum. Share detailed articles, ask engineering questions, vote on interesting threads, and coordinate live with team members down in the instant chat rooms! Please follow common etiquette and flag spam immediately.\n\nEnjoy your stay!",
    authorId: "alice_mod",
    authorName: "alice_moderator",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    tags: ["meta", "announcements", "welcome"],
    votes: { "bob_dev": "up", "charlie_fox": "up" },
    voteCount: 2,
    isModerated: false,
    isPinned: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    commentCount: 2
  },
  {
    id: "post_2",
    title: "Thoughts on React 19 and Vite integration?",
    content: "Now that React 19 is fully integrated into modern standard tooling, has anyone started building large platforms with Vite? The compilation speed and Hot Module Replacement make the dev state extremely interactive. Also excited for native asset loading features!\n\nWhat are your thoughts or challenges you've faced?",
    authorId: "bob_dev",
    authorName: "bob_codes",
    authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    tags: ["react", "vite", "frontend"],
    votes: { "charlie_fox": "up", "alice_mod": "up" },
    voteCount: 2,
    isModerated: false,
    isPinned: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hrs ago
    commentCount: 1
  },
  {
    id: "post_3",
    title: "Advanced Tailwind v4 Custom Themes Configuration 🎨",
    content: "Tailwind v4 is a paradigm shift. Unlike traditional versions where we configure javascript objects in custom tailwind.config.js files, v4 moves configuration entirely into standard CSS.\n\nWe can use the @theme directive directly in our src/index.css file! This makes styles compile natively via rust-powered engines.\n\nHere is how we set up custom shades:\n```css\n@theme {\n  --color-primary-teal: #14b8a6;\n  --color-brand-slate: #0f172a;\n}\n```\nWhat are your thoughts on this css-first configuration model?",
    authorId: "diana_ux",
    authorName: "diana_ux",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    tags: ["css", "tailwind", "design"],
    votes: { "bob_dev": "up", "charlie_fox": "up", "fiona_ai": "up" },
    voteCount: 3,
    isModerated: false,
    isPinned: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    commentCount: 2
  },
  {
    id: "post_4",
    title: "Rust & WebAssembly vs. Custom JS Loops for High-Performance Math 🦀",
    content: "I've been benchmarking raw dataset compilation speeds for recursive search trees in the client browser.\n\nConverting Rust to WebAssembly with wasm-bindgen yielded a massive 8x computational duration drop compared to standard JS map/filter loops!\n\nIf you are doing heavy audio processing, webgl arrays, or complex charts rendering, highly recommend introducing WASM targets.\n\nHappy to share some boilerplate code if any projects need optimization!",
    authorId: "ethan_rust",
    authorName: "ethan_rust",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    tags: ["rust", "wasm", "perf"],
    votes: { "bob_dev": "up", "fiona_ai": "up", "hannah_qa": "up" },
    voteCount: 3,
    isModerated: false,
    isPinned: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
    commentCount: 2
  },
  {
    id: "post_5",
    title: "Micro-frontends or Monolith: Drawing the line for small teams",
    content: "We are spinning up an MVP with 5 frontend engineers. The management requested breaking the app into micro-frontends (using remote module federation and independent deployment buckets).\n\nPersonally, I feel micro-frontends introduce infinite network testing overhead for a small team, and a standard modular monorepo is far more ideal.\n\nWhere do you usually draw the scale boundary?",
    authorId: "george_stack",
    authorName: "george_stack",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    tags: ["architecture", "management", "opinion"],
    votes: { "alice_mod": "up", "hannah_qa": "up" },
    voteCount: 2,
    isModerated: false,
    isPinned: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    commentCount: 2
  }
];

let forumComments: ForumComment[] = [
  {
    id: "comment_1",
    postId: "post_1",
    content: "Awesome startup! The seamless transition between forum posts and persistent live chat makes discussion flow much better than split apps.",
    authorId: "bob_dev",
    authorName: "bob_codes",
    authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    isModerated: false
  },
  {
    id: "comment_2",
    postId: "post_1",
    content: "Indeed, I am already writing reviews for it under other project specs.",
    authorId: "charlie_fox",
    authorName: "charlie_creativ",
    authorAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    isModerated: false
  },
  {
    id: "comment_3",
    postId: "post_2",
    content: "Yes! The type stripping support and build bundle formats with esbuild are just incredible.",
    authorId: "charlie_fox",
    authorName: "charlie_creativ",
    authorAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    isModerated: false
  },

  // Post 3 (Tailwind v4) comments
  {
    id: "comment_t4_1",
    postId: "post_3",
    content: "At first I missed the JS configuration format, but once you start utilizing standard CSS variables directly inside custom styled components, it's a huge win.",
    authorId: "bob_dev",
    authorName: "bob_codes",
    authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    isModerated: false
  },
  {
    id: "comment_t4_2",
    postId: "post_3",
    content: "Exactly! And it completely removes slow webpack/postcss bundle plugins. The native lightningcss parser handles it inmicroseconds.",
    authorId: "fiona_ai",
    authorName: "fiona_ai",
    authorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    isModerated: false
  },

  // Post 4 (Rust WASM) comments
  {
    id: "comment_w4_1",
    postId: "post_4",
    content: "Are there any memory leak or page freezing concerns when passing huge data matrices across the JS-to-WASM bridge?",
    authorId: "hannah_qa",
    authorName: "hannah_qa",
    authorAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 15).toISOString(),
    isModerated: false
  },
  {
    id: "comment_w4_2",
    postId: "post_4",
    content: "Good catch. You have to allocate and free linear memory buffers appropriately. However, standard toolchains like wasm-bindgen encapsulate this safely in modern wrappers to prevent standard memory allocation leak pitfalls.",
    authorId: "ethan_rust",
    authorName: "ethan_rust",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    isModerated: false
  },

  // Post 5 (Micro-frontends) comments
  {
    id: "comment_m5_1",
    postId: "post_5",
    content: "Definitely hold off on micro-frontends for 5 developers! That team size is the golden sweet spot for a single high-efficiency monolith. Avoid deployment bloat.",
    authorId: "hannah_qa",
    authorName: "hannah_qa",
    authorAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 19).toISOString(),
    isModerated: false
  },
  {
    id: "comment_m5_2",
    postId: "post_5",
    content: "Seconded. Unless you have 40+ devs divided into completely independent product verticals, micro-frontends introduce massive dev bottlenecks.",
    authorId: "alice_mod",
    authorName: "alice_moderator",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    isModerated: false
  }
];

let notifications: AppNotification[] = [];

// Realtime SSE connected clients list
interface SSEClient {
  id: string;
  userId: string;
  res: any;
}
let sseClients: SSEClient[] = [];

// Helper to broadcast events to all connected clients
function broadcastRealtime(event: string, data: any, targetUserId?: string) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    if (targetUserId && client.userId !== targetUserId) {
      return;
    }
    client.res.write(payload);
  });
}

// Lazy Gemini API wrapper for Auto-Moderation
let geminiClientCache: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClientCache) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      geminiClientCache = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
  }
  return geminiClientCache;
}

// Moderation flag checker helper (returns toxic flag and reasoning)
async function evaluateContentModeration(text: string): Promise<{ isToxic: boolean; reason: string }> {
  const lowercaseText = text.toLowerCase();
  
  // Resilient fallback logic (Offline/No-Key rule checker)
  const blockWords = ["profanityword", "fucking", "shit", "bastard", "toxicspam", "nigger", "cunt", "kill yourself"];
  for (const word of blockWords) {
    if (lowercaseText.includes(word)) {
      return { isToxic: true, reason: `Contained restricted word: "${word}" (Local Policy Match)` };
    }
  }

  // If Gemini client is online, run advanced sentiment and toxicity evaluation
  const ai = getGeminiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are an AI Moderator. Evaluate if the following community message violates common safety standards (harassment, extreme profanity, threatening speech, hate speech, or dangerous self-harm advice). Return a strict JSON response.
Schema:
{
  "violates": boolean,
  "reason": "short explanation of breach or OK"
}

Message to evaluate:
"${text}"`,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const parsed = JSON.parse(response.text || "{}");
      return {
        isToxic: !!parsed.violates,
        reason: parsed.reason || "AI evaluated compliance"
      };
    } catch (err) {
      console.error("Gemini moderation query failed, falling back to basic checks:", err);
    }
  }

  return { isToxic: false, reason: "Passed basic semantic filters." };
}

// API Routes

// Real-Time SSE Setup
app.get("/api/realtime", (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ error: "Missing userId query parameter" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  res.write("\n");

  const connectionId = Math.random().toString(36).substring(2, 9);
  const newClient: SSEClient = { id: connectionId, userId, res };
  sseClients.push(newClient);

  // Set user as online immediately
  const user = users.find(u => u.id === userId);
  if (user) {
    user.status = "online";
    user.lastActive = new Date().toISOString();
    broadcastRealtime("presence_update", users);
  }

  req.on("close", () => {
    sseClients = sseClients.filter(c => c.id !== connectionId);
    
    // Check if user has no other active tabs before marking offline
    const remainingTabs = sseClients.some(c => c.userId === userId);
    if (!remainingTabs) {
      const userToUpdate = users.find(u => u.id === userId);
      if (userToUpdate) {
        userToUpdate.status = "offline";
        userToUpdate.lastActive = new Date().toISOString();
        broadcastRealtime("presence_update", users);
      }
    }
  });
});

// Auth Routes
app.post("/api/auth/login", (req, res) => {
  const { username, avatarUrl, role } = req.body;
  if (!username) {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "_");
  let user = users.find(u => u.username === cleanUsername);

  if (user) {
    user.status = "online";
    if (avatarUrl) user.avatarUrl = avatarUrl;
    if (role && (role === "moderator" || role === "user")) {
      user.role = role;
    }
    user.lastActive = new Date().toISOString();
  } else {
    user = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      username: cleanUsername,
      avatarUrl: avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
      role: role || "user",
      status: "online",
      lastActive: new Date().toISOString()
    };
    users.push(user);
  }

  // Push system notification for newly logged users
  const welcomeNotif: AppNotification = {
    id: "notif_" + Math.random().toString(36).substring(2, 9),
    userId: user.id,
    type: "system",
    title: "Welcome aboard!",
    body: `Welcome to Community Hub, @${user.username}! Explore forums or send messages in #general.`,
    link: "/chat",
    isRead: false,
    timestamp: new Date().toISOString()
  };
  notifications.push(welcomeNotif);

  broadcastRealtime("presence_update", users);
  res.json({ user, notification: welcomeNotif });
});

app.get("/api/users", (req, res) => {
  res.json(users);
});

app.post("/api/users/status", (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { status, customStatus } = req.body;
  
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (status) user.status = status as PresenceStatus;
  if (customStatus !== undefined) user.customStatus = customStatus;
  user.lastActive = new Date().toISOString();

  broadcastRealtime("presence_update", users);
  res.json(user);
});

// Notifications
app.get("/api/notifications", (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userNotifs = notifications.filter(n => n.userId === userId);
  res.json(userNotifs);
});

app.post("/api/notifications/:id/read", (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (id === "all") {
    notifications = notifications.map(n => n.userId === userId ? { ...n, isRead: true } : n);
  } else {
    notifications = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
  }

  res.json({ success: true });
});

// Forum Posts Routes
app.get("/api/forum/posts", (req, res) => {
  const search = req.query.search as string;
  const tag = req.query.tag as string;

  let filtered = [...forumPosts];

  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(term) || 
      p.content.toLowerCase().includes(term)
    );
  }

  if (tag) {
    filtered = filtered.filter(p => p.tags.includes(tag.toLowerCase()));
  }

  // Sort pinned first, then newest
  filtered.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  res.json(filtered);
});

app.get("/api/forum/posts/:id", (req, res) => {
  const post = forumPosts.find(p => p.id === req.params.id);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(post);
});

app.post("/api/forum/posts", async (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { title, content, tags } = req.body;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (!title || !content) {
    res.status(400).json({ error: "Title and content are required" });
    return;
  }

  // Evaluate content moderation online / offline
  const modResultTitle = await evaluateContentModeration(title);
  const modResultContent = await evaluateContentModeration(content);

  const isViolating = modResultTitle.isToxic || modResultContent.isToxic;
  const reason = modResultTitle.isToxic ? modResultTitle.reason : modResultContent.reason;

  const newPost: ForumPost = {
    id: "post_" + Math.random().toString(36).substring(2, 9),
    title,
    content,
    authorId: user.id,
    authorName: user.username,
    authorAvatar: user.avatarUrl,
    tags: Array.isArray(tags) ? tags.map(t => t.trim().toLowerCase()) : [],
    votes: {},
    voteCount: 0,
    isModerated: isViolating,
    moderationReason: isViolating ? reason : undefined,
    isPinned: false,
    timestamp: new Date().toISOString(),
    commentCount: 0,
    poll: req.body.poll && Array.isArray(req.body.poll.options) && req.body.poll.question ? {
      question: req.body.poll.question,
      options: req.body.poll.options.filter((opt: string) => opt.trim() !== "").map((opt: string, optIdx: number) => ({
        id: `opt_${optIdx}_` + Math.random().toString(36).substring(2, 5),
        text: opt.trim(),
        votes: []
      }))
    } : undefined
  };

  forumPosts.push(newPost);
  broadcastRealtime("forum:post_created", newPost);

  res.json(newPost);
});

app.post("/api/forum/posts/:id/poll/vote", (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { optionId } = req.body;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const post = forumPosts.find(p => p.id === id);
  if (!post || !post.poll) {
    res.status(404).json({ error: "Post or poll not found" });
    return;
  }

  // Clear user's vote on any existing options for this poll
  post.poll.options.forEach(opt => {
    opt.votes = opt.votes.filter(uid => uid !== userId);
  });

  // Add user's vote to the selected option
  const selectedOption = post.poll.options.find(opt => opt.id === optionId);
  if (selectedOption) {
    selectedOption.votes.push(userId);
  }

  broadcastRealtime("forum:poll_updated", { postId: post.id, poll: post.poll });
  res.json(post);
});

app.post("/api/forum/posts/:id/vote", (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { type } = req.body; // 'up' | 'down' | null
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const post = forumPosts.find(p => p.id === id);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (type === "up") {
    post.votes[userId] = "up";
  } else if (type === "down") {
    post.votes[userId] = "down";
  } else {
    delete post.votes[userId];
  }

  // Re-calculate vote count sum
  let count = 0;
  Object.values(post.votes).forEach(v => {
    if (v === "up") count++;
    if (v === "down") count--;
  });
  post.voteCount = count;

  broadcastRealtime("forum:vote_updated", { postId: post.id, voteCount: post.voteCount, votes: post.votes });
  res.json(post);
});

// Moderation Pin & Flags
app.post("/api/forum/posts/:id/pin", (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = users.find(u => u.id === userId);
  if (!user || user.role !== "moderator") {
    res.status(403).json({ error: "Forbidden: Moderators only" });
    return;
  }

  const post = forumPosts.find(p => p.id === id);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  post.isPinned = !post.isPinned;
  broadcastRealtime("forum:post_updated", post);
  res.json(post);
});

app.post("/api/forum/posts/:id/moderate", (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { flag, reason } = req.body; // boolean, string
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = users.find(u => u.id === userId);
  if (!user || user.role !== "moderator") {
    res.status(403).json({ error: "Forbidden: Moderators only" });
    return;
  }

  const post = forumPosts.find(p => p.id === id);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  post.isModerated = !!flag;
  post.moderationReason = flag ? (reason || "Manually moderated by admin.") : undefined;

  broadcastRealtime("forum:post_updated", post);
  res.json(post);
});

// Comments Routes
app.get("/api/forum/posts/:postId/comments", (req, res) => {
  const comments = forumComments.filter(c => c.postId === req.params.postId);
  res.json(comments);
});

app.post("/api/forum/posts/:postId/comments", async (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { content } = req.body;
  const { postId } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const post = forumPosts.find(p => p.id === postId);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (!content) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const modResult = await evaluateContentModeration(content);

  const newComment: ForumComment = {
    id: "comment_" + Math.random().toString(36).substring(2, 9),
    postId,
    content,
    authorId: user.id,
    authorName: user.username,
    authorAvatar: user.avatarUrl,
    timestamp: new Date().toISOString(),
    isModerated: modResult.isToxic,
    moderationReason: modResult.isToxic ? modResult.reason : undefined
  };

  forumComments.push(newComment);

  // Increment post comment count
  post.commentCount = forumComments.filter(c => c.postId === postId).length;

  // Notify post author if different user
  if (post.authorId !== user.id) {
    const replyNotif: AppNotification = {
      id: "notif_" + Math.random().toString(36).substring(2, 9),
      userId: post.authorId,
      type: "reply",
      title: "New reply on your post",
      body: `@${user.username} commented: "${content.substring(0, 40)}${content.length > 40 ? "..." : ""}"`,
      link: `/forums/post/${post.id}`,
      isRead: false,
      timestamp: new Date().toISOString()
    };
    notifications.push(replyNotif);
    broadcastRealtime("notification", replyNotif);
  }

  broadcastRealtime("forum:comment_created", { comment: newComment, post });
  res.json(newComment);
});

app.post("/api/forum/comments/:id/moderate", (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { flag, reason } = req.body;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = users.find(u => u.id === userId);
  if (!user || user.role !== "moderator") {
    res.status(403).json({ error: "Forbidden: Moderators only" });
    return;
  }

  const comment = forumComments.find(c => c.id === id);
  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  comment.isModerated = !!flag;
  comment.moderationReason = flag ? (reason || "Manually moderated by admin.") : undefined;

  broadcastRealtime("forum:comment_updated", comment);
  res.json(comment);
});

// Chat Channels Routes
app.get("/api/chat/channels", (req, res) => {
  res.json(channels);
});

app.post("/api/chat/channels", (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { name, description } = req.body;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!name) {
    res.status(400).json({ error: "Channel name is required" });
    return;
  }

  const cleanName = name.trim().toLowerCase().replace(/\s+/g, "-");
  const exists = channels.some(c => c.name === cleanName);
  if (exists) {
    res.status(400).json({ error: "Channel already exists" });
    return;
  }

  const newChannel: Channel = {
    id: cleanName,
    name: cleanName,
    description: description || ""
  };

  channels.push(newChannel);
  broadcastRealtime("chat:channel_created", newChannel);
  res.json(newChannel);
});

app.get("/api/chat/channels/:channelId/messages", (req, res) => {
  const messages = chatMessages.filter(m => m.roomId === req.params.channelId);
  res.json(messages);
});

app.post("/api/chat/channels/:channelId/messages", async (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { text } = req.body;
  const { channelId } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (!text) {
    res.status(400).json({ error: "Message text is required" });
    return;
  }

  const modResult = await evaluateContentModeration(text);

  const newMessage: ChatMessage = {
    id: "msg_" + Math.random().toString(36).substring(2, 9),
    roomId: channelId,
    userId: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    text,
    timestamp: new Date().toISOString(),
    isModerated: modResult.isToxic,
    moderationReason: modResult.isToxic ? modResult.reason : undefined
  };

  chatMessages.push(newMessage);
  broadcastRealtime("chat:message", newMessage);
  res.json(newMessage);
});

// DMs Direct Messaging Routes
app.get("/api/chat/direct/:recipientId/messages", (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { recipientId } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Create deterministic DM roomId: e.g. "usr1_usr2" sorted alphabetically
  const dmRoomId = [userId, recipientId].sort().join("_");
  const messages = chatMessages.filter(m => m.roomId === dmRoomId);
  res.json(messages);
});

app.post("/api/chat/direct/:recipientId/messages", async (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { text } = req.body;
  const { recipientId } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = users.find(u => u.id === userId);
  const recipient = users.find(u => u.id === recipientId);
  if (!user || !recipient) {
    res.status(404).json({ error: "User or recipient not found" });
    return;
  }

  if (!text) {
    res.status(400).json({ error: "Message text is required" });
    return;
  }

  const dmRoomId = [userId, recipientId].sort().join("_");
  const modResult = await evaluateContentModeration(text);

  const newMessage: ChatMessage = {
    id: "msg_" + Math.random().toString(36).substring(2, 9),
    roomId: dmRoomId,
    userId: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    text,
    timestamp: new Date().toISOString(),
    isModerated: modResult.isToxic,
    moderationReason: modResult.isToxic ? modResult.reason : undefined
  };

  chatMessages.push(newMessage);
  broadcastRealtime("chat:message", newMessage);

  // Send DM alert notification to recipient in real-time
  const dmNotif: AppNotification = {
    id: "notif_" + Math.random().toString(36).substring(2, 9),
    userId: recipientId,
    type: "dm",
    title: `New DM from @${user.username}`,
    body: text.substring(0, 45) + (text.length > 45 ? "..." : ""),
    link: `/chat/dm/${user.id}`,
    isRead: false,
    timestamp: new Date().toISOString()
  };
  notifications.push(dmNotif);
  broadcastRealtime("notification", dmNotif);

  res.json(newMessage);
});

// Typing Indicator
app.post("/api/chat/typing", (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { roomId, isTyping } = req.body; // string, boolean

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  broadcastRealtime("chat:typing", {
    userId: user.id,
    username: user.username,
    roomId,
    isTyping
  });

  res.json({ success: true });
});

// Explicit AI moderation test tool endpoint
app.post("/api/moderation/ai-check", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: "Text is required to run moderation check" });
    return;
  }

  const evaluation = await evaluateContentModeration(text);
  res.json({ text, ...evaluation, geminiActive: !!getGeminiClient() });
});

// Integration with Vite inside Development, fallback to Static production
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Community Hub Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
