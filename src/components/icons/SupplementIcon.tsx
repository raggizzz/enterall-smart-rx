import React from "react";

interface SupplementIconProps {
    className?: string;
}

/**
 * Ícone de garrafa/frasco — representa "Suplementação" na legenda de vias alimentares.
 * Cor padrão: azul (#1a7fb5). Aceita `className` para dimensionamento (ex.: h-5 w-5).
 */
const SupplementIcon: React.FC<SupplementIconProps> = ({ className = "h-5 w-5" }) => (
    <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        {/* Bottle body */}
        <path
            d="M176 160c-44 0-72 36-72 80v152c0 44 28 80 72 80h160c44 0 72-36 72-80V240c0-44-28-80-72-80H176z"
            stroke="#1a7fb5"
            strokeWidth="36"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Neck */}
        <path
            d="M208 160v-24c0-18 10-32 28-40h40c18 8 28 22 28 40v24"
            stroke="#1a7fb5"
            strokeWidth="36"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Cap */}
        <rect
            x="200"
            y="56"
            width="112"
            height="48"
            rx="16"
            stroke="#1a7fb5"
            strokeWidth="36"
            fill="none"
        />
        {/* Label line */}
        <line
            x1="160"
            y1="340"
            x2="352"
            y2="340"
            stroke="#1a7fb5"
            strokeWidth="28"
            strokeLinecap="round"
        />
        {/* Waist / neck curve */}
        <path
            d="M176 220c24-20 136-20 160 0"
            stroke="#1a7fb5"
            strokeWidth="28"
            strokeLinecap="round"
        />
    </svg>
);

export default SupplementIcon;
