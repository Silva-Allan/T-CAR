import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, User, ChevronRight } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/store/AppContext';

export default function SelectAthlete() {
  const navigate = useNavigate();
  const { athletes, setSelectedAthlete, addAthlete } = useApp();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');

  const handleSelectAthlete = (athlete: typeof athletes[0]) => {
    setSelectedAthlete(athlete);
    navigate('/configure-test');
  };

  const handleQuickAdd = () => {
    if (newName.trim()) {
      const athlete = addAthlete({ name: newName.trim() });
      setSelectedAthlete(athlete);
      navigate('/configure-test');
    }
  };

  const handleSkip = () => {
    setSelectedAthlete(null);
    navigate('/configure-test');
  };

  return (
    <PageContainer title="Selecionar Atleta" showBack backTo="/">
      <div className="max-w-md mx-auto space-y-6">
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
              <Button onClick={handleQuickAdd} disabled={!newName.trim()}>
                Adicionar
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
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <span>Adicionar novo atleta</span>
          </Button>
        )}

        {/* Athletes list */}
        {athletes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm text-muted-foreground px-1">Atletas cadastrados</h3>
            {athletes.map((athlete, index) => (
              <button
                key={athlete.id}
                className="w-full glass-card p-4 rounded-xl flex items-center gap-3 hover:bg-card/90 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleSelectAthlete(athlete)}
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{athlete.name}</p>
                  {athlete.team && (
                    <p className="text-sm text-muted-foreground">{athlete.team}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Skip option */}
        <div className="pt-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleSkip}
          >
            Continuar sem atleta
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
