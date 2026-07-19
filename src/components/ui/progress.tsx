"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  value?: number
  max?: number
}) {
  return (
    <ProgressPrimitive.Root
      value={value}
      max={max}
      data-slot="progress"
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Track className="h-full w-full bg-muted">
        <ProgressPrimitive.Indicator
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
