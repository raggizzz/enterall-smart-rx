/**
 * LogoEnmeta - Official logo component using the PNG asset.
 * Renders the ENMet@ logo image with configurable sizes.
 */
import logoSrc from "@/assets/logoenmeta.png";

interface LogoEnmetaProps {
    className?: string;
    size?: "sm" | "md" | "lg";
}

const sizes: Record<string, string> = {
    sm: "h-9",
    md: "h-20",
    lg: "h-48",
};

const LogoEnmeta = ({ className = "", size = "md" }: LogoEnmetaProps) => {
    return (
        <div className={`flex items-center justify-center ${sizes[size]} ${className}`}>
            <img
                src={logoSrc}
                alt="ENMet@ — Nutrição Enteral Inteligente e Sustentável"
                className="h-full w-auto object-contain"
            />
        </div>
    );
};

export default LogoEnmeta;
