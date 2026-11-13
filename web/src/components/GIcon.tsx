import Icon, { type IconName } from './Icons';

interface GIconProps {
  name: IconName | string;
  size?: number | string;
  className?: string;
  fill?: boolean;
}

export default function GIcon({
  name,
  size = 20,
  className = '',
  fill = false,
}: GIconProps) {
  // Map Material Symbol names to Icon names
  let iconName: string = name;
  if (name === 'favorite') iconName = fill ? 'heart_filled' : 'heart';
  if (name === 'store') iconName = 'storefront';
  if (name === 'tune') iconName = 'tune';
  if (name === 'filter_list') iconName = 'tune';

  return <Icon name={iconName} size={size} className={className} />;
}
