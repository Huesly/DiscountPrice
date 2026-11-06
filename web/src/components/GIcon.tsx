interface GIconProps {
  name: string;
  size?: number;
  className?: string;
  fill?: boolean;
}

export default function GIcon({
  name,
  size = 20,
  className = '',
  fill = false,
}: GIconProps) {
  return (
    <span
      className={`material-symbols-outlined g-icon ${className}`}
      style={{
        fontSize: `${size}px`,
        width: `${size}px`,
        height: `${size}px`,
        fontVariationSettings: fill ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 450",
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        verticalAlign: 'middle',
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
