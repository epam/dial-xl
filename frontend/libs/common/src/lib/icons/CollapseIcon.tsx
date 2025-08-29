import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export function CollapseIcon({
  secondaryAccentCssVar: primaryColorClass = '',
}: QGIconProps) {
  return (
    <svg
      fill="none"
      viewBox="0 0 18 18"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 6.75H15M3 13.5V4.5C3 4.10218 3.15804 3.72064 3.43934 3.43934C3.72064 3.15804 4.10218 3 4.5 3H13.5C13.8978 3 14.2794 3.15804 14.5607 3.43934C14.842 3.72064 15 4.10218 15 4.5V13.5C15 13.8978 14.842 14.2794 14.5607 14.5607C14.2794 14.842 13.8978 15 13.5 15H4.5C4.10218 15 3.72064 14.842 3.43934 14.5607C3.15804 14.2794 3 13.8978 3 13.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 6.75H15H3Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
      />
      <path
        d="M3 4.5C3 4.10218 3.15804 3.72064 3.43934 3.43934C3.72064 3.15804 4.10218 3 4.5 3H13.5C13.8978 3 14.2794 3.15804 14.5607 3.43934C14.842 3.72064 15 4.10218 15 4.5V6.75H3V4.5Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
      />
      <path
        d="M3 6.75H15H3Z"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 4.5C3 4.10218 3.15804 3.72064 3.43934 3.43934C3.72064 3.15804 4.10218 3 4.5 3H13.5C13.8978 3 14.2794 3.15804 14.5607 3.43934C14.842 3.72064 15 4.10218 15 4.5V6.75H3V4.5Z"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 12L9 10.5L10.5 12"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
