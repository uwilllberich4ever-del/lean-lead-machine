import { ReactNode } from 'react';

type StatusType = 'active' | 'cac40' | 'closed' | 'alert' | 'custom';

interface StatusBadgeProps {
  type: StatusType;
  children: ReactNode;
  className?: string;
}

export default function StatusBadge({ type, children, className = '' }: StatusBadgeProps) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  const typeClasses = {
    active: 'bg-green-100 text-green-800 border border-green-200',
    cac40: 'bg-blue-100 text-blue-800 border border-blue-200',
    closed: 'bg-red-100 text-red-800 border border-red-200',
    alert: 'bg-orange-100 text-orange-800 border border-orange-200',
    custom: 'bg-gray-100 text-gray-800 border border-gray-200',
  };

  return (
    <span className={`${baseClasses} ${typeClasses[type]} ${className}`}>
      {children}
    </span>
  );
}

// Composants pré-définis pour une utilisation facile
export function ActiveBadge({ className = '' }: { className?: string }) {
  return <StatusBadge type="active" className={className}>Active</StatusBadge>;
}

export function CAC40Badge({ className = '' }: { className?: string }) {
  return <StatusBadge type="cac40" className={className}>CAC 40</StatusBadge>;
}

export function ClosedBadge({ className = '' }: { className?: string }) {
  return <StatusBadge type="closed" className={className}>Fermé</StatusBadge>;
}

export function AlertBadge({ className = '' }: { className?: string }) {
  return <StatusBadge type="alert" className={className}>Alerte</StatusBadge>;
}