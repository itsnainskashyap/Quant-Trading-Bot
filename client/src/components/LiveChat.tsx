import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

declare global {
  interface Window {
    LC_API?: any;
    __lc?: any;
    LiveChatWidget?: any;
  }
}

const LIVECHAT_LICENSE = "19338530";

function LiveChatLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <rect width="32" height="32" rx="8" fill="#FF5100" />
      <path d="M7 10.5C7 8.567 8.567 7 10.5 7h11C23.433 7 25 8.567 25 10.5v7c0 1.933-1.567 3.5-3.5 3.5H14l-4 4v-4h-.5A3.5 3.5 0 016 17.5v-7z" fill="white" stroke="white" strokeWidth="0.5" transform="translate(0.5,0)" />
    </svg>
  );
}

export function LiveChatWidget() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (document.getElementById("livechat-script")) {
      setLoaded(true);
      return;
    }

    window.__lc = window.__lc || {};
    window.__lc.license = parseInt(LIVECHAT_LICENSE);
    window.__lc.integration_name = "manual_channels";
    window.__lc.product_name = "livechat";

    const script = document.createElement("script");
    script.id = "livechat-script";
    script.async = true;
    script.src = "https://cdn.livechatinc.com/tracking.js";
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);

    return () => {};
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      if (window.LiveChatWidget) {
        window.LiveChatWidget.call("hide");
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [loaded]);

  return null;
}

export function LiveChatBubble() {
  const openChat = () => {
    if (window.LiveChatWidget) {
      window.LiveChatWidget.call("maximize");
    }
  };

  return (
    <button
      onClick={openChat}
      className="fixed bottom-6 right-6 z-50 bg-[#FF5100] hover:bg-[#E64900] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
      data-testid="button-livechat-bubble"
    >
      <LiveChatLogo className="w-7 h-7" />
    </button>
  );
}

export function LiveChatProfileCard() {
  const openChat = () => {
    if (window.LiveChatWidget) {
      window.LiveChatWidget.call("maximize");
    }
  };

  return (
    <button
      onClick={openChat}
      className="w-full flex items-center justify-between group"
      data-testid="button-profile-livechat"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#FF5100]/10 flex items-center justify-center">
          <LiveChatLogo className="w-5 h-5" />
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-white">Live Chat Support</div>
          <div className="text-xs text-gray-500">Chat with our support team</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] text-green-400">Online</span>
      </div>
    </button>
  );
}

export { LiveChatLogo };
