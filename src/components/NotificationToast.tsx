import { useEffect, useState } from "react";
import { Bell, X, Sparkles, MessageSquare } from "lucide-react";
import { AppNotification } from "../types";

interface NotificationToastProps {
  currentUser: any;
}

export default function NotificationToast({ currentUser }: NotificationToastProps) {
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  useEffect(() => {
    const handleNotificationEvent = (e: any) => {
      const { type, detail } = e;
      if (type === "notification") {
        const notif = detail as AppNotification;
        // Only toast if meant for currentUser
        if (notif.userId === currentUser.id) {
          setActiveToast(notif);
          
          // Audio chime fallback (play if native, does not block if not allowed)
          try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, context.currentTime); // D5
            osc.frequency.setValueAtTime(880, context.currentTime + 0.1); // A5
            gain.gain.setValueAtTime(0.04, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(context.destination);
            osc.start();
            osc.stop(context.currentTime + 0.4);
          } catch (err) {
            // silent fail if audio context blocked or disallowed
          }

          // Reset toast after 5 seconds
          const timer = setTimeout(() => {
            setActiveToast(null);
          }, 5000);
          return () => clearTimeout(timer);
        }
      }
    };

    window.addEventListener("sse:notification_event", handleNotificationEvent);
    return () => {
      window.removeEventListener("sse:notification_event", handleNotificationEvent);
    };
  }, [currentUser]);

  if (!activeToast) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 animate-bounce max-w-sm w-full bg-slate-900 border border-teal-500/40 rounded-2xl p-4 shadow-2xl flex items-start gap-3 select-none"
      id="live-toast-notification"
    >
      <div className="p-2 bg-gradient-to-tr from-teal-500 to-indigo-500 rounded-xl flex items-center justify-center shrink-0">
        {activeToast.type === "reply" ? (
          <MessageSquare className="w-5 h-5 text-white" />
        ) : (
          <Bell className="w-5 h-5 text-white animate-ring" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-white flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          {activeToast.title}
        </h4>
        <p className="text-slate-300 text-[11px] leading-relaxed mt-1 break-words">
          {activeToast.body}
        </p>
        <span className="text-[9px] text-slate-500 font-mono mt-1 block">
          Just now
        </span>
      </div>

      <button 
        onClick={() => setActiveToast(null)}
        className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
