import React from "react";

interface SupplementIconProps {
    className?: string;
}

/**
 * Ícone de Suplemento - Brutalist Clinical Theme
 * Geometria sharp, 0px border radius feeling.
 */
const SupplementIcon: React.FC<SupplementIconProps> = ({ className = "h-5 w-5" }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M7 2H17V6H19V22H5V6H7V2ZM9 4V6H15V4H9ZM7 8V20H17V8H7ZM10.5 11H13.5V13H15.5V16H13.5V18H10.5V16H8.5V13H10.5V11Z" />
    </svg>
);

export default SupplementIcon;
