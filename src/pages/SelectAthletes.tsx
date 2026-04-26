import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users, Loader2, Search, ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SupabaseService } from '@/services/SupabaseService';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/store/AppContext';
import { Athlete } from '@/models/types';
import { cn } from '@/lib/utils';
import { AthleteFilterBar, applyAthleteFilters, EMPTY_FILTERS, type AthleteFilters } from '@/components/AthleteFilterBar';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<AthleteFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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
      const [athletesRaw, latestResults] = await Promise.all([
        SupabaseService.getAthletes(pageToLoad, PAGE_SIZE),
        isInitial ? SupabaseService.getLatestResultPerAthlete() : Promise.resolve([])
      ]);

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
        gender: (a as any).gender || null,
        birth_date: a.birth_date || undefined,
        birthDate: a.birth_date || undefined,
        createdAt: a.created_at,
        pvTcar: (a as any).pv_tcar || resultsMap.get(a.id)
      }));

      if (isInitial) {
        setAthletes(athletesData);
      } else {
        setAthletes(prev => [...prev, ...athletesData]);
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

  const handleContinue = () => {
    const selected = athletes.filter(a => selectedIds.has(a.id));
    setSelectedAthletes(selected);
    navigate('/configure-test');
  };

  const canContinue = selectedIds.size >= MIN_ATHLETES;
  const canAddMore = selectedIds.size < MAX_ATHLETES;

  const hasActiveFilters = filters.position || filters.category || filters.gender;

  // Aplicar busca textual + filtros
  const filteredAthletes = applyAthleteFilters(
    athletes.filter(a =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.team && a.team.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    filters
  );

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
      <div className="max-w-2xl mx-auto space-y-4">
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
            onClick={() => setShowFilters(!showFilters)}
            variant={hasActiveFilters ? "default" : "ghost"}
            size="sm"
            className={cn(
              hasActiveFilters
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            {t('filters') || 'Filtros'}
            {hasActiveFilters && (
              <span className="ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {[filters.position, filters.category, filters.gender].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {/* Filter bar (colapsável) */}
        {showFilters && (
          <div className="glass-card p-4 rounded-xl animate-scale-in">
            <AthleteFilterBar filters={filters} onChange={setFilters} t={t} />
          </div>
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
        {filteredAthletes.length > 0 ? (
          <div className="space-y-3 pb-24">
            <h3 className="text-sm font-bold text-muted-foreground px-1">
              {t('registeredAthletes')}
              {(searchTerm || hasActiveFilters) && (
                <span className="ml-1 text-primary">({filteredAthletes.length})</span>
              )}
            </h3>
            {filteredAthletes.map((athlete, index) => {
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
                        {athlete.position && (
                          <span className="text-[10px] text-muted-foreground">
                            • {t(athlete.position as any)}
                          </span>
                        )}
                        {athlete.team && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
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

            {/* Load More */}
            {hasMore && !searchTerm && !hasActiveFilters && (
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
        ) : athletes.length > 0 ? (
          <div className="text-center py-8">
            <Search className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">{t('noFilterResults') || 'Nenhum atleta encontrado com os filtros selecionados'}</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">{t('noAthletesRegistered') || 'Nenhum atleta cadastrado'}</p>
            <p className="text-sm text-muted-foreground">{t('addAthletesFirst') || 'Cadastre atletas na listagem de atletas'}</p>
          </div>
        )}

        {/* Continue button (sticky) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="hero"
              className="w-full h-14 text-base"
              onClick={handleContinue}
              disabled={!canContinue}
            >
              {t('continueWith') || 'Continuar com'} {selectedIds.size} {t('athlete') || 'atleta'}{selectedIds.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
