
import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  return <Loader2 className={`animate-spin ${className}`} />;
};
