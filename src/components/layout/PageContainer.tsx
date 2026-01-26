import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  backTo?: string;
  action?: ReactNode;
}

export function PageContainer({ 
  children, 
  title, 
  showBack = false, 
  backTo,
  action 
}: PageContainerProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {(title || showBack) && (
        <header className="sticky top-0 z-50 glass-card border-b border-border/50 px-4 py-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBack && (
                <Button 
                  variant="ghost" 
                  size="icon-sm" 
                  onClick={handleBack}
                  className="shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              {title && (
                <h1 className="text-lg font-bold truncate">{title}</h1>
              )}
            </div>
            {action && <div>{action}</div>}
          </div>
        </header>
      )}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
