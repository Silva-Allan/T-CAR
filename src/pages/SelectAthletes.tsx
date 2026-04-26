import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, User, ChevronRight, Users, Loader2, Search, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SupabaseService } from '@/services/SupabaseService';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/store/AppContext';
import { Athlete } from '@/models/types';
import { cn } from '@/lib/utils';

const MAX_ATHLETES = 10;
const MIN_ATHLETES = 1;

interface ExtendedAthlete extends Athlete {
  pvTcar?: number;
}

export default function SelectAthletes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setSelectedAthletes } = useApp();
  const { t } = useTranslation();
  const [athletes, setAthletes] = useState<ExtendedAthlete[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNewForm, setShowNewForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadAthletes(0, true);
  }, [user, navigate]);

  const loadAthletes = async (pageToLoad: number, isInitial = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      // Busca atletas e últimos resultados em paralelo
      const [athletesRaw, latestResults] = await Promise.all([
        SupabaseService.getAthletes(pageToLoad, PAGE_SIZE),
        isInitial ? SupabaseService.getLatestResultPerAthlete() : Promise.resolve([])
      ]);

      // Cria um mapa para busca rápida do último PV (athlete_id -> pv_corrigido)
      const resultsMap = new Map();
      latestResults.forEach(r => {
        resultsMap.set(r.athlete_id, r.pv_corrigido);
      });

      const athletesData: ExtendedAthlete[] = athletesRaw.map(a => ({
        id: a.id,
        userId: a.user_id,
        name: a.name,
        team: a.team,
        position: a.position,
        birthDate: a.birth_date || undefined,
        createdAt: a.created_at,
        // Se já tivermos o pv_tcar no objeto (futuro) ou se encontrarmos no mapa de resultados
        pvTcar: (a as any).pv_tcar || resultsMap.get(a.id)
      }));

      if (isInitial) {
        setAthletes(athletesData);
      } else {
        setAthletes(prev => {
          // Se for carregamento incremental, precisamos garantir que os novos atletas também 
          // recebam seus PVs caso eles estivessem no resultsMap inicial
          if (!isInitial && latestResults.length === 0) {
            // Em loads subsequentes, podemos precisar buscar mais resultados ou usar cache
            // Por enquanto, o resultsMap já cobre os atletas da primeira página.
          }
          return [...prev, ...athletesData];
        });
      }

      setHasMore(athletesRaw.length === PAGE_SIZE);
      setPage(pageToLoad);
    } catch (error) {
      console.error('Error loading athletes:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadAthletes(page + 1);
    }
  };

  const handleToggleAthlete = (athlete: Athlete) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(athlete.id)) {
      newSet.delete(athlete.id);
    } else if (newSet.size < MAX_ATHLETES) {
      newSet.add(athlete.id);
    }
    setSelectedIds(newSet);
  };

  const handleQuickAdd = async () => {
    if (!newName.trim() || submitting) return;
    setSubmitting(true);

    try {
      const newAthlete = await SupabaseService.createAthlete({
        name: newName.trim(),
        birth_date: newBirthDate || null,
        position: newPosition || null,
        team: null,
        sport: 'athletics'
      });
      await loadAthletes(0, true);
      setSelectedIds(prev => new Set([...prev, newAthlete.id]));
      setNewName('');
      setNewBirthDate('');
      setNewPosition('');
      setShowNewForm(false);
    } catch (error) {
      console.error('Error creating athlete:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    const selected = athletes.filter(a => selectedIds.has(a.id));
    setSelectedAthletes(selected);
    navigate('/configure-test');
  };

  const canContinue = selectedIds.size >= MIN_ATHLETES;
  const canAddMore = selectedIds.size < MAX_ATHLETES;

  if (loading) {
    return (
      <PageContainer title={t('selectAthletesTitle')} showBack backTo="/">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={t('selectAthletesTitle')} showBack backTo="/">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Info banner */}
        <div className="glass-card p-4 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="font-bold text-sm">{t('selectInfo')}</p>
              <p className="text-[11px] text-muted-foreground">
                {selectedIds.size} {t('selectedCount')}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowNewForm(!showNewForm)}
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary hover:bg-primary/10"
          >
            {showNewForm ? t('cancel') : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                {t('quickAdd')}
              </>
            )}
          </Button>
        </div>

        {/* Quick add form */}
        {showNewForm ? (
          <div className="glass-card p-4 rounded-xl animate-scale-in space-y-4">
            <h3 className="font-semibold">{t('newAthlete')}</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('name')}</label>
                <Input
                  placeholder={t('athleteNamePlaceholder')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('birthDateLabel')}</label>
                  <Input
                    type="date"
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('position')}</label>
                  <select
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">{t('select') || 'Selecionar'}</option>
                    <option value="defender_central">{t('defender_central')}</option>
                    <option value="defender_wide">{t('defender_wide')}</option>
                    <option value="midfielder">{t('midfielder')}</option>
                    <option value="forward">{t('forward')}</option>
                    <option value="center_forward">{t('center_forward')}</option>
                  </select>
                </div>
              </div>
              <Button 
                onClick={handleQuickAdd} 
                className="w-full"
                disabled={!newName.trim() || !newBirthDate || !newPosition || !canAddMore || submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t('add')
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setShowNewForm(false)}
            >
              {t('cancel')}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-14 justify-start gap-3"
            onClick={() => setShowNewForm(true)}
            disabled={!canAddMore}
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <span>{t('addNewAthlete')}</span>
          </Button>
        )}

        {/* Search Bar */}
        {athletes.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Athletes list */}
        {athletes.length > 0 ? (
          <div className="space-y-3 pb-24">
            <h3 className="text-sm font-bold text-muted-foreground px-1">{t('registeredAthletes')}</h3>
            {athletes
              .filter(a =>
                a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.position && a.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (a.team && a.team.toLowerCase().includes(searchTerm.toLowerCase()))
              )
              .map((athlete, index) => {
                const isSelected = selectedIds.has(athlete.id);
                return (
                  <button
                    key={athlete.id}
                    className={cn(
                      "w-full glass-card p-4 rounded-xl flex items-center gap-3 transition-all animate-fade-in",
                      isSelected
                        ? "bg-primary/20 border-primary/50 ring-2 ring-primary/30"
                        : "hover:bg-card/90",
                      !canAddMore && !isSelected && "opacity-50"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleToggleAthlete(athlete)}
                    disabled={!canAddMore && !isSelected}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-secondary"
                    )}>
                      {isSelected ? (
                        <span className="font-bold">{[...selectedIds].indexOf(athlete.id) + 1}</span>
                      ) : (
                        <User className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">{athlete.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {athlete.pvTcar ? (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                            {t('pv')}: {Number(athlete.pvTcar).toFixed(1)} km/h
                          </span>
                        ) : (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            {t('noTests')}
                          </span>
                        )}
                        {athlete.team && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                            • {athlete.team}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                        <ChevronRight className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}

            {/* Load More Button */}
            {hasMore && athletes.length > 0 && !searchTerm && (
              <div className="py-4 flex justify-center">
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
                  {t('loadMoreAtletas') || 'Carregar mais atletas'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhum atleta cadastrado</p>
            <p className="text-sm text-muted-foreground">Adicione atletas para continuar</p>
          </div>
        )}

        {/* Continue button */}
        <div className="pt-4 border-t border-border">
          <Button
            className="w-full h-14"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            Continuar com {selectedIds.size} atleta{selectedIds.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
