import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, TrendingUp, TrendingDown, Minus, Calendar, Trophy, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/test/StatCard';
import { SupabaseService } from '@/services/SupabaseService';
import { useAuth } from '@/hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface AthleteData {
  id: string;
  name: string;
  sport: string | null;
  team: string | null;
  position: string | null;
  birth_date: string | null;
}

interface TestResultWithTest {
  id: string;
  peak_velocity: number;
  completed_stages: number;
  final_distance: number;
  heart_rate: number | null;
  eliminated_by_failure: boolean;
  created_at: string;
  tests: {
    date: string;
    protocol_level: number;
  } | null;
}

export default function AthleteProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [athlete, setAthlete] = useState<AthleteData | null>(null);
  const [tests, setTests] = useState<TestResultWithTest[]>([]);
  const [loading, setLoading] = useState(true);

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
          SupabaseService.getAthleteTests(id)
        ]);
        setAthlete(athleteData as AthleteData);
        setTests((testsData as unknown) as TestResultWithTest[]);
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

  const getSportLabel = (sport: string | null) => {
    switch (sport) {
      case 'athletics': return 'Atletismo';
      case 'cycling': return 'Ciclismo';
      default: return 'Outro';
    }
  };

  // Calculate statistics
  const getStats = () => {
    if (tests.length === 0) return null;

    const velocities = tests.map(t => Number(t.peak_velocity));
    const best = Math.max(...velocities);
    const worst = Math.min(...velocities);
    const average = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    
    // Trend (compare last 3 with previous 3)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (tests.length >= 6) {
      const recent = velocities.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const previous = velocities.slice(3, 6).reduce((a, b) => a + b, 0) / 3;
      if (recent > previous * 1.02) trend = 'up';
      else if (recent < previous * 0.98) trend = 'down';
    }

    return { best, worst, average, trend };
  };

  const stats = getStats();

  // Chart data
  const chartData = tests
    .filter(t => t.tests)
    .slice()
    .reverse()
    .map(t => ({
      date: formatDate(t.tests!.date),
      pv: Number(t.peak_velocity)
    }));

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
            {getSportLabel(athlete.sport)}
            {athlete.team && ` • ${athlete.team}`}
          </p>
          {athlete.position && (
            <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-secondary">
              {athlete.position}
            </span>
          )}
        </div>

        {/* Statistics */}
        {stats && (
          <>
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

            {/* Chart */}
            {chartData.length > 1 && (
              <div className="glass-card p-4 rounded-xl">
                <h3 className="font-semibold mb-4">Evolução do PV-TCAR</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        domain={['dataMin - 0.5', 'dataMax + 0.5']}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="pv" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {/* Test History */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Histórico de Testes ({tests.length})
          </h3>
          
          {tests.length === 0 ? (
            <div className="glass-card p-8 rounded-xl text-center">
              <p className="text-muted-foreground">Nenhum teste realizado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tests.map((test, index) => (
                <div
                  key={test.id}
                  className={cn(
                    "glass-card p-4 rounded-xl flex items-center justify-between animate-fade-in",
                    test.eliminated_by_failure && "border-destructive/30"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {test.tests ? `${formatDate(test.tests.date)} • Nível ${test.tests.protocol_level}` : 'Data não disponível'}
                    </p>
                    {test.eliminated_by_failure && (
                      <span className="text-xs text-destructive">2 falhas consecutivas</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-mono font-bold text-primary">
                      {Number(test.peak_velocity).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">km/h</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
