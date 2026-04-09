import { Link } from "react-router-dom";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const Logo = ({ size = "md", showText = true }: LogoProps) => {
  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const imageSizes = {
    sm: "h-6 w-auto",
    md: "h-8 w-auto",
    lg: "h-10 w-auto",
  };

  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <img 
        src="/nextlogobotao.jpg" 
        alt="Logo NextFit" 
        className={`${imageSizes[size]} transition-transform duration-300 group-hover:scale-105`}
      />
      {showText && (
        <span className={`font-bold ${textSizeClasses[size]} text-[#8b1da2] group-hover:text-[#6b147d] transition-colors`}>
          Biblioteca NextFit
        </span>
      )}
    </Link>
  );
};

export default Logo;