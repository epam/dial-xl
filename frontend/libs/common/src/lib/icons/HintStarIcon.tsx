import { QGIconProps } from '../types';
import { getColorVar } from '../utils/icon';

export const HintStarIcon = ({ secondaryAccentCssVar = '' }: QGIconProps) => {
  return (
    <svg
      fill="none"
      viewBox="0 0 18 18"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.31641 13.5H4.06641C3.46967 13.5 2.89737 13.2629 2.47542 12.841C2.05346 12.419 1.81641 11.8467 1.81641 11.25V5.25C1.81641 4.65326 2.05346 4.08097 2.47542 3.65901C2.89737 3.23705 3.46967 3 4.06641 3H13.0664C13.6631 3 14.2354 3.23705 14.6574 3.65901C15.0794 4.08097 15.3164 4.65326 15.3164 5.25V8.625"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M5.56641 6.75H11.5664H5.56641Z"
        fill={getColorVar(secondaryAccentCssVar)}
        fillOpacity="0.15"
      />
      <path
        d="M5.56641 9.75H8.94141H5.56641Z"
        fill={getColorVar(secondaryAccentCssVar)}
        fillOpacity="0.15"
      />
      <path
        d="M13.7947 14.3872C13.1608 15.0211 12.8047 15.8809 12.8047 16.7773C12.8047 15.8809 12.4486 15.0211 11.8147 14.3872C11.1808 13.7533 10.321 13.3972 9.42456 13.3972C10.321 13.3972 11.1808 13.0411 11.8147 12.4072C12.4486 11.7733 12.8047 10.9136 12.8047 10.0171C12.8047 10.9136 13.1608 11.7733 13.7947 12.4072C14.4286 13.0411 15.2883 13.3972 16.1848 13.3972C15.2883 13.3972 14.4286 13.7533 13.7947 14.3872Z"
        fill={getColorVar(secondaryAccentCssVar)}
        fillOpacity="0.15"
      />
      <path
        d="M5.56641 6.75H11.5664M5.56641 9.75H8.94141M12.8047 16.7773C12.8047 15.8809 13.1608 15.0211 13.7947 14.3872C14.4286 13.7533 15.2883 13.3972 16.1848 13.3972C15.2883 13.3972 14.4286 13.0411 13.7947 12.4072C13.1608 11.7733 12.8047 10.9136 12.8047 10.0171C12.8047 10.9136 12.4486 11.7733 11.8147 12.4072C11.1808 13.0411 10.321 13.3972 9.42456 13.3972C10.321 13.3972 11.1808 13.7533 11.8147 14.3872C12.4486 15.0211 12.8047 15.8809 12.8047 16.7773Z"
        stroke={getColorVar(secondaryAccentCssVar)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
  );
};
