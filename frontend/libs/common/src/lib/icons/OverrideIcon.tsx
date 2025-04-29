import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export const OverrideIcon = ({
  secondaryAccentCssVar: primaryColorClass = '',
}: QGIconProps) => {
  return (
    <svg
      fill="none"
      viewBox="0 0 18 18"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.5 6H6H4.5C4.10218 6 3.72064 6.15804 3.43934 6.43934C3.15804 6.72064 3 7.10218 3 7.5V13.5C3 13.8978 3.15804 14.2794 3.43934 14.5607C3.72064 14.842 4.10218 15 4.5 15H10.5C10.8978 15 11.2794 14.842 11.5607 14.5607C11.842 14.2794 12 13.8978 12 13.5V12V10.5M10.5 6H12V7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 6V4.5C6 4.10218 6.15804 3.72064 6.43934 3.43934C6.72064 3.15804 7.10218 3 7.5 3H13.5C13.8978 3 14.2794 3.15804 14.5607 3.43934C14.842 3.72064 15 4.10218 15 4.5V10.5C15 10.8978 14.842 11.2794 14.5607 11.5607C14.2794 11.842 13.8978 12 13.5 12H12H10.5H6V7.5V6Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
