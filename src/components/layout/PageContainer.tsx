import { ReactNode } from 'react';
import { ArrowLeft, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  backTo?: string;
  action?: ReactNode;
  className?: string;
  /** Use the branded UDESC green header */
  branded?: boolean;
  /** Hide the header entirely (e.g. for test execution) */
  hideHeader?: boolean;
}

export function PageContainer({
  children,
  title,
  showBack = false,
  backTo,
  action,
  className,
  branded = false,
  hideHeader = false,
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
    <div className="min-h-screen bg-background flex flex-col">
      {!hideHeader && (title || showBack) && (
        <header
          className={
            branded
              ? 'branded-header sticky top-0 z-50 px-4 py-3'
              : 'sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/60 px-4 py-3'
          }
          style={branded ? undefined : { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <div className="container mx-auto flex items-center justify-between max-w-2xl">
            <div className="flex items-center gap-3">
              {showBack && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleBack}
                  className={branded ? 'text-white/90 hover:text-white hover:bg-white/10' : 'shrink-0'}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              {branded && !showBack && (
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
              )}
              {title && (
                <div>
                  <h1 className={`text-base font-bold truncate ${branded ? 'text-white' : ''}`}>
                    {title}
                  </h1>
                  {branded && (
                    <p className="text-[10px] text-white/60 font-medium tracking-wider uppercase">
                      UDESC • Protocolo Oficial
                    </p>
                  )}
                </div>
              )}
            </div>
            {action && <div className={branded ? 'text-white' : ''}>{action}</div>}
          </div>
        </header>
      )}
      <main className={`flex-1 container mx-auto px-4 py-6 max-w-2xl page-enter ${className || ''}`}>
        {children}
      </main>
    </div>
  );
}
