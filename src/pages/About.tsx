import { ExternalLink, Activity } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';

export default function About() {
  return (
    <PageContainer title="Sobre o Teste" showBack backTo="/">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Teste de Carminatti</h2>
          <p className="text-muted-foreground">T-CAR</p>
        </div>

        {/* Description */}
        <div className="glass-card p-5 rounded-xl space-y-4">
          <h3 className="font-semibold">O que é?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Teste de Carminatti (T-CAR) é um teste incremental intermitente desenvolvido para avaliar a capacidade aeróbica de atletas de esportes coletivos, especialmente futebol.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Diferente de testes contínuos, o T-CAR simula as características intermitentes dos esportes de campo, alternando corridas de ida e volta com mudanças de direção.
          </p>
        </div>

        {/* Protocol details */}
        <div className="glass-card p-5 rounded-xl space-y-4">
          <h3 className="font-semibold">Características</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Estágios de 90 segundos:</strong> Cada estágio contém 5 repetições de corridas de ida e volta
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Ritmo controlado:</strong> A cada 6 segundos, um bipe indica o momento de iniciar nova corrida
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Progressão:</strong> A cada estágio, a distância aumenta 1m e a velocidade aumenta 0,6 km/h
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Critério de exaustão:</strong> O teste termina após 2 falhas consecutivas
              </span>
            </li>
          </ul>
        </div>

        {/* Result interpretation */}
        <div className="glass-card p-5 rounded-xl space-y-4">
          <h3 className="font-semibold">Resultado: PV-TCAR</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Pico de Velocidade (PV-TCAR) representa a maior velocidade alcançada pelo atleta durante o teste. Este valor é utilizado para:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Prescrição de treinamentos intervalados</li>
            <li>• Monitoramento da evolução da condição física</li>
            <li>• Comparação entre atletas</li>
            <li>• Individualização de zonas de treinamento</li>
          </ul>
        </div>

        {/* References */}
        <div className="glass-card p-5 rounded-xl">
          <h3 className="font-semibold mb-3">Referências</h3>
          <a
            href="https://www.scielo.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Artigos científicos sobre T-CAR
          </a>
        </div>

        {/* Version */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            T-CAR App v1.0.0
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Desenvolvido para fins educacionais
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
