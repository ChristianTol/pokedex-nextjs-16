type Props = {
  /** Fills the big star (an active toggle). */
  filled?: boolean;
  className?: string;
};

/** The shiny sparkle; takes the colour of the text around it. */
export function SparkleIcon({ filled = false, className = "size-4" }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M10 4l1.7 4.8L16.5 10.5l-4.8 1.7L10 17l-1.7-4.8L3.5 10.5l4.8-1.7z" />
      <path d="M19 3v4M17 5h4M19 15v4M17 17h4" strokeLinecap="round" />
    </svg>
  );
}
