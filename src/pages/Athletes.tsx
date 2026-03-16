import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, User, Trash2, Edit2, X, Check, ChevronDown, ChevronUp, ExternalLink, Loader2, Search } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SupabaseService } from '@/services/SupabaseService';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { calculateAge, calculateCategory } from '@/models/types';
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

interface Athlete {
  id: string;
  name: string;
  email: string | null;
  birth_date: string | null;
  gender: 'M' | 'F' | 'Outro' | null;
  team: string | null;
  position: string | null;
}

interface AthleteTest {
  id: string;
  pv_corrigido: number;
  test: {
    date: string;
    protocol_level: number;
  } | null;
}

export default function Athletes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [athleteTests, setAthleteTests] = useState<Record<string, AthleteTest[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<string>('');
  const [team, setTeam] = useState('');
  const [position, setPosition] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const [searchTerm, setSearchTerm] = useState('');

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

      if (isInitial) {
        setAthletes(data as unknown as Athlete[]);
      } else {
        setAthletes(prev => [...prev, ...(data as unknown as Athlete[])]);
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

  const loadAthleteTests = async (athleteId: string) => {
    if (athleteTests[athleteId]) return;
    try {
      const tests = await SupabaseService.getAthleteTestHistory(athleteId);
      setAthleteTests(prev => ({ ...prev, [athleteId]: tests as unknown as AthleteTest[] }));
    } catch (error) {
      console.error('Error loading athlete tests:', error);
    }
  };

  const handleExpand = async (athleteId: string) => {
    if (expandedId === athleteId) {
      setExpandedId(null);
    } else {
      setExpandedId(athleteId);
      await loadAthleteTests(athleteId);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);

    try {
      if (editingId) {
        await SupabaseService.updateAthlete(editingId, {
          name: name.trim(),
          email: email.trim() || null,
          birth_date: birthDate || null,
          gender: (gender as any) || null,
          team: team || null,
          position: position || null,
        });
      } else {
        await SupabaseService.createAthlete({
          name: name.trim(),
          email: email.trim() || null,
          birth_date: birthDate || null,
          gender: (gender as any) || null,
          team: team || null,
          position: position || null,
        });
      }
      await loadAthletes(0, true); // Reload all athletes after add/edit
      resetForm();
    } catch (error) {
      console.error('Error saving athlete:', error);
    } finally {
      resetForm();
      setSubmitting(false);
    }
  };

  const handleEdit = (athlete: Athlete) => {
    setEditingId(athlete.id);
    setName(athlete.name);
    setEmail(athlete.email || '');
    setBirthDate(athlete.birth_date || '');
    setGender(athlete.gender || '');
    setTeam(athlete.team || '');
    setPosition(athlete.position || '');
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await SupabaseService.deleteAthlete(deleteId);
      setAthletes(athletes.filter(a => a.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting athlete:', error);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setEmail('');
    setBirthDate('');
    setGender('');
    setTeam('');
    setPosition('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  if (loading) {
    return (
      <PageContainer title={t('athletesTitle')} showBack backTo="/">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={t('athletesTitle')}
      showBack
      backTo="/"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {showForm ? t('cancel') : t('newAthlete')}
          </Button>
        </div>

        {showForm && (
          <div className="glass-card p-5 rounded-xl space-y-4 animate-in slide-in-from-top duration-300">
            <h3 className="font-semibold">{editingId ? t('editAthlete') : t('addAthlete')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t('name')}</label>
                <Input
                  placeholder={t('athleteNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">E-mail {t('optional')}</label>
                <Input
                  placeholder="atleta@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t('birthDateLabel')}</label>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t('gender')}</label>
                <div className="flex gap-2">
                  {['M', 'F', 'Outro'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg border text-sm transition-all",
                        gender === g
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-accent"
                      )}
                    >
                      {g === 'M' ? t('genderM') : g === 'F' ? t('genderF') : t('genderOther')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t('team')}</label>
                <Input
                  placeholder={t('profileClubPlaceholder')}
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t('position')}</label>
                <Input
                  placeholder={t('position')}
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={submitting || !name}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                {editingId ? t('save') : t('add')}
              </Button>
              {editingId && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  {t('cancel')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Live Age/Category Preview */}
        {birthDate && showForm && (
          <div className="flex gap-2 animate-fade-in">
            <div className="flex-1 p-2 rounded-lg bg-secondary/50 border border-secondary text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('age')}</p>
              <p className="text-sm font-bold">{calculateAge(birthDate)} {t('years')}</p>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
              <p className="text-[10px] text-primary/70 uppercase font-bold">{t('category')}</p>
              <p className="text-sm font-bold text-primary">{calculateCategory(birthDate)}</p>
            </div>
          </div>
        )}

        {/* Athletes list */}
        {athletes.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{t('noAthletes')}</p>
            {!showForm && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('addAthlete')}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {athletes
              .filter(a => {
                const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (a.team && a.team.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (a.position && a.position.toLowerCase().includes(searchTerm.toLowerCase()));
                return matchesSearch;
              })
              .map((athlete, index) => (
                <div
                  key={athlete.id}
                  className="glass-card rounded-xl overflow-hidden animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Card header */}
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{athlete.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-muted-foreground truncate">
                          {athlete.position || t('noPosition')}
                          {athlete.team && ` • ${athlete.team}`}
                        </p>
                        {athlete.birth_date && (
                          <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground font-medium">
                            {calculateCategory(athlete.birth_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/athlete/${athlete.id}`)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(athlete)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteId(athlete.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Expand button */}
                  <button
                    className="w-full p-3 border-t border-border/50 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => handleExpand(athlete.id)}
                  >
                    {expandedId === athlete.id ? (
                      <>{t('collapse')} <ChevronUp className="w-4 h-4" /></>
                    ) : (
                      <>{t('viewTests')} <ChevronDown className="w-4 h-4" /></>
                    )}
                  </button>

                  {/* Expanded content */}
                  {expandedId === athlete.id && (
                    <div className="border-t border-border/50 p-4 bg-secondary/30">
                      {!athleteTests[athlete.id] ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : athleteTests[athlete.id].length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t('noTests')}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {athleteTests[athlete.id].slice(0, 5).map(test => (
                            <div
                              key={test.id}
                              className="flex items-center justify-between p-2 rounded bg-background/50"
                            >
                              <span className="text-sm text-muted-foreground">
                                {test.test ? formatDate(test.test.date) : t('dateNotAvailable')}
                              </span>
                              <span className="font-mono font-bold text-primary">
                                {Number(test.pv_corrigido).toFixed(1)} km/h
                              </span>
                            </div>
                          ))}
                          {athleteTests[athlete.id].length > 5 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => navigate(`/athlete/${athlete.id}`)}
                            >
                              {t('viewAll')} ({athleteTests[athlete.id].length})
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && athletes.length > 0 && (
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteAthleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteAthleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
