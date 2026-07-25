import * as React from "react";
import { cn } from "../../lib/utils";

const variants = {
  default: "badge primary",
  secondary: "badge primary",
  destructive: "badge danger",
  outline: "badge primary",
  success: "badge success",
  warning: "badge warning",
};

function Badge({ className, variant = "default", ...props }) {
  return <div className={cn(variants[variant] || variants.default, className)} {...props} />;
}

export { Badge };
