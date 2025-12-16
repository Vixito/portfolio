interface InputProps {
  type?: "text" | "email" | "password" | "number";
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
}

function Input({
  type = "text",
  placeholder,
  value,
  onChange,
  className = "",
  disabled = false,
}: InputProps) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple transition-colors ${className} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    />
  );
}

export default Input;
