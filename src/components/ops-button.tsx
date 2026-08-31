import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type OpsButtonIntent = "brand" | "neutral" | "info" | "success" | "warning" | "danger";
type OpsButtonEmphasis = "solid" | "outline" | "ghost";
type OpsButtonSize = "compact" | "default" | "icon";

export interface OpsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: OpsButtonIntent;
  emphasis?: OpsButtonEmphasis;
  size?: OpsButtonSize;
}

export const OpsButton = forwardRef<HTMLButtonElement, OpsButtonProps>(function OpsButton(
  {
    className,
    intent = "neutral",
    emphasis = "outline",
    size = "default",
    type = "button",
    onClick,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-intent={intent}
      data-emphasis={emphasis}
      data-size={size}
      className={cn("ops-button", className)}
      onClick={onClick}
      {...props}
    />
  );
});
