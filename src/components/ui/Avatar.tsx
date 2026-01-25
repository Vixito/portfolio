import { useState, forwardRef } from "react";
import { cn } from "../../lib/utils";

interface AvatarProps {
  className?: string;
  children?: React.ReactNode;
}

interface AvatarImageProps {
  src?: string;
  alt?: string;
  className?: string;
  onLoadingStatusChange?: (status: "loading" | "loaded" | "error") => void;
}

interface AvatarFallbackProps {
  className?: string;
  children?: React.ReactNode;
  delayMs?: number;
}

/**
 * Contexto interno para comunicar estado entre Avatar componentes
 */
let imageLoaded = false;

/**
 * Avatar container
 */
export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

/**
 * Avatar image
 */
export const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ src, alt, className, onLoadingStatusChange, ...props }, ref) => {
    const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

    const handleLoad = () => {
      setStatus("loaded");
      imageLoaded = true;
      onLoadingStatusChange?.("loaded");
    };

    const handleError = () => {
      setStatus("error");
      imageLoaded = false;
      onLoadingStatusChange?.("error");
    };

    if (!src) return null;

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "aspect-square h-full w-full object-cover",
          status !== "loaded" && "hidden",
          className
        )}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = "AvatarImage";

/**
 * Avatar fallback - se muestra cuando la imagen falla o está cargando
 */
export const AvatarFallback = forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full bg-purple/20 text-sm font-medium text-purple",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AvatarFallback.displayName = "AvatarFallback";

export default Avatar;
