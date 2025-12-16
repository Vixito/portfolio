interface TextareaProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  disabled?: boolean;
  rows?: number;
}

function Textarea({
  placeholder,
  value,
  onChange,
  className = "",
  disabled = false,
  rows = 4,
}: TextareaProps) {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      rows={rows}
      className={`px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple transition-colors resize-none ${className} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    />
  );
}

export default Textarea;
