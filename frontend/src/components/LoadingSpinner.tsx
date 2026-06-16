import { Spin } from 'antd';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
  fullscreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'default',
  tip,
  fullscreen = false,
}) => {
  const indicator = (
    <Loader2
      size={size === 'large' ? 48 : size === 'small' ? 16 : 32}
      className="animate-spin text-blue-500"
    />
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <Spin size={size} indicator={indicator} tip={tip} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <Spin size={size} indicator={indicator} tip={tip} />
    </div>
  );
};
