import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer overflow-hidden rounded-xl bg-elevated", className)}
      {...props}
    />
  );
}

export { Skeleton };
