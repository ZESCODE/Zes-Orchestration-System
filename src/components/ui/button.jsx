import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const btnCls = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] disabled:pointer-events-none disabled:opacity-50 min-h-[44px]";

const buttonVariants = cva(btnCls, {
  variants: {
    variant: {
      default: "bg-[#6366f1] text-white hover:bg-[#4f46e5] shadow-[0_4px_15px_rgba(99,102,241,0.3)] active:scale-[0.97]",
      destructive: "bg-[#ef4444] text-white hover:bg-[#dc2626] shadow-sm",
      outline: "border border-[rgba(100,116,139,0.25)] bg-[rgba(2,6,23,0.5)] text-[#94a3b8] hover:bg-[rgba(99,102,241,0.08)] hover:text-[#f1f5f9] hover:border-[rgba(99,102,241,0.3)]",
      secondary: "bg-[rgba(99,102,241,0.1)] text-[#818cf8] border border-[rgba(99,102,241,0.2)] hover:bg-[rgba(99,102,241,0.18)]",
      ghost: "text-[#64748b] hover:text-[#f1f5f9] hover:bg-[rgba(99,102,241,0.06)]",
      link: "text-[#6366f1] underline-offset-4 hover:underline hover:text-[#818cf8]",
    },
    size: {
      default: "h-11 px-5 py-2",
      sm: "h-9 rounded-md px-3 text-xs",
      lg: "h-12 rounded-xl px-8 text-base",
      icon: "h-11 w-11",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
