// components/ui/button.tsx
import { ReactNode } from "react";
import clsx from "clsx";

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "ghost";
  className?: string;
  type?: "button" | "submit";
};

export function Button({
  children,
  onClick,
  variant = "default",
  className,
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={clsx(
        "ui-button",
        variant === "ghost" && "ui-button-ghost",
        className
      )}
    >
      {children}
    </button>
  );
}
