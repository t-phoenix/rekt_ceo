import * as React from "react"
import "./badge.css"

const badgeVariants = {
  default: "badge-default",
  secondary: "badge-secondary", 
  destructive: "badge-destructive",
  outline: "badge-outline"
}

function Badge({ className, variant = "default", ...props }) {
  const variantClass = badgeVariants[variant] || badgeVariants.default
  const combinedClassName = `badge ${variantClass} ${className || ""}`.trim()
  return (
    <div className={combinedClassName} {...props} />
  )
}

export { Badge, badgeVariants }