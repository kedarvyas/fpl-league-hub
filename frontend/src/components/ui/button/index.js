import * as React from "react"
import { cn } from "../../../lib/utils";

const buttonVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary-darker",
  secondary: "bg-muted text-muted-foreground hover:bg-muted/80",
  outline: "border border-border bg-transparent hover:bg-muted text-foreground",
  ghost: "hover:bg-muted text-foreground",
}

const buttonSizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3 text-sm",
  lg: "h-11 px-8 text-lg",
}

const Button = React.forwardRef(({
  className,
  variant = "default",
  size = "default",
  disabled,
  ...props
}, ref) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      ref={ref}
      disabled={disabled}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }