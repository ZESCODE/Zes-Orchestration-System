import * as React from "react";
import { cn } from "../../lib/utils";
const Separator = React.forwardRef(({ className, orientation = "horizontal", ...props }, ref) => (
  <div ref={ref} className={cn("shrink-0 bg-[rgba(100,116,139,0.1)]", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className)} {...props} />
));
Separator.displayName = "Separator";
export { Separator };
