import { useState, useEffect } from 'react';
import { Volume2, Globe, LogOut, Check, User, MapPin, Building2, Save, Loader2, Trash2, Download, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { AudioService } from '@/services/AudioService';
import { SupabaseService } from '@/services/SupabaseService';
import { BeepType } from '@/models/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
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

export default function Settings() {
  const { t } = useTranslation();
  const { settings, updateSettings, resetAllData, initializeAudio, isAudioReady } = useApp();
  const { user, signOut } = useAuth();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Trainer profile state
  const [profileName, setProfileName] = useState('');
  const [profileClub, setProfileClub] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    SupabaseService.getProfile().then(p => {
      if (p) {
        setProfileName(p.full_name ?? '');
        setProfileClub((p as any).club ?? '');
        setProfileLocation((p as any).location ?? '');
      }
    });
  }, [user]);

  const handleVolumeChange = (value: number[]) => {
    updateSettings({ volume: value[0] / 100 });
  };

  const handleTestAudio = async () => {
    if (!isAudioReady) {
      await initializeAudio();
    }
    await AudioService.testAudio();
  };

  const handleLanguageChange = (lang: string) => {
    updateSettings({ language: lang as any });
  };

  const handleReset = () => {
    resetAllData();
    setShowResetDialog(false);
  };

  const handleLogout = async () => {
    await signOut();
    setShowLogoutDialog(false);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await SupabaseService.exportAllUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tcar-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro ao exportar dados:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      await SupabaseService.deleteAllUserData();
      await signOut();
      setShowDeleteDialog(false);
    } catch (e) {
      console.error('Erro ao excluir dados:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const beepTypes: { type: BeepType; label: string; description: string }[] = [
    { type: 'standard', label: t('standard'), description: t('descStandard') },
  ];

  const LANGUAGES = [
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await SupabaseService.updateProfile({
        full_name: profileName || null,
        club: profileClub || null,
        location: profileLocation || null,
      } as any);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (e) {
      console.error('Erro ao salvar perfil:', e);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <PageContainer title={t('settingsTitle')} showBack backTo="/">
      <div className="max-w-md mx-auto space-y-6">

        {/* Trainer Profile */}
        {user && (
          <div className="glass-card p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Perfil do Treinador</h3>
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-[140px]">{user.email}</p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nome completo"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Clube / Equipe"
                  value={profileClub}
                  onChange={e => setProfileClub(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Localização (opcional)"
                  value={profileLocation}
                  onChange={e => setProfileLocation(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  size="sm"
                  className="flex-1"
                >
                  {savingProfile ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : profileSaved ? (
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {profileSaved ? 'Salvo!' : 'Salvar Perfil'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLogoutDialog(true)}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  {t('logout')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Audio Volume Only - Beep type selection removed as per protocol 3.0 */}
        <div className="glass-card p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Volume2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">{t('audioVolume')}</h3>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              value={[settings.volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="text-sm font-mono w-12 text-right">
              {Math.round(settings.volume * 100)}%
            </span>
          </div>
        </div>

        {/* Language */}
        <div className="glass-card p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">{t('language')}</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((lang) => {
              const isSelected = settings.language === lang.code;
              return (
                <button
                  key={lang.code}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                    isSelected
                      ? "bg-primary/10 border-primary/50 shadow-sm"
                      : "bg-card border-transparent hover:bg-accent"
                  )}
                  onClick={() => handleLanguageChange(lang.code)}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className={cn("text-xs font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                    {lang.name}
                  </span>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reset data */}
        <div className="glass-card p-5 rounded-xl border-destructive/30">
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold">{t('resetData')}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('resetDataDesc')}
          </p>
          <Button
            variant="danger"
            className="w-full"
            onClick={() => setShowResetDialog(true)}
          >
            {t('resetData')}
          </Button>
        </div>

        {/* --- LGPD & Privacy --- */}
        <div className="glass-card p-5 rounded-xl border-primary/20 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Privacidade e Dados (LGPD)</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Gerencie sua privacidade e seus direitos conforme a Lei Geral de Proteção de Dados.
          </p>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start text-xs h-9"
              onClick={handleExportData}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-2 text-primary" />}
              Exportar Meus Dados (JSON)
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-xs h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Excluir Minha Conta e Dados
            </Button>
          </div>
        </div>
      </div>

      {/* Reset confirmation */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('resetDataTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('resetDataConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive">
              {t('reset')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-card border-destructive/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Excluir Conta Permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. Todos os seus atletas registrados,
              testes realizados e resultados serão excluídos permanentemente de nossos servidores,
              conforme seu direito ao esquecimento (LGPD).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllData}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sim, excluir tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout confirmation */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('logoutTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('logoutDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              {t('logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
