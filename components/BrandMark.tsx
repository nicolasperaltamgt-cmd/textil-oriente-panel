import React from "react";

interface BrandMarkProps {
  className?: string;
  width?: number;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className, width = 72 }) => (
  <svg
    className={className}
    width={width}
    viewBox="0 0 120 62"
    aria-hidden="true"
    focusable="false"
  >
    <polygon points="2,60 36,6 66,60" fill="#f2d21b" />
    <polygon points="30,2 90,2 60,56" fill="#d8333e" />
    <polygon points="64,56 92,10 120,60" fill="#3a4f7a" />
  </svg>
);
