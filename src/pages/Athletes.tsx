import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, User, Trash2, Edit2, X, Check, ChevronDown, ChevronUp, ExternalLink, Loader2, Search } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [gender, setGender] = useState('');
  const [team, setTeam] = useState('');
  const [position, setPosition] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadAthletes();
  }, [user, navigate]);

  const loadAthletes = async () => {
    try {
      const data = await SupabaseService.getAthletes();
      setAthletes(data as unknown as Athlete[]);
    } catch (error) {
      console.error('Error loading athletes:', error);
    } finally {
      setLoading(false);
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
          gender: gender || null,
          team: team || null,
          position: position || null,
        });
      } else {
        await SupabaseService.createAthlete({
          name: name.trim(),
          email: email.trim() || null,
          birth_date: birthDate || null,
          gender: gender || null,
          team: team || null,
          position: position || null,
        });
      }
      await loadAthletes();
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
      action={
        !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            {t('new')}
          </Button>
        )
      }
    >
      <div className="max-w-md mx-auto space-y-4">
        {/* Add/Edit form */}
        {showForm && (
          <div className="glass-card p-4 rounded-xl animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {editingId ? t('editAthlete') : t('newAthlete')}
              </h3>
              <Button variant="ghost" size="icon-sm" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <Input
                placeholder={`${t('name')} *`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  placeholder="Data de Nascimento"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="text-xs"
                />
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">{t('gender')}...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="Prefiro não dizer">Outro</option>
                </select>
              </div>
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                placeholder={`${t('team')} ${t('optional')}`}
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              />
              <Input
                placeholder={`${t('position')} ${t('optional')}`}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!name.trim() || submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {editingId ? t('save') : t('add')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Search Bar */}
        {athletes.length > 0 && !showForm && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
          </div>
        )}

        {/* Athletes list */}
        {athletes.length === 0 ? (
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
                  (a.team && a.team.toLowerCase().includes(searchTerm.toLowerCase()));
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
                      <p className="text-sm text-muted-foreground truncate">
                        {athlete.team || 'Sem clube'}
                        {athlete.position && ` • ${athlete.position}`}
                      </p>
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
                                {test.test ? formatDate(test.test.date) : 'Data não disponível'}
                              </span>
                              <span className="font-mono font-bold text-primary">
                                {Number(test.pv_corrigido).toFixed(2)} km/h
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
