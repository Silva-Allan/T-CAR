import { PageContainer } from '@/components/layout/PageContainer';
import { useTranslation } from '@/hooks/useTranslation';
import { Gavel, CheckCircle, AlertCircle, Info, Copyright, Scale } from 'lucide-react';

export default function TermsOfUse() {
    const { t } = useTranslation();
    return (
        <PageContainer title={t('termsTitle')} showBack branded>
            <div className="max-w-3xl mx-auto space-y-8 pb-12 px-4">

                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2">
                        <Gavel className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">{t('termsHeroTitle')}</h2>
                    <p className="text-muted-foreground text-sm">{t('updatedAt').replace('{0}', '1/03/2026')}</p>
                </div>

                <div className="glass-card p-6 rounded-2xl space-y-6 text-sm leading-relaxed text-muted-foreground">

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Info className="w-4 h-4 text-primary" /> {t('termsIntroTitle')}
                        </h3>
                        <p>
                            {t('termsIntroText')}
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-primary" /> {t('termsRespTitle')}
                        </h3>
                        <p>{t('termsRespText')}</p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-primary" /> {t('termsProhibitedTitle')}
                        </h3>
                        <p>{t('termsProhibitedText')}</p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Copyright className="w-4 h-4 text-primary" /> {t('termsPropertyTitle')}
                        </h3>
                        <p>
                            {t('termsPropertyText')}
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Scale className="w-4 h-4 text-primary" /> {t('termsLiabilityTitle')}
                        </h3>
                        <p>
                            {t('termsLiabilityText')}
                        </p>
                    </section>

                    <section className="space-y-3 border-t border-border pt-6">
                        <p className="font-bold text-foreground">{t('termsForumTitle')}</p>
                        <p>{t('termsForumText')}</p>
                    </section>
                </div>
            </div>
        </PageContainer>
    );
}
