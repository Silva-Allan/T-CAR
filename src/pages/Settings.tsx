import { useState } from 'react';
import { Volume2, Bell, Trash2, Globe, LogOut, Check } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { AudioService } from '@/services/AudioService';
import { BeepType } from '@/models/types';
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

export default function Settings() {
  const { t } = useTranslation();
  const { settings, updateSettings, resetAllData, initializeAudio, isAudioReady } = useApp();
  const { user, signOut } = useAuth();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleVolumeChange = (value: number[]) => {
    updateSettings({ volume: value[0] / 100 });
  };

  const handleBeepTypeChange = async (type: BeepType) => {
    updateSettings({ beepType: type });
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

  const beepTypes: { type: BeepType; label: string; description: string }[] = [
    { type: 'standard', label: t('standard'), description: t('descStandard') },
    { type: 'high', label: t('high'), description: t('descHigh') },
    { type: 'double', label: t('double'), description: t('descDouble') },
  ];

  const LANGUAGES = [
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  ];

  return (
    <PageContainer title={t('settingsTitle')} showBack backTo="/">
      <div className="max-w-md mx-auto space-y-6">
        {/* User info */}
        {user && (
          <div className="glass-card p-5 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{user.email}</p>
                <p className="text-sm text-muted-foreground">{t('connected')}</p>
              </div>
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
        )}

        {/* Volume */}
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

        {/* Beep type */}
        <div className="glass-card p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">{t('beepType')}</h3>
          </div>
          <div className="space-y-2">
            {beepTypes.map((beep) => (
              <button
                key={beep.type}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-all flex items-center justify-between",
                  settings.beepType === beep.type
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-secondary hover:bg-secondary/80"
                )}
                onClick={() => handleBeepTypeChange(beep.type)}
              >
                <div>
                  <p className="font-medium">{beep.label}</p>
                  <p className="text-sm text-muted-foreground">{beep.description}</p>
                </div>
                {settings.beepType === beep.type && (
                  <div className="w-4 h-4 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="glass-card p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">{t('language')}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => {
              const isSelected = settings.language === lang.code;
              return (
              <button
                key={lang.code}
                className={cn(
                  "relative flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                  isSelected 
                    ? "bg-primary/10 border-primary/50" 
                    : "bg-card border-transparent hover:bg-accent"
                )}
                onClick={() => handleLanguageChange(lang.code)}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className={cn("font-medium flex-1", isSelected ? "text-primary" : "text-foreground")}>
                  {lang.name}
                </span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
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
