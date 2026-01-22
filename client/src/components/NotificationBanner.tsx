import { useState, useEffect } from "react";
import { Bell, X, TrendingUp, TrendingDown, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TradingPair } from "@shared/schema";

interface SimpleSignal {
  id: string;
  pair: TradingPair;
  signal: 'BUY' | 'SELL' | 'NO_TRADE';
  confidence: number;
  exitWindowMinutes?: number;
}

interface Notification {
  id: string;
  type: 'signal' | 'alert' | 'price';
  title: string;
  message: string;
  timestamp: number;
  pair?: TradingPair;
  signal?: 'BUY' | 'SELL';
}

interface NotificationBannerProps {
  signal?: SimpleSignal | null;
  previousSignal?: SimpleSignal | null;
  pair: TradingPair;
}

export function NotificationBanner({ signal, previousSignal, pair }: NotificationBannerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if signal changed
    if (signal && previousSignal) {
      if (signal.signal !== previousSignal.signal && signal.signal !== 'NO_TRADE') {
        const newNotification: Notification = {
          id: `signal-${Date.now()}`,
          type: 'signal',
          title: `New ${signal.signal} Signal`,
          message: `${pair} - ${signal.confidence}% confidence - Exit in ${signal.exitWindowMinutes} min`,
          timestamp: Date.now(),
          pair,
          signal: signal.signal as 'BUY' | 'SELL',
        };
        
        setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
        setShowBanner(true);

        // Play notification sound (optional)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`TradeX AI: New ${signal.signal} Signal`, {
            body: newNotification.message,
            icon: '/favicon.ico',
          });
        }
      }
    }
  }, [signal?.id, previousSignal?.id]);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notifications.length <= 1) {
      setShowBanner(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  if (!showBanner || notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm" data-testid="notification-banner">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`p-3 rounded-lg border shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300 ${
            notification.signal === 'BUY' 
              ? 'bg-emerald-500/10 border-emerald-500/30' 
              : notification.signal === 'SELL'
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}
          data-testid={`notification-${notification.id}`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${
              notification.signal === 'BUY' 
                ? 'bg-emerald-500/20' 
                : notification.signal === 'SELL'
                ? 'bg-red-500/20'
                : 'bg-amber-500/20'
            }`}>
              {notification.signal === 'BUY' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
              {notification.signal === 'SELL' && <TrendingDown className="w-4 h-4 text-red-500" />}
              {!notification.signal && <AlertTriangle className="w-4 h-4 text-amber-500" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {notification.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => dismissNotification(notification.id)}
                  data-testid={`button-dismiss-${notification.id}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {notification.message}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationButton() {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setHasPermission(permission === 'granted');
    }
  };

  if (hasPermission) {
    return (
      <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
        <Bell className="w-4 h-4" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
      </Button>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={requestPermission}
      className="text-xs"
      data-testid="button-enable-notifications"
    >
      <Bell className="w-4 h-4 mr-1" />
      Enable Alerts
    </Button>
  );
}
