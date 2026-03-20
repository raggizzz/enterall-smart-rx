import React from "react";

interface EnteralIconProps {
  className?: string;
}

const EnteralIcon: React.FC<EnteralIconProps> = ({ className = "h-5 w-5" }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M24 6H40V12H46C49.3 12 52 14.7 52 18V43C52 46.3 49.3 49 46 49H43V55C43 58.3 40.3 61 37 61H27C23.7 61 21 58.3 21 55V49H18C14.7 49 12 46.3 12 43V18C12 14.7 14.7 12 18 12H24V6Z"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M24 49V56"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <path
      d="M40 49V56"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

export default EnteralIcon;
