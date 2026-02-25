import React from "react";

interface EnteralIconProps {
    className?: string;
}

/**
 * Ícone de bolsa de infusão — representa "Enteral" na legenda de vias alimentares.
 * Cor padrão: roxo (#7b2d8e). Aceita `className` para dimensionamento (ex.: h-5 w-5).
 */
const EnteralIcon: React.FC<EnteralIconProps> = ({ className = "h-5 w-5" }) => (
    <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        {/* Bag body */}
        <rect
            x="120"
            y="120"
            width="272"
            height="296"
            rx="48"
            stroke="#7b2d8e"
            strokeWidth="38"
            strokeLinejoin="round"
        />
        {/* Hanger / hook at top */}
        <path
            d="M216 120V80c0-12 10-22 22-22h36c12 0 22 10 22 22v40"
            stroke="#7b2d8e"
            strokeWidth="34"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Drip outlet at bottom */}
        <path
            d="M256 416v32c0 12-8 24-20 28"
            stroke="#7b2d8e"
            strokeWidth="34"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <circle
            cx="236"
            cy="476"
            r="14"
            stroke="#7b2d8e"
            strokeWidth="28"
            fill="none"
        />
    </svg>
);

export default EnteralIcon;
