import { PageContainer } from '@/components/layout/PageContainer';
import { Shield, Lock, Eye, Trash2, FileText, Scale } from 'lucide-react';

export default function PrivacyPolicy() {
    return (
        <PageContainer title="Política de Privacidade" showBack backTo="/about" branded>
            <div className="max-w-3xl mx-auto space-y-8 pb-12 px-4">

                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">Privacidade e Proteção de Dados</h2>
                    <p className="text-muted-foreground text-sm">Atualizado em 1 de Março de 2026</p>
                </div>

                <div className="glass-card p-6 rounded-2xl space-y-6 text-sm leading-relaxed text-muted-foreground">

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Eye className="w-4 h-4 text-primary" /> 1. Introdução
                        </h3>
                        <p>
                            Esta Política de Privacidade descreve como o sistema <strong>T-CAR (Test de Course avec Accélération et Récupération)</strong>
                            coleta, utiliza e protege as informações no âmbito da <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD)</strong>.
                        </p>
                        <p>
                            Ao utilizar esta plataforma, o treinador/avaliador atua como <strong>Controlador</strong> dos dados dos atletas,
                            sendo responsável por obter o consentimento necessário, enquanto a plataforma (e sua infraestrutura técnica) atua como <strong>Operadora</strong>.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" /> 2. Dados Coletados e Natureza
                        </h3>
                        <p>Coletamos apenas os dados estritamente necessários para a execução e análise do protocolo científico, seguindo o princípio da <strong>Minimização</strong>:</p>
                        <div className="space-y-4 pl-2">
                            <div>
                                <p className="font-bold text-foreground">A. Dados do Usuário (Treinador):</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>Identificação: Nome completo e endereço de e-mail (para autenticação).</li>
                                    <li>Perfil: Nome da equipe/clube e localização profissional.</li>
                                    <li>Técnicos: Registros de acesso (logs) e preferências de áudio/idioma.</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-bold text-foreground">B. Dados dos Atletas (Inseridos pelo Treinador):</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>Identificação: Nome ou pseudônimo.</li>
                                    <li>Biométricos Opcionais: Sexo e data de nascimento (usados para cálculos de percentis e classificações científicas).</li>
                                    <li>Performance: Velocidade de Pico (PV), frequências cardíacas, distâncias percorridas e resultados históricos.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Lock className="w-4 h-4 text-primary" /> 3. Finalidade e Processamento
                        </h3>
                        <p>Os dados são processados com as seguintes finalidades legítimas:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><strong>Execução do Protocolo</strong>: Cálculos automáticos de carga e intensidade baseados no PV.</li>
                            <li><strong>Análise Longitudinal</strong>: Geração de gráficos de evolução e comparação de performance.</li>
                            <li><strong>Gestão de Equipe</strong>: Organização de rankings internos e dashboards de grupo.</li>
                            <li><strong>Segurança</strong>: Prevenção de acessos indevidos e proteção contra perda de dados através de sincronização segura.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Scale className="w-4 h-4 text-primary" /> 4. Armazenamento e Retenção
                        </h3>
                        <p>
                            Os dados são armazenados em nuvem através de provedores líderes de mercado (Supabase/AWS/Google Cloud),
                            utilizando centros de dados que seguem padrões internacionais de segurança.
                        </p>
                        <p>
                            <strong>Retenção:</strong> Os dados permanecem vinculados à sua conta enquanto ela estiver ativa.
                            Caso você opte por excluir sua conta nas Configurações, todos os dados vinculados (atletas, testes e perfil)
                            serão removidos permanentemente de nossas bases ativas em um prazo máximo de 30 dias.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" /> 5. Segurança da Informação
                        </h3>
                        <p>Implementamos camadas rigorosas de proteção:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><strong>Criptografia</strong>: Dados transmitidos via TLS/SSL e armazenados com criptografia em repouso.</li>
                            <li><strong>Isolamento (RLS)</strong>: Nossos bancos de dados utilizam Row Level Security, garantindo que o Usuário A nunca possa "enxergar" os dados do Usuário B.</li>
                            <li><strong>Limpeza Local (Secure Wipe)</strong>: Ao realizar logout, limpamos automaticamente o cache do seu navegador (IndexedDB) para proteger dados em dispositivos compartilhados.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-primary" /> 6. Direitos do Titular de Dados
                        </h3>
                        <p>Você e seus atletas (através de você) possuem direitos garantidos pela LGPD:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><strong>Confirmação e Acesso</strong>: Saber se tratamos dados e acessá-los.</li>
                            <li><strong>Correção</strong>: Atualizar nomes ou métricas incorretas.</li>
                            <li><strong>Eliminação</strong>: Solicitar a exclusão definitiva.</li>
                            <li><strong>Portabilidade</strong>: Oferecemos ferramenta de exportação em JSON para que você leve seus dados para onde desejar.</li>
                        </ul>
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
