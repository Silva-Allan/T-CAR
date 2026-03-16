import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink, Activity, BookOpen, Download, FileText, Star,
  ChevronDown, ChevronUp, Play, Youtube, Info, Dumbbell, MapPin,
  GraduationCap, Building2, Handshake, Rocket
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { useTranslation } from '@/hooks/useTranslation';

// ──────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────

interface AccordionItemProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionItem({ title, icon, children, defaultOpen = false }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 p-5 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
          <span className="font-bold text-base">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/50 pt-4 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────

export default function About() {
  const { t } = useTranslation();
  return (
    <PageContainer title={t('settingsTitle')} showBack backTo="/" branded>
      <div className="max-w-2xl mx-auto space-y-4 pb-12">

        {/* ── Hero ── */}
        <div className="text-center py-6 px-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4 shadow-inner">
            <Activity className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">{t('aboutHeroTitle')}</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed max-w-sm mx-auto">
            {t('aboutHeroDesc')}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-4 px-4 bg-secondary/30 py-1.5 rounded-lg inline-block">
            {t('aboutHeroSub')}
          </p>
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary">UDESC</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary">CEFID</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary">{t('officialProtocol')}</span>
          </div>
        </div>

        {/* ── Criador & Parceria ── */}
        <div className="glass-card p-5 rounded-2xl space-y-4">

          {/* Prof. Lorival */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold">{t('aboutProfTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('aboutProfSubtitle')}</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {t('aboutProfDesc')}
              </p>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* UDESC */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold">{t('aboutLapedhTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('aboutUdescSubtitle')}</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {t('aboutLapedhDesc')}
              </p>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Parceria */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <Handshake className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold">{t('aboutPlatformTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('aboutPlatformSubtitle')}</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {t('aboutPlatformDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* ── Sobre o Teste ── */}
        <AccordionItem title={t('aboutWhatIsTitle')} icon={<BookOpen className="w-5 h-5" />} defaultOpen>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('aboutWhatIsDesc1')}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('aboutWhatIsDesc2')}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('aboutWhatIsDesc3')}
          </p>

          {/* Protocols Grid */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">{t('aboutLevel1')}</p>
              <p className="text-2xl font-black text-primary">9,0</p>
              <p className="text-[10px] text-muted-foreground">{t('aboutInitialSpeed')}</p>
              <p className="text-[10px] text-muted-foreground mt-1">2 × 15m</p>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">{t('aboutLevel2')}</p>
              <p className="text-2xl font-black text-primary">12,0</p>
              <p className="text-[10px] text-muted-foreground">{t('aboutInitialSpeed')}</p>
              <p className="text-[10px] text-muted-foreground mt-1">2 × 20m</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Ambos têm incrementos de <strong>0,6 km/h</strong> a cada estágio, mediante o aumento de <strong>1m</strong> na distância de corrida.
          </p>
        </AccordionItem>

        {/* ── Manual de Utilização ── */}
        <AccordionItem title={t('aboutManualTitle')} icon={<FileText className="w-5 h-5" />}>
          <p className="text-sm text-muted-foreground leading-relaxed font-semibold">{t('aboutManualSub')}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('aboutManualDesc')}
          </p>

          <div className="space-y-2">
            <p className="text-sm font-semibold">{t('aboutMaterialsTitle')}</p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              {[
                t('aboutMaterial1'),
                t('aboutMaterial2'),
                t('aboutMaterial3'),
                t('aboutMaterial4'),
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Video Nível 1 — local */}
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" /> {t('aboutDemoVideo')}
            </p>
            <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-video">
              <video
                src="/videos/tcar-demo.mp4"
                className="w-full h-full object-contain"
                controls
                preload="metadata"
                playsInline
                title="Animação Oficial do T-CAR Nível 1"
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              {t('aboutVideoDesc')}
            </p>
          </div>

          {/* App Usage Guide */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-2">
            <p className="text-sm font-semibold">{t('aboutAppGuide')}</p>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>{t('aboutStep1')}</li>
              <li>{t('aboutStep2')}</li>
              <li>{t('aboutStep3')}</li>
              <li>{t('aboutStep4')}</li>
              <li>{t('aboutStep5')}</li>
              <li>{t('aboutStep6')}</li>
              <li>{t('aboutStep7')}</li>
            </ol>
          </div>
        </AccordionItem>

        {/* ── Downloads ── */}
        <AccordionItem title={t('aboutDownloadsTitle')} icon={<Download className="w-5 h-5" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                label: t('aboutFieldSheet'),
                sublabel: t('aboutFieldSheetSub'),
                icon: <FileText className="w-5 h-5 text-primary" />,
                href: 'https://testedecarminatti.wixsite.com/t-car/downloads',
              },
              {
                label: t('aboutAnimation'),
                sublabel: t('aboutAnimationSub'),
                icon: <Play className="w-5 h-5 text-primary" />,
                href: 'https://testedecarminatti.wixsite.com/t-car/downloads',
              },
              {
                label: t('aboutFullProtocol'),
                sublabel: t('aboutFullProtocolSub'),
                icon: <Download className="w-5 h-5 text-primary" />,
                href: 'https://testedecarminatti.wixsite.com/t-car/downloads',
              },
              {
                label: t('aboutPvTable'),
                sublabel: t('aboutPvTableSub'),
                icon: <FileText className="w-5 h-5 text-primary" />,
                href: 'https://testedecarminatti.wixsite.com/t-car/downloads',
              },
            ].map((item, i) => (
              <a
                key={i}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50 border border-border/50 hover:bg-secondary transition-colors"
              >
                <div className="p-2 bg-primary/10 rounded-lg">{item.icon}</div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold truncate">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.sublabel}</p>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
              </a>
            ))}
          </div>
          <a
            href="https://testedecarminatti.wixsite.com/t-car/downloads"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-primary font-semibold hover:underline mt-1"
          >
            {t('aboutSeeAllDownloads')} <ExternalLink className="w-3 h-3" />
          </a>
        </AccordionItem>

        {/* ── Publicações ── */}
        <AccordionItem title={t('aboutPubsTitle')} icon={<Star className="w-5 h-5" />}>
          <div className="space-y-3">
            {[
              {
                year: '2004',
                type: 'Artigo Original',
                title: 'A validade do teste T-CAR para determinação da velocidade de pico em jogadores de futebol.',
                authors: 'Carminatti, L.J. et al.',
                journal: 'Revista Brasileira de Ciência e Movimento',
                href: 'https://testedecarminatti.wixsite.com/t-car/c%C3%B3pia-downloads',
              },
              {
                year: '2013',
                type: 'Artigo de Pesquisa',
                title: 'Determinação do limiar anaeróbico em jogadores de futebol através do Teste T-CAR.',
                authors: 'Carminatti, L.J. et al.',
                journal: 'Motriz: Revista de Educação Física',
                href: 'https://testedecarminatti.wixsite.com/t-car/c%C3%B3pia-downloads',
              },
              {
                year: '2018',
                type: 'Estudo de Validação',
                title: 'Comparação do PV-TCAR com o VO₂máx em atletas de esportes intermitentes.',
                authors: 'Carminatti, L.J. et al.',
                journal: 'Journal of Sports Sciences',
                href: 'https://testedecarminatti.wixsite.com/t-car/c%C3%B3pia-downloads',
              },
            ].map((pub, i) => (
              <div key={i} className="p-4 rounded-xl bg-secondary/30 border-l-4 border-primary space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">{pub.type}</span>
                  <span className="text-[10px] text-muted-foreground">{pub.year}</span>
                </div>
                <p className="text-sm font-semibold leading-tight">{pub.title}</p>
                <p className="text-xs text-muted-foreground">{pub.authors}</p>
                <p className="text-xs text-muted-foreground italic">{pub.journal}</p>
                <a
                  href={pub.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline mt-1"
                >
                  {t('aboutPubAccess')} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}

            <a
              href="https://testedecarminatti.wixsite.com/t-car/c%C3%B3pia-downloads"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-primary font-semibold hover:underline mt-1"
            >
              {t('aboutSeeAllPubs')} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </AccordionItem>

        {/* ── Sistema T-CAR de Treinamento ── */}
        <AccordionItem title={t('aboutTrainingTitle')} icon={<Dumbbell className="w-5 h-5" />}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('aboutTrainingDesc')}
          </p>

          {/* Documentos */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">{t('aboutDocs')}</p>
            {[
              { label: t('aboutDocTraining'), sublabel: 'PDF' },
              { label: t('aboutDocSpreadsheetModel'), sublabel: 'XLSX' },
              { label: t('aboutDocSpreadsheetExample'), sublabel: 'XLSX' },
            ].map((doc, i) => (
              <a
                key={i}
                href="https://testedecarminatti.wixsite.com/t-car/c%C3%B3pia-publica%C3%A7%C3%B5es"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50 hover:bg-secondary transition-colors"
              >
                <div className="p-1.5 bg-primary/10 rounded-lg"><FileText className="w-4 h-4 text-primary" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{doc.label}</p>
                  <p className="text-[11px] text-muted-foreground">{doc.sublabel}</p>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>

          {/* Áudios de Treinamento */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">{t('aboutTrainingAudios')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: 'Opção 1a — 81% PV', sublabel: '5×5min · 17 rep/série' },
                { label: 'Opção 1b — 81% PV', sublabel: '6×5min · 17 rep/série' },
                { label: 'Opção 2a — 100% PV', sublabel: '4×4min · 10 rep/série' },
                { label: 'Opção 2b — 100% PV', sublabel: '4×5min · 13 rep/série' },
                { label: 'Opção 3a — 104% PV', sublabel: '4×4min · 20 rep/série' },
                { label: 'Opção 3b — 104% PV', sublabel: '4×5min · 25 rep/série' },
                { label: 'Opção 4a — 110% PV', sublabel: '4×3min · 7 rep/série' },
                { label: 'Opção 4b — 110% PV', sublabel: '5×3min · 7 rep/série' },
                { label: 'Opção 5a — 115% PV', sublabel: '4×4min · 14 rep/série' },
                { label: 'Opção 5b — 115% PV', sublabel: '5×4min · 14 rep/série' },
              ].map((audio, i) => (
                <a
                  key={i}
                  href="https://testedecarminatti.wixsite.com/t-car/c%C3%B3pia-publica%C3%A7%C3%B5es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 border border-border/50 hover:bg-secondary transition-colors"
                >
                  <div className="p-1 bg-primary/10 rounded"><Download className="w-3.5 h-3.5 text-primary" /></div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{audio.label}</p>
                    <p className="text-[10px] text-muted-foreground">{audio.sublabel}</p>
                  </div>
                </a>
              ))}
            </div>
            <a
              href="https://testedecarminatti.wixsite.com/t-car/c%C3%B3pia-publica%C3%A7%C3%B5es"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-primary font-semibold hover:underline mt-1"
            >
              {t('aboutSeeAllAudios')} <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* PRO callout */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm font-semibold text-primary mb-1 flex items-center gap-2">
              <Rocket className="w-4 h-4" /> {t('aboutSoonPro')}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('aboutProDesc')}
            </p>
          </div>
        </AccordionItem>

        {/* ── Site Oficial ── */}
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t('aboutOfficialSite')}</p>
            <p className="text-xs text-muted-foreground truncate">testedecarminatti.wixsite.com/t-car</p>
          </div>
          <a
            href="https://testedecarminatti.wixsite.com/t-car"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-primary"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* ── Footer ── */}
        <div className="text-center py-2 space-y-1">
          <p className="text-xs text-muted-foreground">
            {t('aboutFooterRights')}
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-2">
            T-CAR App
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Link to="/privacy" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter">{t('privacyPolicy')}</Link>
            <Link to="/terms" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter">{t('termsOfUse')}</Link>
          </div>
        </div>

      </div>
    </PageContainer>
  );
}
