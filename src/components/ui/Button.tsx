interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

function Button({
  children,
  variant = "primary",
  onClick,
  disabled = false,
  type = "button",
  className = "",
}: ButtonProps) {
  const baseStyles =
    "px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantStyles = {
    primary:
      "border-2 border-purple-600 text-purple-600 hover:bg-purple-800/90 hover:text-white focus:ring-purple-400",
    secondary:
      "border-2 border-blue-600 text-blue-600 hover:bg-blue-800/90 hover:text-white focus:ring-blue-400",
    outline:
      "border-2 border-black text-black hover:bg-black/90 hover:text-white focus:ring-black",
  };

  const disabledStyles = "opacity-50 cursor-not-allowed";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${
        disabled ? disabledStyles : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;
