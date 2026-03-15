import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none focus:ring-2 focus:ring-gz-gold/30 ${
            error ? "border-gz-burgundy" : ""
          } ${className}`}
          style={{ backgroundColor: "var(--gz-cream)" }}
          {...props}
        />
        {error && <p className="font-archivo text-[11px] text-gz-burgundy">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
