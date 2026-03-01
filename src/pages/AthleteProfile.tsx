import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User, TrendingUp, TrendingDown, Minus, Calendar, Trophy, Loader2,
  Download, Heart, Activity
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/test/StatCard';
import { SupabaseService } from '@/services/SupabaseService';
import { ClassificationService } from '@/services/ClassificationService';
import { ExportService } from '@/services/ExportService';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, LabelList, Cell
} from 'recharts';
import { cn } from '@/lib/utils';

interface TestHistoryItem {
  id: string;
  pv_corrigido: number;
  pv_bruto: number;
  total_reps: number;
  completed_stages: number;
  fc_final: number | null;
  fc_estimada: number | null;
  final_distance: number;
  eliminated_by_failure: boolean;
  created_at: string;
  test: {
    date: string;
    protocol_level: number;
  };
}

export default function AthleteProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [athlete, setAthlete] = useState<any>(null);
  const [tests, setTests] = useState<TestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const loadData = async () => {
      if (!id) return;
      try {
        const [athleteData, testsData] = await Promise.all([
          SupabaseService.getAthlete(id),
          SupabaseService.getAthleteTestHistory(id)
        ]);
        setAthlete(athleteData);

        // Debug: log raw data from Supabase to understand the structure
        if (testsData.length > 0) {
          console.log('[AthleteProfile] Raw test data sample:', JSON.stringify(testsData[0], null, 2));
        }

        // Normalize data — handle Supabase returning numeric as string,
        // and test relation possibly being array or object
        const normalized: TestHistoryItem[] = (testsData as any[]).map((row: any) => {
          const testRelation = Array.isArray(row.test) ? row.test[0] : row.test;
          return {
            id: row.id,
            pv_corrigido: parseFloat(row.pv_corrigido) || 0,
            pv_bruto: parseFloat(row.pv_bruto) || 0,
            total_reps: parseInt(row.total_reps) || 0,
            completed_stages: parseInt(row.completed_stages) || 0,
            fc_final: row.fc_final != null ? parseInt(row.fc_final) : null,
            fc_estimada: row.fc_estimada != null ? parseInt(row.fc_estimada) : null,
            final_distance: parseFloat(row.final_distance) || 0,
            eliminated_by_failure: Boolean(row.eliminated_by_failure),
            created_at: row.created_at,
            test: {
              date: testRelation?.date || row.created_at,
              protocol_level: parseInt(testRelation?.protocol_level) || 1,
            },
          };
        });

        setTests(normalized);
      } catch (error) {
        console.error('Error loading athlete:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, user, navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  // Statistics based on PV corrigido
  const getStats = () => {
    if (tests.length === 0) return null;

    const pvValues = tests.map(t => Number(t.pv_corrigido));
    const best = Math.max(...pvValues);
    const worst = Math.min(...pvValues);
    const average = pvValues.reduce((a, b) => a + b, 0) / pvValues.length;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (tests.length >= 6) {
      const recent = pvValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const previous = pvValues.slice(3, 6).reduce((a, b) => a + b, 0) / 3;
      if (recent > previous * 1.02) trend = 'up';
      else if (recent < previous * 0.98) trend = 'down';
    }

    return { best, worst, average, trend };
  };

  const stats = getStats();

  // Classificação baseada no ÚLTIMO teste (regra T-CAR)
  const lastTest = tests[0];
  const classification = lastTest
    ? ClassificationService.getClassification(
      lastTest.test.protocol_level as 1 | 2,
      Number(lastTest.pv_corrigido)
    )
    : null;

  // Chart data — barras para cada teste + linha da média
  const chartData = tests
    .slice()
    .reverse()
    .map(t => ({
      date: formatDate(t.test.date),
      pv: Number(t.pv_corrigido),
      pvBruto: Number(t.pv_bruto),
      fc: t.fc_final ?? t.fc_estimada ?? null,
      level: t.test.protocol_level,
    }));

  const avgPV = stats?.average ?? 0;

  const handleExportHistory = async () => {
    if (!athlete || tests.length === 0) return;
    try {
      // Capture chart image
      const chartImage = await ExportService.captureChartAsImage(chartRef.current);

      await ExportService.exportAthleteHistoryToPDF(
        athlete.name,
        tests.map(t => ({
          date: t.test.date,
          protocolLevel: t.test.protocol_level,
          pvCorrigido: Number(t.pv_corrigido),
          pvBruto: Number(t.pv_bruto),
          fcFinal: t.fc_final,
          fcEstimada: t.fc_estimada,
          totalReps: t.total_reps,
          completedStages: t.completed_stages,
          finalDistance: Number(t.final_distance),
        })),
        { chartImage }
      );
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Perfil do Atleta" showBack backTo="/athletes">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  if (!athlete) {
    return (
      <PageContainer title="Perfil do Atleta" showBack backTo="/athletes">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Atleta não encontrado</p>
          <Button onClick={() => navigate('/athletes')} className="mt-4">
            Voltar
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Perfil do Atleta" showBack backTo="/athletes">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Athlete Header */}
        <div className="glass-card p-6 rounded-xl text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
            <User className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-1">{athlete.name}</h2>
          <p className="text-muted-foreground">
            {athlete.team && athlete.team}
            {athlete.position && ` • ${athlete.position}`}
          </p>
          {athlete.birth_date && (
            <p className="text-xs text-muted-foreground mt-1">
              Nascimento: {formatDate(athlete.birth_date)}
            </p>
          )}
        </div>

        {/* Classification Card — ONLY based on last test (regra T-CAR) */}
        {classification && lastTest && (
          <div className="glass-card p-6 rounded-xl text-center" style={{
            borderColor: `${classification.color}50`,
            borderWidth: '1px',
          }}>
            <Activity className="w-6 h-6 mx-auto mb-2" style={{ color: classification.color }} />
            <h3 className="text-sm text-muted-foreground mb-1">Classificação Atual</h3>
            <p className="text-3xl font-bold" style={{ color: classification.color }}>
              {classification.label}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Percentil {classification.percentile} • Nível {lastTest.test.protocol_level}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Baseado no último teste ({formatDate(lastTest.test.date)})
            </p>
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Melhor PV"
              value={stats.best.toFixed(2)}
              icon={<Trophy className="w-4 h-4 text-success" />}
            />
            <StatCard
              label="Média PV"
              value={stats.average.toFixed(2)}
              icon={<Minus className="w-4 h-4" />}
            />
            <StatCard
              label="Menor PV"
              value={stats.worst.toFixed(2)}
              icon={<TrendingDown className="w-4 h-4 text-destructive" />}
            />
            <StatCard
              label="Tendência"
              value={stats.trend === 'up' ? 'Melhora' : stats.trend === 'down' ? 'Queda' : 'Estável'}
              icon={
                stats.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : stats.trend === 'down' ? (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                ) : (
                  <Minus className="w-4 h-4" />
                )
              }
            />
          </div>
        )}

        {/* Chart — Barras (testes) + Linha da Média + Labels PV */}
        {chartData.length >= 1 && (
          <div className="glass-card p-4 rounded-xl">
            <h3 className="font-semibold mb-4">Evolução PV Corrigido</h3>
            <div className="h-64" ref={chartRef}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <YAxis
                    domain={['dataMin - 0.5', 'dataMax + 0.5']}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'PV Corrigido') return [`${value.toFixed(2)} km/h`, 'PV Corrigido'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Bar
                    dataKey="pv"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="PV Corrigido"
                  >
                    <LabelList
                      dataKey="pv"
                      position="top"
                      formatter={(value: number) => value.toFixed(2)}
                      style={{
                        fill: 'hsl(var(--foreground))',
                        fontSize: 10,
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                      }}
                    />
                  </Bar>
                  {/* Linha da média geral */}
                  {chartData.length > 1 && (
                    <ReferenceLine
                      y={avgPV}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{
                        value: `Média: ${avgPV.toFixed(2)}`,
                        position: 'insideTopRight',
                        fill: 'hsl(var(--destructive))',
                        fontSize: 10,
                      }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Test History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Histórico ({tests.length})
            </h3>
            {tests.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleExportHistory}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
            )}
          </div>

          {tests.length === 0 ? (
            <div className="glass-card p-8 rounded-xl text-center">
              <p className="text-muted-foreground">Nenhum teste realizado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tests.map((test, index) => {
                const testClassification = ClassificationService.getClassification(
                  test.test.protocol_level as 1 | 2,
                  Number(test.pv_corrigido)
                );
                const fc = test.fc_final ?? test.fc_estimada;

                return (
                  <div
                    key={test.id}
                    className={cn(
                      "glass-card p-4 rounded-xl flex items-center justify-between animate-fade-in",
                      test.eliminated_by_failure && "border-destructive/30"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(test.test.date)} • Nível {test.test.protocol_level}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${testClassification.color}20`,
                            color: testClassification.color
                          }}>
                          {testClassification.label}
                        </span>
                        {fc != null && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {test.fc_final != null ? fc : `~${fc}`} bpm
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-mono font-bold text-primary">
                        {Number(test.pv_corrigido).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">PV corr. km/h</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
