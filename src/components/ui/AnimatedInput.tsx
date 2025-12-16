import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnimatedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  error?: boolean;
  icon?: React.ReactNode;
}

function AnimatedInput({
  type = "text",
  label,
  placeholder,
  value,
  defaultValue,
  onChange,
  className = "",
  inputClassName = "",
  labelClassName = "",
  disabled = false,
  error = false,
  icon,
  name,
  id,
  ...rest
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Sincronizar hasValue con el valor actual
    if (value !== undefined) {
      setHasValue(value.trim().length > 0);
    } else if (defaultValue !== undefined) {
      setHasValue(defaultValue.trim().length > 0);
    } else if (inputRef.current) {
      setHasValue(inputRef.current.value.trim().length > 0);
    }
  }, [value, defaultValue]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    // Actualizar hasValue basado en el valor actual después de quitar el focus
    const currentValue = e.target.value;
    setHasValue(currentValue.trim().length > 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHasValue(newValue.trim().length > 0);
    if (onChange) {
      onChange(e);
    }
  };

  const isLabelFloating = isFocused || hasValue;

  return (
    <div className={`relative ${className}`}>
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-400">
          {icon}
        </div>
      )}
      <motion.input
        ref={inputRef}
        type={type}
        name={name}
        id={id || name}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={isLabelFloating ? placeholder : ""}
        className={`
          w-full px-4 ${icon ? "pl-10" : ""} py-3
          border-2 rounded-lg
          bg-transparent
          transition-colors
          focus:outline-none
          ${error ? "border-red-500" : "border-gray-300 focus:border-purple"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${inputClassName}
        `}
        initial={false}
        animate={{
          borderColor: error ? "#ef4444" : isFocused ? "#331d83" : "#d1d5db",
        }}
        transition={{ duration: 0.2 }}
        {...rest}
      />
      <AnimatePresence mode="wait">
        {isLabelFloating ? (
          <motion.label
            key="floating"
            htmlFor={id || name}
            className={`
              absolute left-4 ${icon ? "left-10" : ""} top-2
              text-xs font-medium
              ${error ? "text-red-500" : "text-purple"}
              pointer-events-none
              ${labelClassName}
            `}
            initial={{ opacity: 0, y: 0, scale: 1 }}
            animate={{ opacity: 1, y: -8, scale: 0.85 }}
            exit={{ opacity: 0, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.label>
        ) : (
          <motion.label
            key="static"
            htmlFor={id || name}
            className={`
              absolute left-4 ${icon ? "left-10" : ""} top-1/2 -translate-y-1/2
              text-gray-500
              pointer-events-none
              transition-colors
              ${labelClassName}
            `}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AnimatedInput;
