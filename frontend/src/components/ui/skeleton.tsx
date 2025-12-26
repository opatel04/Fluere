import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-slate-200/50 dark:bg-slate-800/50",
        "before:absolute before:inset-0",
        "before:-translate-x-full",
        "before:animate-shimmer",
        "before:bg-gradient-to-r",
        "before:from-transparent before:via-slate-200/60 before:to-transparent",
        "dark:before:via-slate-700/60",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
