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
  const [newName, setNewName] = useState('');
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
      const data = await SupabaseService.getAthletes(pageToLoad, PAGE_SIZE);

      const athletesData: ExtendedAthlete[] = data.map(a => ({
        id: a.id,
        userId: a.user_id,
        name: a.name,
        team: a.team,
        position: a.position,
        birthDate: a.birth_date || undefined,
        createdAt: a.created_at,
        pvTcar: (a as any).pv_tcar
      }));

      if (isInitial) {
        setAthletes(athletesData);
      } else {
        setAthletes(prev => [...prev, ...athletesData]);
      }

      setHasMore(data.length === PAGE_SIZE);
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
        team: null,
        position: null,
        sport: 'athletics'
      });
      await loadAthletes(0, true);
      setSelectedIds(prev => new Set([...prev, newAthlete.id]));
      setNewName('');
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
      <PageContainer title="Selecionar Atletas" showBack backTo="/">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Selecionar Atletas" showBack backTo="/">
      <div className="max-w-md mx-auto space-y-6">
        {/* Info banner */}
        <div className="glass-card p-4 rounded-xl bg-primary/10 border-primary/30">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            <div>
              <p className="font-medium">Selecione de 1 a 10 atletas</p>
              <p className="text-sm text-muted-foreground">
                {selectedIds.size} de {MAX_ATHLETES} selecionados
              </p>
            </div>
          </div>
        </div>

        {/* Quick add form */}
        {showNewForm ? (
          <div className="glass-card p-4 rounded-xl animate-scale-in">
            <h3 className="font-semibold mb-3">Novo Atleta</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Nome do atleta"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                autoFocus
              />
              <Button onClick={handleQuickAdd} disabled={!newName.trim() || !canAddMore || submitting}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Adicionar'
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setShowNewForm(false)}
            >
              Cancelar
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
            <span>Adicionar novo atleta</span>
          </Button>
        )}

        {/* Search Bar */}
        {athletes.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar atleta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
        )}

        {/* Athletes list */}
        {athletes.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm text-muted-foreground px-1">Atletas cadastrados</h3>
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
                      <p className="text-sm text-muted-foreground truncate">
                        {athlete.position || 'Sem posição'}
                        {athlete.team && ` • ${athlete.team}`}
                        {athlete.pvTcar && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded italic">PV: {athlete.pvTcar}</span>
                        )}
                      </p>
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
