import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, actionLabel, onAction, onDismiss, duration = 5000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 300); }, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  return (
    <div className={`
      fixed bottom-6 right-1/2 translate-x-1/2 z-50
      flex items-center gap-3 bg-stone-900 text-white text-sm
      px-4 py-3 rounded-xl shadow-xl
      transition-all duration-300
      ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
    `}>
      <span className="font-light">{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={() => { onAction(); setVisible(false); setTimeout(onDismiss, 300); }}
          className="text-amber-400 font-semibold hover:text-amber-300 transition-colors shrink-0"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
