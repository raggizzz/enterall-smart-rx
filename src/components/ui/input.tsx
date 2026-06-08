import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, inputMode, onKeyDown, onInput, onWheel, ...props }, ref) => {
    const blocksWheelChange = type === "number" || inputMode === "numeric" || inputMode === "decimal";

    return (
      <input
        type={type}
        inputMode={inputMode}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || type !== "number") return;
          if (["e", "E", "+", "-"].includes(event.key)) {
            event.preventDefault();
          }
        }}
        onInput={(event) => {
          if (type === "number" && event.currentTarget.value.startsWith("-")) {
            event.currentTarget.value = event.currentTarget.value.replace(/^-+/, "");
          }
          onInput?.(event);
        }}
        onWheel={(event) => {
          onWheel?.(event);
          if (event.defaultPrevented || !blocksWheelChange) return;
          if (document.activeElement === event.currentTarget) {
            event.currentTarget.blur();
          }
        }}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
