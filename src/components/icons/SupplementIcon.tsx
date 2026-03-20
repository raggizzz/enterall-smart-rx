import React from "react";

interface SupplementIconProps {
  className?: string;
}

const SupplementIcon: React.FC<SupplementIconProps> = ({ className = "h-5 w-5" }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M24 6H40V12C40 14.2 41.8 16 44 16C47.3 16 50 18.7 50 22V48C50 51.3 47.3 54 44 54H20C16.7 54 14 51.3 14 48V22C14 18.7 16.7 16 20 16C22.2 16 24 14.2 24 12V6Z"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20 38H44"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

export default SupplementIcon;
