import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User, TrendingUp, TrendingDown, Minus, Calendar, Trophy, Loader2,
  Download, Heart, Activity, ChevronDown
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/test/StatCard';
import { SupabaseService } from '@/services/SupabaseService';
import { ClassificationService } from '@/services/ClassificationService';
import { ExportService } from '@/services/ExportService';
import { useAuth } from '@/hooks/useAuth';
import { calculateAge, calculateCategory } from '@/models/types';
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
  const [trainerProfile, setTrainerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const loadInitialData = async () => {
      if (!id) return;
      try {
        const [athleteData, profileData] = await Promise.all([
          SupabaseService.getAthlete(id),
          SupabaseService.getProfile(),
        ]);
        setAthlete(athleteData);
        setTrainerProfile(profileData);
        await loadTests(0, true);
      } catch (error) {
        console.error('Error loading athlete:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [id, user, navigate]);

  const loadTests = async (pageToLoad: number, isInitial = false) => {
    if (!id) return;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const testsData = await SupabaseService.getAthleteTestHistory(id, pageToLoad, PAGE_SIZE);

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

      if (isInitial) {
        setTests(normalized);
      } else {
        setTests(prev => [...prev, ...normalized]);
      }

      setHasMore(normalized.length === PAGE_SIZE);
      setPage(pageToLoad);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadTests(page + 1);
    }
  };

  // Bug fix: date-only strings like '2026-03-01' are parsed as UTC midnight
  // which shows the previous day in Brazil (UTC-3). Fix: use noon local time.
  const formatDate = (dateString: string) => {
    const normalized = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
    return new Date(normalized).toLocaleDateString('pt-BR', {
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
      fcType: t.fc_final != null ? 'medida' : t.fc_estimada != null ? 'estimada' : null,
      reps: t.total_reps,
      level: t.test.protocol_level,
    }));

  // Beautiful custom Tooltip
  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0]?.payload;
    const fcLabel = d?.fc != null
      ? `${d.fc} bpm ${d.fcType === 'estimada' ? '(est.)' : ''}`
      : 'Não informada';
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-primary/30 rounded-2xl shadow-2xl p-4 text-xs min-w-[160px] space-y-2" style={{ boxShadow: '0 0 0 1px hsl(var(--primary)/0.2), 0 8px 32px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <p className="font-bold text-sm">{label}</p>
          <span className="ml-auto text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">Nível {d?.level}</span>
        </div>
        {/* PV Corrigido */}
        <div className="flex justify-between items-center gap-6">
          <span className="text-muted-foreground">PV Corrigido</span>
          <span className="font-bold text-primary text-sm">{d?.pv?.toFixed(1)} <span className="font-normal text-[10px]">km/h</span></span>
        </div>
        {/* PV Bruto */}
        <div className="flex justify-between items-center gap-6">
          <span className="text-muted-foreground">PV Bruto</span>
          <span className="font-mono text-[11px]">{d?.pvBruto?.toFixed(1)} km/h</span>
        </div>
        {/* Divider */}
        <div className="h-px bg-border/50" />
        {/* FC */}
        <div className="flex justify-between items-center gap-6">
          <span className="text-muted-foreground flex items-center gap-1">❤️ FC</span>
          <span className={cn('font-mono text-[11px]', d?.fc != null ? 'text-rose-500 font-semibold' : 'text-muted-foreground/60 italic')}>
            {fcLabel}
          </span>
        </div>
        {/* Reps */}
        <div className="flex justify-between items-center gap-6">
          <span className="text-muted-foreground">Repetições</span>
          <span className="font-mono text-[11px]">{d?.reps}</span>
        </div>
      </div>
    );
  };

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
        { chartImage, team: (trainerProfile as any)?.club ?? undefined, classification, lastTestDate: lastTest?.test.date ?? undefined }
      );
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    }
  };

  const handleExportJson = () => {
    if (!athlete || tests.length === 0) return;
    const data = {
      athlete: {
        name: athlete.name,
        team: athlete.team,
        position: athlete.position,
        birth_date: athlete.birth_date,
        gender: athlete.gender,
      },
      history: tests.map(t => ({
        date: t.test.date,
        protocol: t.test.protocol_level,
        pv_corrigido: Number(t.pv_corrigido),
        pv_bruto: Number(t.pv_bruto),
        fc_final: t.fc_final,
        fc_estimada: t.fc_estimada,
        distancia: t.final_distance,
        repeticoes: t.total_reps
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tcar-atleta-${athlete.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
            <div className="flex justify-center gap-3 mt-2">
              <span className="text-xs bg-secondary/50 px-2 py-1 rounded-md text-muted-foreground">
                Nascimento: {formatDate(athlete.birth_date)}
              </span>
              <span className="text-xs bg-primary/10 px-2 py-1 rounded-md text-primary font-bold">
                {calculateAge(athlete.birth_date)} anos
              </span>
              <span className="text-xs bg-primary/10 px-2 py-1 rounded-md text-primary font-bold">
                {calculateCategory(athlete.birth_date)}
              </span>
            </div>
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
              value={stats.best.toFixed(1)}
              icon={<Trophy className="w-4 h-4 text-success" />}
            />
            <StatCard
              label="Média PV"
              value={stats.average.toFixed(1)}
              icon={<Minus className="w-4 h-4" />}
            />
            <StatCard
              label="Menor PV"
              value={stats.worst.toFixed(1)}
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
            <div className="h-80" ref={chartRef}>
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
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="pv"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="PV Corrigido"
                  >
                    {/* PV label on top */}
                    <LabelList
                      dataKey="pv"
                      position="top"
                      formatter={(value: number) => value.toFixed(1)}
                      style={{ fill: 'hsl(var(--foreground))', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}
                    />
                    {/* FC label inside or below PV label */}
                    <LabelList
                      dataKey="fc"
                      position="insideTop"
                      formatter={(value: number | null) => value != null ? `${value}bpm` : ''}
                      style={{ fill: 'rgb(251,113,133)', fontSize: 8, fontWeight: '600' }}
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
                        value: `Média: ${avgPV.toFixed(1)}`,
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
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleExportJson} className="text-[10px] h-8">
                  <Download className="w-3.5 h-3.5 mr-1 text-primary" />
                  JSON
                </Button>
                <Button variant="ghost" size="sm" onClick={handleExportHistory} className="text-[10px] h-8">
                  <Download className="w-3.5 h-3.5 mr-1" />
                  PDF
                </Button>
              </div>
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
                        {Number(test.pv_corrigido).toFixed(1)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">PV corr. km/h</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && tests.length > 0 && (
            <div className="py-2 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="text-primary hover:bg-primary/10"
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 mr-2" />
                )}
                Carregar mais histórico
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
