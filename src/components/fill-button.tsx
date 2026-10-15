import type { ButtonHTMLAttributes } from "react";

/** Full-width orange button. Hover/focus: orange wash fills left → right behind the label. */
export function FillButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="group relative w-full overflow-hidden rounded-md border border-orange py-3 text-base font-bold text-orange focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 sm:text-lg"
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-left scale-x-0 bg-orange/20 transition-transform group-hover:scale-x-100 group-focus-visible:scale-x-100 group-disabled:scale-x-0"
      />
      <span className="relative">{children}</span>
    </button>
  );
}
