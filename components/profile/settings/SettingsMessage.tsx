import { CheckCircle2, AlertCircle } from "lucide-react";

export type SettingsMessageType = "success" | "error" | "info";

export interface SettingsMessageData {
  type: SettingsMessageType;
  text: string;
}

export interface SettingsMessageProps {
  message: SettingsMessageData | null;
  className?: string;
}

export function SettingsMessage({ message, className = "" }: SettingsMessageProps) {
  if (!message) return null;

  const colorStyles = {
    success: "text-emerald-400",
    info: "text-blue-300",
    error: "text-red-400",
  }[message.type];

  return (
    <div
      className={`flex items-start gap-2 text-xs px-3.5 py-2.5 rounded-xl ${colorStyles} ${className}`.trim()}
    >
      {message.type === "success" ? (
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      )}
      <span>{message.text}</span>
    </div>
  );
}
