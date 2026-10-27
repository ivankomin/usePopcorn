import { ShieldCheck, UserCheck, Shield } from "lucide-react";

export interface ProfileRoleBadgeProps {
  role?: string | null;
  className?: string;
}

export function ProfileRoleBadge({
  role = "user",
  className = "",
}: ProfileRoleBadgeProps) {
  const normalizedRole = (role || "user").toLowerCase();

  if (normalizedRole === "admin") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono tracking-wide uppercase bg-brand-lime text-black shadow-xs ${className}`}
      >
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        Admin
      </span>
    );
  }

  if (normalizedRole === "user") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-sans bg-emerald-400 text-black border shadow-xs ${className}`}
      >
        <UserCheck className="w-3.5 h-3.5 shrink-0" />
        Authorized User
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-sans bg-neutral-800 text-neutral-300 border border-neutral-700 shadow-xs ${className}`}
    >
      <Shield className="w-3.5 h-3.5 shrink-0" />
      Guest
    </span>
  );
}
