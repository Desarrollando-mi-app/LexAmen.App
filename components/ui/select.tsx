import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: readonly SelectOption[];
  placeholder?: string;
}

/**
 * Select con la misma estética editorial que Input:
 * label IBM Plex Mono versalitas, cuerpo cream con border gz-rule,
 * foco en gold. Chevron SVG absoluto.
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, options, placeholder, className = "", id, ...props },
    ref
  ) => {
    const selectId = id || props.name;

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={selectId}
          className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium"
        >
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full appearance-none rounded-[3px] border border-gz-rule px-4 py-2.5 pr-10 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-2 focus:ring-gz-gold/30 ${
              error ? "border-gz-burgundy" : ""
            } ${className}`}
            style={{ backgroundColor: "var(--gz-cream)" }}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gz-ink-light"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
        {error && (
          <p className="font-archivo text-[11px] text-gz-burgundy">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
export type { SelectProps, SelectOption };
