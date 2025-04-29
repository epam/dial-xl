import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export function TableHeaderIcon({
  secondaryAccentCssVar: primaryColorClass = '',
}: QGIconProps) {
  const primaryColor = getColorVar(primaryColorClass);

  return (
    <svg
      fill="none"
      viewBox="0 0 51 50"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M40.0833 6.25H10.9167C9.8116 6.25 8.75179 6.68899 7.97039 7.47039C7.18899 8.25179 6.75 9.3116 6.75 10.4167V39.5833C6.75 40.6884 7.18899 41.7482 7.97039 42.5296C8.75179 43.311 9.8116 43.75 10.9167 43.75H40.0833C41.1884 43.75 42.2482 43.311 43.0296 42.5296C43.811 41.7482 44.25 40.6884 44.25 39.5833V10.4167C44.25 9.3116 43.811 8.25179 43.0296 7.47039C42.2482 6.68899 41.1884 6.25 40.0833 6.25ZM40.0833 6.25L25.5 20.8333M19.25 6.25L6.75 18.75M29.6667 6.25L15.0833 20.8333M44.25 12.5L35.9167 20.8333M6.75 20.8333H44.25M21.3333 20.8333V43.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M19.25 6.25L6.75 18.75L19.25 6.25Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M29.6667 6.25L15.0833 20.8333L29.6667 6.25Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M40.0833 6.25L25.5 20.8333L40.0833 6.25Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M44.25 12.5L35.9167 20.8333L44.25 12.5Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M6.75 20.8333H44.25H6.75Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M29.6667 6.25H19.25L6.75 18.75V20.8333H15.0833L29.6667 6.25Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M7.97039 7.47039C7.18899 8.25179 6.75 9.3116 6.75 10.4167V18.75L19.25 6.25H10.9167C9.8116 6.25 8.75179 6.68899 7.97039 7.47039Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M40.0833 6.25H29.6667L15.0833 20.8333H25.5L40.0833 6.25Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M43.0296 7.47039C42.2482 6.68899 41.1884 6.25 40.0833 6.25L25.5 20.8333H35.9167L44.25 12.5V10.4167C44.25 9.3116 43.811 8.25179 43.0296 7.47039Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M44.25 12.5L35.9167 20.8333H44.25V12.5Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M10.9167 6.25C9.8116 6.25 8.75179 6.68899 7.97039 7.47039C7.18899 8.25179 6.75 9.3116 6.75 10.4167V18.75M10.9167 6.25H40.0833M10.9167 6.25H19.25M40.0833 6.25C41.1884 6.25 42.2482 6.68899 43.0296 7.47039C43.811 8.25179 44.25 9.3116 44.25 10.4167V12.5M40.0833 6.25L25.5 20.8333M40.0833 6.25H29.6667M19.25 6.25L6.75 18.75M19.25 6.25H29.6667M6.75 18.75V20.8333M29.6667 6.25L15.0833 20.8333M15.0833 20.8333H6.75M15.0833 20.8333H25.5M25.5 20.8333H35.9167M44.25 12.5L35.9167 20.8333M44.25 12.5V20.8333M35.9167 20.8333H44.25M6.75 20.8333H44.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
