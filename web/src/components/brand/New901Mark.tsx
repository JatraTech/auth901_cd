import {cn} from "@/lib/utils";

type New901MarkProps = {
  className?: string;
};

/** New901 brand mark: circle + two stems with a gold diagonal. */
export function New901Mark({className}: New901MarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 60 48"
      className={cn("block shrink-0 overflow-visible h-5 w-auto [&_circle]:stroke-[1.3] [&_line]:stroke-[1.3]", className)}
    >
      <circle cx="13.2" cy="12.2" r="5.8" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <line x1="19" y1="6.4" x2="19" y2="43.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="41" y1="4.5" x2="41" y2="43.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="41" y1="4.5" x2="37.4" y2="7.4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="19" y1="6.4" x2="41" y2="43.5" stroke="#B8860B" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
