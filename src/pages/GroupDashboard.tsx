import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Trophy, TrendingUp, Loader2, Download, FileText,
    ChevronRight, BarChart3
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { SupabaseService } from '@/services/SupabaseService';
import { ClassificationService } from '@/services/ClassificationService';
import { ExportService } from '@/services/ExportService';
import { useAuth } from '@/hooks/useAuth';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { cn } from '@/lib/utils';

interface RankingItem {
    athleteId: string;
    athleteName: string;
    avgPV: number;
    lastPV: number;
    testCount: number;
}

export default function GroupDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ranking, setRanking] = useState<RankingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }

        const loadData = async () => {
            try {
                const data = await SupabaseService.getGroupRanking();
                setRanking(data);
            } catch (error) {
                console.error('Error loading ranking:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, navigate]);

    // Group average
    const groupAvgPV = ranking.length > 0
        ? ranking.reduce((sum, r) => sum + r.avgPV, 0) / ranking.length
        : 0;

    const totalTests = ranking.reduce((sum, r) => sum + r.testCount, 0);

    // Chart data
    const chartData = ranking.map(r => ({
        name: r.athleteName.split(' ')[0], // Primeiro nome
        pv: Number(r.avgPV.toFixed(2)),
        lastPV: Number(r.lastPV.toFixed(2)),
    }));

    const handleExportPDF = async () => {
        setExporting(true);
        try {
            // Capture chart image
            const chartImage = await ExportService.captureChartAsImage(chartRef.current);

            const pdfRanking = ranking.map((r, i) => ({
                position: i + 1,
                athleteName: r.athleteName,
                avgPV: r.avgPV,
                lastPV: r.lastPV,
                testCount: r.testCount,
            }));
            await ExportService.exportGroupRankingToPDF(pdfRanking, {
                chartImage,
                totalTests,
            });
        } catch (error) {
            console.error('Error exporting PDF:', error);
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <PageContainer title="Dashboard do Grupo" showBack backTo="/">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer title="Dashboard do Grupo" showBack backTo="/">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="glass-card p-4 rounded-xl text-center">
                        <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                        <p className="text-2xl font-bold">{ranking.length}</p>
                        <p className="text-[10px] text-muted-foreground">Atletas</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl text-center">
                        <BarChart3 className="w-5 h-5 mx-auto mb-1 text-primary" />
                        <p className="text-2xl font-bold">{totalTests}</p>
                        <p className="text-[10px] text-muted-foreground">Testes</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl text-center">
                        <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
                        <p className="text-2xl font-bold">{groupAvgPV.toFixed(1)}</p>
                        <p className="text-[10px] text-muted-foreground">PV Médio</p>
                    </div>
                </div>

                {/* Ranking Chart */}
                {chartData.length > 0 && (
                    <div className="glass-card p-4 rounded-xl">
                        <h3 className="font-semibold mb-4">PV Médio Corrigido por Atleta</h3>
                        <div className="h-64" ref={chartRef}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={11}
                                        width={60}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px'
                                        }}
                                        formatter={(value: number) => [`${value.toFixed(2)} km/h`, 'PV Médio']}
                                    />
                                    <Bar dataKey="pv" radius={[0, 4, 4, 0]} name="PV Médio">
                                        {chartData.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={index === 0 ? '#006633' : index < 3 ? '#22C55E' : 'hsl(var(--primary))'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Ranking with Podium */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-primary" />
                            Ranking
                        </h3>
                        {ranking.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={handleExportPDF} disabled={exporting}>
                                <Download className="w-4 h-4 mr-1" />
                                {exporting ? 'Gerando...' : 'PDF'}
                            </Button>
                        )}
                    </div>

                    {ranking.length === 0 ? (
                        <div className="glass-card p-8 rounded-xl text-center">
                            <p className="text-muted-foreground">Nenhum teste realizado ainda.</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Execute testes para ver o ranking do grupo.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Podium — Top 3 */}
                            {ranking.length >= 2 && (
                                <div className="glass-card p-5 rounded-xl overflow-hidden">
                                    <div className="flex items-end justify-center gap-2 sm:gap-3 pt-4 pb-2">
                                        {/* 2nd Place — Left */}
                                        {ranking[1] && (
                                            <div
                                                className="flex flex-col items-center cursor-pointer group animate-fade-in"
                                                style={{ animationDelay: '100ms' }}
                                                onClick={() => navigate(`/athlete/${ranking[1].athleteId}`)}
                                            >
                                                <div className="relative mb-2">
                                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                                                        🥈
                                                    </div>
                                                </div>
                                                <p className="text-xs sm:text-sm font-semibold text-center truncate max-w-[80px] sm:max-w-[100px]">
                                                    {ranking[1].athleteName.split(' ')[0]}
                                                </p>
                                                <p className="text-lg sm:text-xl font-mono font-bold text-primary">
                                                    {ranking[1].avgPV.toFixed(2)}
                                                </p>
                                                <p className="text-[9px] text-muted-foreground">km/h</p>
                                                {/* Podium block */}
                                                <div className="w-20 sm:w-24 h-16 sm:h-20 bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-lg mt-2 flex items-center justify-center shadow-inner">
                                                    <span className="text-2xl sm:text-3xl font-black text-gray-500/50">2</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* 1st Place — Center (elevated) */}
                                        {ranking[0] && (
                                            <div
                                                className="flex flex-col items-center cursor-pointer group animate-fade-in -mt-6"
                                                style={{ animationDelay: '0ms' }}
                                                onClick={() => navigate(`/athlete/${ranking[0].athleteId}`)}
                                            >
                                                <div className="relative mb-2">
                                                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center text-3xl shadow-xl ring-4 ring-yellow-400/30 group-hover:scale-110 transition-transform"
                                                        style={{ width: '4.5rem', height: '4.5rem' }}>
                                                        🥇
                                                    </div>
                                                    {/* Crown */}
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">👑</div>
                                                </div>
                                                <p className="text-sm sm:text-base font-bold text-center truncate max-w-[90px] sm:max-w-[110px]">
                                                    {ranking[0].athleteName.split(' ')[0]}
                                                </p>
                                                <p className="text-xl sm:text-2xl font-mono font-bold text-primary">
                                                    {ranking[0].avgPV.toFixed(2)}
                                                </p>
                                                <p className="text-[9px] text-muted-foreground">km/h</p>
                                                {/* Podium block — tallest */}
                                                <div className="w-22 sm:w-28 h-24 sm:h-28 bg-gradient-to-t from-green-700 to-green-500 rounded-t-lg mt-2 flex items-center justify-center shadow-inner"
                                                    style={{ width: '6.5rem' }}>
                                                    <span className="text-3xl sm:text-4xl font-black text-white/30">1</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* 3rd Place — Right */}
                                        {ranking[2] && (
                                            <div
                                                className="flex flex-col items-center cursor-pointer group animate-fade-in"
                                                style={{ animationDelay: '200ms' }}
                                                onClick={() => navigate(`/athlete/${ranking[2].athleteId}`)}
                                            >
                                                <div className="relative mb-2">
                                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform">
                                                        🥉
                                                    </div>
                                                </div>
                                                <p className="text-xs sm:text-sm font-semibold text-center truncate max-w-[80px] sm:max-w-[100px]">
                                                    {ranking[2].athleteName.split(' ')[0]}
                                                </p>
                                                <p className="text-lg sm:text-xl font-mono font-bold text-primary">
                                                    {ranking[2].avgPV.toFixed(2)}
                                                </p>
                                                <p className="text-[9px] text-muted-foreground">km/h</p>
                                                {/* Podium block — shortest */}
                                                <div className="w-20 sm:w-24 h-12 sm:h-14 bg-gradient-to-t from-amber-700 to-amber-500 rounded-t-lg mt-2 flex items-center justify-center shadow-inner">
                                                    <span className="text-xl sm:text-2xl font-black text-white/30">3</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Base line */}
                                    <div className="h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent mt-0" />
                                </div>
                            )}

                            {/* Remaining athletes (4th+) */}
                            {ranking.length > 3 && (
                                <div className="space-y-2">
                                    {ranking.slice(3).map((item, index) => {
                                        const actualIndex = index + 3;
                                        const classification = ClassificationService.getClassification(
                                            1,
                                            item.avgPV
                                        );

                                        return (
                                            <div
                                                key={item.athleteId}
                                                className="glass-card p-4 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors animate-fade-in"
                                                style={{ animationDelay: `${(actualIndex) * 50}ms` }}
                                                onClick={() => navigate(`/athlete/${item.athleteId}`)}
                                            >
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-muted text-muted-foreground">
                                                    {actualIndex + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{item.athleteName}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs px-2 py-0.5 rounded-full"
                                                            style={{
                                                                backgroundColor: `${classification.color}20`,
                                                                color: classification.color
                                                            }}>
                                                            {classification.label}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {item.testCount} teste{item.testCount !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xl font-mono font-bold text-primary">
                                                        {item.avgPV.toFixed(2)}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">PV médio</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* If only 1 athlete, show simple card */}
                            {ranking.length === 1 && (
                                <div
                                    className="glass-card p-6 rounded-xl text-center cursor-pointer hover:bg-accent/50 transition-colors"
                                    onClick={() => navigate(`/athlete/${ranking[0].athleteId}`)}
                                >
                                    <div className="text-4xl mb-2">🏆</div>
                                    <p className="text-lg font-bold">{ranking[0].athleteName}</p>
                                    <p className="text-3xl font-mono font-bold text-primary mt-1">{ranking[0].avgPV.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">km/h • {ranking[0].testCount} teste{ranking[0].testCount !== 1 ? 's' : ''}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}
