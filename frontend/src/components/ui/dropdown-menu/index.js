import * as React from "react"
import { cn } from "../../../lib/utils"

/**
 * Minimal dropdown. Restyled onto the Scoreboard system: radius 0, no shadow,
 * a single hairline border in --border, and --popover for the surface.
 *
 * Dismissal on outside click and Escape lives here rather than in each caller —
 * before, the only way to close a menu was to pick something or hit the trigger
 * again.
 */

const DropdownMenu = React.forwardRef(({ className, children, ...props }, ref) => {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef(null)

  React.useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={(node) => {
        containerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      className={cn("relative inline-block text-left", className)}
      {...props}
    >
      {React.Children.map(children, child =>
        React.isValidElement(child) ? React.cloneElement(child, { open, setOpen }) : child
      )}
    </div>
  )
})
DropdownMenu.displayName = "DropdownMenu"

const DropdownMenuTrigger = React.forwardRef(({ className, children, open, setOpen, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-haspopup="menu"
    aria-expanded={!!open}
    onClick={() => setOpen(!open)}
    className={cn(
      "inline-flex items-center justify-center text-sm font-medium",
      "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
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

  const alignClass = align === "left" || align === "start" ? "left-0" : "right-0";

  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        "absolute top-full z-50 mt-1 w-56 border border-border bg-popover focus:outline-none",
        alignClass,
        className
      )}
      {...props}
    >
      {React.Children.map(children, child =>
        React.isValidElement(child) ? React.cloneElement(child, { setOpen }) : child
      )}
    </div>
  )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef(({ className, children, onClick, setOpen, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="menuitem"
    className={cn(
      "block w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted",
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
