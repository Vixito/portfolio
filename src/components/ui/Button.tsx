type ButtonVariant = "primary" | "secondary" | "outline" | "outlineDark";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
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
      "border-2 border-purple-800 text-purple-800 dark:border-purple-400 dark:text-purple-300 hover:bg-purple-800 hover:text-white dark:hover:bg-purple-400 dark:hover:text-white focus:ring-purple-600",
    secondary:
      "border-2 border-sky-600 dark:border-sky-400 text-sky-600 dark:text-sky-400 hover:bg-sky-700 dark:hover:bg-sky-500 hover:text-white focus:ring-sky-400 dark:focus:ring-sky-300",
    outline:
      "border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black focus:ring-black dark:focus:ring-gray-300",
    outlineDark:
      "border-2 border-black text-black dark:border-white dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black focus:ring-black",
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
