import * as React from "react"
import { cn } from "@/lib/utils"

const ChartContainer = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("w-full h-full", className)} {...props}>
    {children}
  </div>
))
ChartContainer.displayName = "ChartContainer"

export { ChartContainer } 