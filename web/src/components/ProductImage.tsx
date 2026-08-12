import { useState } from 'react';

interface Props {
  src: string | null | undefined;
  alt: string;
  className: string;
  noImgClassName?: string;
  size?: number;
}

export default function ProductImage({ src, alt, className, noImgClassName, size }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={noImgClassName ?? className}
        role="img"
        aria-label={alt}
        style={size ? { fontSize: size } : undefined}
      >
        📦
      </div>
    );
  }
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}