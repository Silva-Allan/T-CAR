import { PageContainer } from '@/components/layout/PageContainer';
import { Gavel, CheckCircle, AlertCircle, Info, Copyright, Scale } from 'lucide-react';

export default function TermsOfUse() {
    return (
        <PageContainer title="Termos de Uso" showBack backTo="/about" branded>
            <div className="max-w-3xl mx-auto space-y-8 pb-12 px-4">

                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2">
                        <Gavel className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">Regras de Utilização</h2>
                    <p className="text-muted-foreground text-sm">Atualizado em 1 de Março de 2026</p>
                </div>

                <div className="glass-card p-6 rounded-2xl space-y-6 text-sm leading-relaxed text-muted-foreground">

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Info className="w-4 h-4 text-primary" /> 1. Aceitação e Objeto
                        </h3>
                        <p>
                            Ao acessar ou utilizar a plataforma <strong>T-CAR</strong>, você concorda legalmente com estes termos.
                            A plataforma é um software como serviço (SaaS) destinado ao suporte de protocolos de fisiologia do exercício,
                            não substituindo a supervisão de profissionais de saúde qualificados.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-primary" /> 2. Responsabilidades do Usuário
                        </h3>
                        <p>O Usuário (Treinador/Avaliador) compromete-se a:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Operar o sistema em conformidade com as diretrizes acadêmicas do protocolo.</li>
                            <li>Manter o sigilo de suas credenciais de acesso (e-mail e senha).</li>
                            <li>Identificar-se corretamente, sem utilizar identidades falsas ou de terceiros.</li>
                            <li><strong>Responsabilidade In Totum</strong> sobre os dados de atletas cadastrados, garantindo que possui base legal (consentimento ou legítimo interesse) para tal.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-primary" /> 3. Uso Proibido e Ética Profissional
                        </h3>
                        <p>É vedado ao usuário:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Explorar vulnerabilidades de segurança ou realizar engenharia reversa no código do App.</li>
                            <li>Utilizar o sistema para fins de coleta de dados massivos não autorizados.</li>
                            <li>Cadastrar atletas sem a devida triagem de anamnese e saúde física necessária para a execução de um teste de esforço máximo.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Copyright className="w-4 h-4 text-primary" /> 4. Propriedade Intelectual e Científica
                        </h3>
                        <p>
                            O protocolo <strong>T-CAR</strong> e suas metodologias de correção fotogramétrica e biomecânica são resultados de pesquisa científica
                            encabeçada pelo <strong>Prof. Dr. Lorival Carminatti</strong> e pela <strong>UDESC</strong>.
                        </p>
                        <p>
                            A plataforma digital, seu design, logotipos e algoritmos de interface são de propriedade exclusiva do desenvolvedor licenciante.
                            O uso da plataforma concede uma licença de uso pessoal e intransferível, não permitindo a venda de acesso ou redistribuição da ferramenta.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Scale className="w-4 h-4 text-primary" /> 5. Isenção de Garantias e Responsabilidade
                        </h3>
                        <p>
                            Dada a natureza de esforço físico do protocolo, os desenvolvedores e licenciantes <strong>não se responsabilizam</strong> por quaisquer lesões,
                            mal súbito ou danos físicos decorrentes da execução do teste. A supervisão médica e técnica é de inteira responsabilidade do avaliador em campo.
                        </p>
                        <p>
                            O sistema é fornecido "no estado em que se encontra" (as is), sem garantias de disponibilidade ininterrupta ou isenção total de bugs.
                        </p>
                    </section>

                    <section className="space-y-3 border-t border-border pt-6">
                        <p className="font-bold text-foreground">Foro e Legislação</p>
                        <p>Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da Comarca de Florianópolis/SC para dirimir controvérsias.</p>
                    </section>
                </div>
            </div>
        </PageContainer>
    );
}
