import {
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Optional CSS class name to apply custom styles
   */
  className?: string;
  /**
   * Whether to reverse the animation direction
   * @default false
   */
  reverse?: boolean;
  /**
   * Whether to pause the animation on hover
   * @default false
   */
  pauseOnHover?: boolean;
  /**
   * Content to be displayed in the marquee
   */
  children: ReactNode;
  /**
   * Whether to animate vertically instead of horizontally
   * @default false
   */
  vertical?: boolean;
  /**
   * Number of times to repeat the content
   * @default 4
   */
  repeat?: number;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  style,
  ...props
}: MarqueeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const animationStyle: CSSProperties = vertical
    ? { animation: "marquee-vertical var(--duration, 40s) linear infinite" }
    : { animation: "marquee var(--duration, 40s) linear infinite" };

  const handleMouseEnter = pauseOnHover ? () => setIsHovered(true) : undefined;
  const handleMouseLeave = pauseOnHover ? () => setIsHovered(false) : undefined;

  return (
    <div
      {...props}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "flex overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
        vertical ? "flex-col" : "flex-row",
        className
      )}
      style={{ gap: "var(--gap)", ...style }}
    >
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex shrink-0 justify-around",
              vertical ? "flex-col" : "flex-row"
            )}
            style={{
              ...animationStyle,
              animationPlayState:
                pauseOnHover && isHovered ? "paused" : "running",
              animationDirection: reverse ? "reverse" : "normal",
              gap: "var(--gap)",
            }}
          >
            {children}
          </div>
        ))}
    </div>
  );
}
