import React from "react";

interface EnteralIconProps {
    className?: string;
}

/**
 * Ícone de Bolsa Enteral - Brutalist Clinical Theme
 * Linhas retas absolutas, estética de alta precisão.
 */
const EnteralIcon: React.FC<EnteralIconProps> = ({ className = "h-5 w-5" }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M14 2H10V4H6V18H10V22H14V18H18V4H14V2ZM12 4H12.01V6H11.99V4H12ZM8 6H16V16H8V6ZM11 8H13V14H11V8Z" />
    </svg>
);

export default EnteralIcon;
