import * as React from "react"
import { cn } from "../../../lib/utils"

const DropdownMenu = React.forwardRef(({ className, children, ...props }, ref) => {
  const [open, setOpen] = React.useState(false)

  return (
    <div ref={ref} className={cn("relative inline-block text-left", className)} {...props}>
      {React.Children.map(children, child => 
        React.cloneElement(child, { open, setOpen })
      )}
    </div>
  )
})
DropdownMenu.displayName = "DropdownMenu"

const DropdownMenuTrigger = React.forwardRef(({ className, children, open, setOpen, ...props }, ref) => (
  <button
    ref={ref}
    onClick={() => setOpen(!open)}
    className={cn(
      "inline-flex items-center justify-center rounded-md text-sm font-medium",
      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
      className
    )}
    {...props}
  >
    {children}
  </button>
))
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuContent = React.forwardRef(({ className, children, open, setOpen, align = "right", ...props }, ref) => {
  if (!open) return null

  // Determine alignment class
  const alignClass = align === "left" ? "left-0" : "right-0";

  return (
    <div
      ref={ref}
      className={cn(
        "absolute mt-2 w-56 origin-top-right rounded-md bg-card shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50",
        alignClass,
        className
      )}
      {...props}
    >
      <div className="py-1" role="none">
        {React.Children.map(children, child =>
          React.cloneElement(child, { setOpen })
        )}
      </div>
    </div>
  )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef(({ className, children, onClick, setOpen, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted/50",
      className
    )}
    onClick={(e) => {
      onClick?.(e)
      setOpen?.(false)
    }}
    {...props}
  >
    {children}
  </button>
))
DropdownMenuItem.displayName = "DropdownMenuItem"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
}