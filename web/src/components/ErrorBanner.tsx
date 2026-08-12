import { AlertTriangle, X } from 'lucide-react';

interface Props {
  message: string;
  onDismiss: () => void;
}

export default function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div className="error-banner" role="alert">
      <AlertTriangle size={16} />
      <span className="error-banner-text">{message}</span>
      <button className="btn btn-icon" onClick={onDismiss} aria-label="Descartar">
        <X size={15} />
      </button>
    </div>
  );
}