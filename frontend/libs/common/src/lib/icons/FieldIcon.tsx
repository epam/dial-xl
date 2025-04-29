import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export const FieldIcon = ({
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
        d="M2.25 14.25C2.25 14.6478 2.40804 15.0294 2.68934 15.3107C2.97064 15.592 3.35218 15.75 3.75 15.75H14.25C14.6478 15.75 15.0294 15.592 15.3107 15.3107C15.592 15.0294 15.75 14.6478 15.75 14.25V3.75C15.75 3.35218 15.592 2.97064 15.3107 2.68934C15.0294 2.40804 14.6478 2.25 14.25 2.25H3.75C3.35218 2.25 2.97064 2.40804 2.68934 2.68934C2.40804 2.97064 2.25 3.35218 2.25 3.75V14.25ZM2.25 14.25L7.5 9M7.5 7.5H15.75M7.5 2.25V15.75M6.75 2.25L2.25 6.75M7.5 5.25L2.25 10.5M7.5 12.75L4.5 15.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.5 2.25V15.75V2.25Z" fill={primaryColor} fillOpacity="0.15" />
      <path
        d="M6.75 2.25L2.25 6.75L6.75 2.25Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M7.5 5.25L2.25 10.5L7.5 5.25Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M7.5 9L2.25 14.25L7.5 9Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M7.5 12.75L4.5 15.75L7.5 12.75Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M2.68934 2.68934C2.40804 2.97064 2.25 3.35218 2.25 3.75V6.75L6.75 2.25H3.75C3.35218 2.25 2.97064 2.40804 2.68934 2.68934Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M2.25 6.75V10.5L7.5 5.25V2.25H6.75L2.25 6.75Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M2.25 10.5V14.25L7.5 9V5.25L2.25 10.5Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M2.68934 15.3107C2.97064 15.592 3.35218 15.75 3.75 15.75H4.5L7.5 12.75V9L2.25 14.25C2.25 14.6478 2.40804 15.0294 2.68934 15.3107Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M7.5 15.75V12.75L4.5 15.75H7.5Z"
        fill={primaryColor}
        fillOpacity="0.15"
      />
      <path
        d="M2.25 3.75C2.25 3.35218 2.40804 2.97064 2.68934 2.68934C2.97064 2.40804 3.35218 2.25 3.75 2.25H6.75M2.25 3.75V14.25M2.25 3.75V6.75M2.25 14.25C2.25 14.6478 2.40804 15.0294 2.68934 15.3107C2.97064 15.592 3.35218 15.75 3.75 15.75H4.5M2.25 14.25L7.5 9M2.25 14.25V10.5M7.5 2.25V15.75M7.5 2.25H6.75M7.5 2.25V5.25M7.5 15.75H4.5M7.5 15.75V12.75M6.75 2.25L2.25 6.75M2.25 6.75V10.5M7.5 5.25L2.25 10.5M7.5 5.25V9M7.5 9V12.75M7.5 12.75L4.5 15.75"
        stroke={primaryColor}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
