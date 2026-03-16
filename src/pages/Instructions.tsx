import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, ArrowLeft, Book } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/hooks/useTranslation';

export default function Instructions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedProtocol } = useApp();

  return (
    <PageContainer
      title={t('manualTitle')}
      showBack
      backTo="/configure-test"
    >
      <div className="max-w-2xl mx-auto space-y-8 pb-12">
        {/* Official Animation Section */}
        <section className="glass-card overflow-hidden rounded-2xl">
          <div className="aspect-video bg-black relative">
            <iframe
              src="https://www.youtube.com/embed/pUmj9MsLICo"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Animação Oficial do Teste T-CAR"
            ></iframe>
          </div>
          <div className="p-4 bg-primary/5 border-t border-border/50">
            <p className="text-sm text-primary font-bold flex items-center gap-2">
              <Play className="w-4 h-4" />
              {t('officialAnimationTitle')}
            </p>
          </div>
        </section>

        {/* Description and application */}
        <section className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Book className="w-5 h-5 text-primary" />
            {t('testApplication')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('instructionDesc')}
          </p>

          <div className="relative h-32 flex items-center justify-center bg-secondary/30 rounded-xl my-6">
            <div className="absolute left-6 flex flex-col items-center">
              <div className="w-2 h-16 bg-primary rounded-full" />
              <span className="text-[10px] mt-1 font-bold">{t('startLine')}</span>
            </div>

            <div className="flex-1 mx-16 relative">
              <div className="h-0.5 bg-border rounded-full" />
              <div className="absolute top-1/2 left-1/4 -translate-y-1/2 flex items-center text-primary">
                <ArrowRight className="w-4 h-4" />
                <span className="text-[9px] font-bold ml-1">{t('going6s')}</span>
              </div>
              <div className="absolute top-1/2 right-1/4 -translate-y-1/2 flex items-center text-accent">
                <span className="text-[9px] font-bold mr-1">{t('returning6s')}</span>
                <ArrowLeft className="w-4 h-4" />
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                <span className="text-sm font-mono font-bold text-primary">{selectedProtocol.initialDistance}m</span>
              </div>
            </div>

            <div className="absolute right-6 flex flex-col items-center">
              <div className="w-2 h-16 bg-accent rounded-full" />
              <span className="text-[10px] mt-1 font-bold">{t('turnPoint')}</span>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold">{t('protocolRules')}</h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">01</div>
              <p className="text-sm text-muted-foreground">{t('rule1')}</p>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">02</div>
              <p className="text-sm text-muted-foreground">{t('rule2')}</p>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">03</div>
              <p className="text-sm text-muted-foreground">{t('rule3')}</p>
            </li>
          </ul>
        </section>

        {/* Start button */}
        <div className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto">
          <Button
            variant="hero"
            className="w-full shadow-2xl h-14 text-lg"
            onClick={() => navigate('/test')}
          >
            <Play className="w-6 h-6 mr-2 fill-current" />
            {t('startProtocol')}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
