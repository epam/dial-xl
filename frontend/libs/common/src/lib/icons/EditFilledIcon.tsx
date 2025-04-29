import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export const EditFilledIcon = ({
  secondaryAccentCssVar: primaryColorClass = '',
}: QGIconProps) => {
  const primaryColor = getColorVar(primaryColorClass);

  return (
    <svg
      fill="none"
      viewBox="0 0 18 18"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.125 4.875L13.125 7.875L10.125 4.875Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M3 14.9999H6L13.125 7.875L10.125 4.875L3 11.9999V14.9999Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M10.125 4.875L13.125 7.875L10.125 4.875Z"
        stroke={primaryColor}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 14.9999H6L13.125 7.875L10.125 4.875L3 11.9999V14.9999Z"
        stroke={primaryColor}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 14.25H16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.125 4.87537L13.125 7.87537Z"
        stroke={primaryColor}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.875 7.12523C14.072 6.92824 14.2282 6.69439 14.3348 6.43702C14.4415 6.17965 14.4963 5.9038 14.4963 5.62523C14.4963 5.34665 14.4415 5.0708 14.3348 4.81343C14.2282 4.55606 14.072 4.32221 13.875 4.12523C13.678 3.92824 13.4442 3.77199 13.1868 3.66538C12.9294 3.55878 12.6536 3.50391 12.375 3.50391C12.0964 3.50391 11.8206 3.55878 11.5632 3.66538C11.3058 3.77199 11.072 3.92824 10.875 4.12523L10.125 4.87537L13.125 7.87537L13.875 7.12523Z"
        stroke={primaryColor}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
