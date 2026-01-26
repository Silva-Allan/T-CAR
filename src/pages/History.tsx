import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, Trash2, Calendar, Gauge, Clock, ChevronDown, ChevronUp, Users, ExternalLink, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalculatorService } from '@/services/CalculatorService';
import { SupabaseService } from '@/services/SupabaseService';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TestWithResults {
  id: string;
  protocol_level: number;
  total_time: number;
  date: string;
  test_results: {
    id: string;
    athlete_name: string;
    peak_velocity: number;
    completed_stages: number;
    final_distance: number;
    heart_rate: number | null;
    eliminated_by_failure: boolean;
  }[];
}

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tests, setTests] = useState<TestWithResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadTests();
  }, [user, navigate]);

  const loadTests = async () => {
    try {
      const data = await SupabaseService.getTests();
      setTests(data as TestWithResults[]);
    } catch (error) {
      console.error('Error loading tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await SupabaseService.deleteTest(deleteId);
      setTests(tests.filter(t => t.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting test:', error);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Atleta', 'Protocolo', 'PV-TCAR', 'Estágios', 'Distância', 'FC'];
    
    const rows = tests.flatMap(test => 
      test.test_results.map(result => [
        new Date(test.date).toLocaleDateString('pt-BR'),
        result.athlete_name,
        `Nível ${test.protocol_level}`,
        Number(result.peak_velocity).toFixed(2),
        result.completed_stages.toString(),
        `${result.final_distance}m`,
        result.heart_rate?.toString() || '-'
      ])
    );

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tcar_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <PageContainer title={t('historyTitle')} showBack backTo="/">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title={t('historyTitle')} 
      showBack 
      backTo="/"
      action={
        tests.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleExportCSV}>
            <FileDown className="w-4 h-4 mr-1" />
            CSV
          </Button>
        )
      }
    >
      <div className="max-w-md mx-auto">
        {/* Search Bar */}
        <div className="mb-4 relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            placeholder={t('filterDate')}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>

        {tests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{t('noTestsPerformed')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tests
              .filter(test => !dateFilter || test.date.startsWith(dateFilter))
              .map((test, index) => (
              <div
                key={test.id}
                className="glass-card rounded-xl animate-fade-in overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {test.test_results.length} atleta{test.test_results.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(test.date)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/test/${test.id}`)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteId(test.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Athletes preview */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {test.test_results.slice(0, 3).map(result => (
                      <span 
                        key={result.id}
                        className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground"
                      >
                        {result.athlete_name}
                      </span>
                    ))}
                    {test.test_results.length > 3 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                        +{test.test_results.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Gauge className="w-4 h-4" />
                      <span>{t('level')} {test.protocol_level}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{CalculatorService.formatTime(test.total_time)}</span>
                    </div>
                  </div>

                  {/* Expand button */}
                  <button
                    className="w-full mt-3 pt-3 border-t border-border/50 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setExpandedId(expandedId === test.id ? null : test.id)}
                  >
                    {expandedId === test.id ? (
                      <>{t('collapse')} <ChevronUp className="w-4 h-4" /></>
                    ) : (
                      <>{t('viewResults')} <ChevronDown className="w-4 h-4" /></>
                    )}
                  </button>
                </div>

                {/* Expanded content */}
                {expandedId === test.id && (
                  <div className="border-t border-border/50 p-4 bg-secondary/30 space-y-2">
                    {test.test_results
                      .sort((a, b) => Number(b.peak_velocity) - Number(a.peak_velocity))
                      .map((result, idx) => (
                      <div 
                        key={result.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg bg-background/50",
                          result.eliminated_by_failure && "border border-destructive/30"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-medium text-sm">{result.athlete_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {result.completed_stages} estágios • {result.final_distance}m
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-primary">
                            {Number(result.peak_velocity).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">km/h</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTestTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteTestDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
