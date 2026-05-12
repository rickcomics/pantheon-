// components/ui/card.tsx
import { ReactNode } from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("ui-card", className)}>
      {children}
    </div>
  );
}
