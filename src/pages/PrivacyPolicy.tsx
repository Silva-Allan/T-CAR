import { PageContainer } from '@/components/layout/PageContainer';
import { useTranslation } from '@/hooks/useTranslation';
import { Shield, Lock, Eye, Trash2, FileText, Scale } from 'lucide-react';

export default function PrivacyPolicy() {
    const { t } = useTranslation();
    return (
        <PageContainer title={t('privacyTitle')} showBack branded>
            <div className="max-w-3xl mx-auto space-y-8 pb-12 px-4">

                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">{t('privacyHeroTitle')}</h2>
                    <p className="text-muted-foreground text-sm">{t('updatedAt').replace('{0}', '1/03/2026')}</p>
                </div>

                <div className="glass-card p-6 rounded-2xl space-y-6 text-sm leading-relaxed text-muted-foreground">

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Eye className="w-4 h-4 text-primary" /> {t('privacyIntroTitle')}
                        </h3>
                        <p>
                            {t('privacyIntroText1')}
                        </p>
                        <p>
                            {t('privacyIntroText2')}
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" /> {t('privacyDataTitle')}
                        </h3>
                        <p>{t('aboutManualSub')}:</p>
                        <div className="space-y-4 pl-2">
                            <div>
                                <p className="font-bold text-foreground">{t('privacyDataSub1')}</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>{t('privacyDataList1')}</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-bold text-foreground">{t('privacyDataSub2')}</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>{t('privacyDataList2')}</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Lock className="w-4 h-4 text-primary" /> {t('privacyPurposeTitle')}
                        </h3>
                        <p>{t('privacyPurposeText')}</p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Scale className="w-4 h-4 text-primary" /> {t('privacyStorageTitle')}
                        </h3>
                        <p>
                            {t('privacyStorageText')}
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" /> {t('privacySecurityTitle')}
                        </h3>
                        <p>{t('privacySecurityText')}</p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-primary" /> {t('privacyRightsTitle')}
                        </h3>
                        <p>Consulte a LGPD para mais detalhes sobre seus direitos de acesso, retificação e exclusão.</p>
                    </section>

                    <section className="space-y-3 border-t border-border pt-6">
                        <p className="font-bold text-foreground">Alterações nesta Política</p>
                        <p>
                            Reservamo-nos o direito de atualizar esta política periodicamente para refletir mudanças legais ou técnicas.
                            O uso continuado do sistema após alterações constitui aceitação da nova política.
                        </p>
                    </section>
                </div>
            </div>
        </PageContainer>
    );
}
