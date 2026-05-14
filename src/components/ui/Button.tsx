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
      "border-2 border-purple-800 bg-purple-800 text-white dark:border-purple-400 dark:bg-purple-500 dark:text-white hover:bg-purple-900 dark:hover:bg-purple-400 focus:ring-purple-600",
    secondary:
      "border-2 border-sky-600 bg-sky-600 text-white dark:border-sky-400 dark:bg-sky-500 dark:text-white hover:bg-sky-700 dark:hover:bg-sky-400 focus:ring-sky-400 dark:focus:ring-sky-300",
    outline:
      "border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black focus:ring-black dark:focus:ring-gray-300",
    outlineDark:
      "border-2 border-black bg-gray-100 text-black dark:border-white dark:bg-gray-800 dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black focus:ring-black",
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
