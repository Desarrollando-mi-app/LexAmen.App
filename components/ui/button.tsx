import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gz-navy text-white hover:bg-gz-gold hover:text-gz-navy focus-visible:ring-gz-navy transition-colors",
  secondary:
    "bg-gz-navy text-white hover:bg-gz-gold hover:text-gz-navy focus-visible:ring-gz-gold transition-colors",
  outline:
    "border-2 border-gz-navy text-gz-navy hover:bg-gz-navy hover:text-white focus-visible:ring-gz-navy transition-colors",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-[3px] px-5 py-2.5 font-archivo text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
