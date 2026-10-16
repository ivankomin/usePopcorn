import { cn } from "@/lib/utils";

export interface LoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export default function Loader({
  size = "md",
  text,
  className,
}: LoaderProps) {
  const sizeMap = {
    sm: { width: "18px", dot: "3.5px" },
    md: { width: "40px", dot: "6px" },
    lg: { width: "54px", dot: "8px" },
  };

  const { width, dot } = sizeMap[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3.5 select-none",
        className
      )}
    >
      <div
        className="css-loader"
        style={{
          width,
          ["--loader-dot" as string]: dot,
        }}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className="text-sm font-medium text-neutral-400 tracking-wide animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}
