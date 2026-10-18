
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'wordmark';
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 'sm', variant = 'full' }) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-24',
    xl: 'h-32'
  };

  const imageSrc = '/logo.png';

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      <img 
        src={imageSrc} 
        alt="SlyD Logo" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
};

export default Logo;
