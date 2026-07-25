import { cn } from "../../lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("rounded-xl bg-gradient-to-r from-[rgba(11,30,58,0.5)] via-[rgba(74,158,255,0.1)] to-[rgba(11,30,58,0.5)] bg-[length:200%_100%] animate-pulse", className)}
      {...props}
    />
  );
}

export { Skeleton };
