import type { ButtonHTMLAttributes } from "react";

/**
 * The primary action: a square pixel-framed block. Hover/focus: an orange wash fills left → right
 * behind the label. Disabled keeps a full-contrast label that says why (CLAUDE.md §13).
 */
export function FillButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="group pixel-border pb-orange relative min-h-14 w-[calc(100%-6px)] overflow-hidden py-3 font-pixel text-ui text-orange transition-[box-shadow,color] focus-visible:outline-none active:translate-y-px disabled:cursor-not-allowed disabled:pb-dim disabled:text-white"
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-left scale-x-0 bg-orange/20 transition-transform group-hover:scale-x-100 group-focus-visible:scale-x-100 group-disabled:scale-x-0"
      />
      <span className="relative">{children}</span>
    </button>
  );
}
