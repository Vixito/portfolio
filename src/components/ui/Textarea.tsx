import { forwardRef } from "react";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { placeholder, className = "", disabled = false, rows = 4, ...props },
    ref
  ) => {
    return (
      <textarea
        ref={ref}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        {...props}
        className={`px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple transition-colors resize-none ${className} ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
