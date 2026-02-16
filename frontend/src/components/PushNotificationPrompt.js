import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Bell, X } from "lucide-react";

export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted") {
      setSubscribed(true);
      return;
    }
    if (Notification.permission === "denied") return;

    const dismissed = localStorage.getItem("adop_push_dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShow(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: undefined,
      });

      const subJson = sub.toJSON();
      await api.post("/push/subscribe", {
        endpoint: subJson.endpoint,
        keys: subJson.keys || {},
      });

      setSubscribed(true);
      setShow(false);

      reg.showNotification("AdOperator", {
        body: "Notificações ativadas! Você receberá alertas do radar de tendências.",
        icon: "/icon-192.png",
      });
    } catch {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("adop_push_dismissed", Date.now().toString());
  };

  if (!show || subscribed) return null;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-md p-4 mb-6 animate-fade-in-up" data-testid="push-prompt">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
          <Bell className="h-4 w-4 text-white" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">Ativar notificações</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Receba alertas do radar de tendências e atualizações do seu nicho.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              data-testid="enable-push"
              onClick={handleEnable}
              className="text-xs px-4 py-1.5 rounded-sm bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
            >
              Ativar
            </button>
            <button
              data-testid="dismiss-push"
              onClick={handleDismiss}
              className="text-xs px-3 py-1.5 text-zinc-500 hover:text-white transition-colors"
            >
              Depois
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-zinc-700 hover:text-white transition-colors">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
