// ======================================================================
// T-CAR 2.0 — Export Service
// ======================================================================
// Exportação de dados em PDF profissional.
// Conteúdo: dados do teste, histórico do atleta, ranking do grupo.
// ======================================================================

import { AthleteResult } from '@/models/types';

// Cores UDESC
const UDESC_GREEN = [0, 102, 51] as const;       // #006633
const UDESC_DARK = [0, 51, 25] as const;          // #003319
const ACCENT_RED = [200, 16, 46] as const;        // #C8102E
const TEXT_PRIMARY = [30, 30, 30] as const;
const TEXT_SECONDARY = [120, 120, 120] as const;
const TABLE_HEADER_BG = [0, 102, 51] as const;
const TABLE_ROW_ALT = [240, 245, 240] as const;
const TABLE_BORDER = [200, 210, 200] as const;

class ExportServiceClass {

    // ====================================================================
    // PDF Helpers — Branded Header, Tables, Charts
    // ====================================================================

    private drawHeader(doc: any, title: string, subtitle: string) {
        const pageW = doc.internal.pageSize.getWidth();

        // Green header band
        doc.setFillColor(...UDESC_GREEN);
        doc.rect(0, 0, pageW, 38, 'F');

        // Gradient effect (darker strip at top)
        doc.setFillColor(...UDESC_DARK);
        doc.rect(0, 0, pageW, 4, 'F');

        // T-CAR title
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('T-CAR', 15, 18);

        // Subtitle badge
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('UDESC • PROTOCOLO V3.0', 15, 26);

        // Report title on the right
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, pageW - 15, 18, { align: 'right' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(subtitle, pageW - 15, 26, { align: 'right' });

        return 48; // Y position after header
    }

    private drawInfoBox(doc: any, y: number, items: { label: string; value: string }[], columns = 2): number {
        const pageW = doc.internal.pageSize.getWidth();
        const boxW = pageW - 30;
        const colW = boxW / columns;
        const lineH = 7;
        const rows = Math.ceil(items.length / columns);
        const boxH = rows * lineH + 10;

        // Box background
        doc.setFillColor(248, 250, 248);
        doc.setDrawColor(...TABLE_BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, y, boxW, boxH, 3, 3, 'FD');

        // Left green accent
        doc.setFillColor(...UDESC_GREEN);
        doc.rect(15, y, 3, boxH, 'F');

        doc.setFontSize(8);
        items.forEach((item, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);
            const x = 25 + col * colW;
            const itemY = y + 8 + row * lineH;

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...TEXT_SECONDARY);
            doc.text(item.label.toUpperCase(), x, itemY);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TEXT_PRIMARY);
            doc.text(item.value, x + doc.getTextWidth(item.label.toUpperCase() + '  '), itemY);
        });

        return y + boxH + 8;
    }

    private drawSectionTitle(doc: any, y: number, title: string, icon?: string): number {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...UDESC_GREEN);
        const text = icon ? `${icon}  ${title}` : title;
        doc.text(text, 15, y);

        // Underline
        doc.setDrawColor(...UDESC_GREEN);
        doc.setLineWidth(0.5);
        doc.line(15, y + 2, 15 + doc.getTextWidth(text), y + 2);

        return y + 10;
    }

    private drawTable(
        doc: any,
        y: number,
        headers: string[],
        colWidths: number[],
        rows: string[][],
        options: { highlightFirst?: boolean; } = {}
    ): number {
        const startX = 15;
        const rowH = 7;
        const headerH = 8;

        // Header row
        doc.setFillColor(...TABLE_HEADER_BG);
        doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), headerH, 'F');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        let x = startX + 2;
        headers.forEach((h, i) => {
            doc.text(h, x, y + 5.5);
            x += colWidths[i];
        });
        y += headerH;

        // Data rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);

        rows.forEach((row, rowIdx) => {
            // Page break check
            if (y > 270) {
                doc.addPage();
                y = 20;
                // Redraw header on new page
                doc.setFillColor(...TABLE_HEADER_BG);
                doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), headerH, 'F');
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                let hx = startX + 2;
                headers.forEach((h, i) => {
                    doc.text(h, hx, y + 5.5);
                    hx += colWidths[i];
                });
                y += headerH;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
            }

            // Alternating row background
            if (rowIdx % 2 === 0) {
                doc.setFillColor(...TABLE_ROW_ALT);
                doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH, 'F');
            }

            // Highlight top 3
            if (options.highlightFirst && rowIdx < 3) {
                const medals = ['🥇', '🥈', '🥉'];
                doc.setTextColor(...UDESC_GREEN);
                doc.setFont('helvetica', 'bold');
            } else {
                doc.setTextColor(...TEXT_PRIMARY);
                doc.setFont('helvetica', 'normal');
            }

            let rx = startX + 2;
            row.forEach((cell, i) => {
                doc.text(cell, rx, y + 5);
                rx += colWidths[i];
            });

            // Reset text style
            doc.setTextColor(...TEXT_PRIMARY);
            doc.setFont('helvetica', 'normal');

            y += rowH;
        });

        // Bottom border
        doc.setDrawColor(...TABLE_BORDER);
        doc.setLineWidth(0.3);
        const totalW = colWidths.reduce((a, b) => a + b, 0);
        doc.line(startX, y, startX + totalW, y);

        return y + 5;
    }

    private drawStatCards(doc: any, y: number, stats: { label: string; value: string; color?: readonly [number, number, number] }[]): number {
        const pageW = doc.internal.pageSize.getWidth();
        const cardW = (pageW - 30 - (stats.length - 1) * 5) / stats.length;
        const cardH = 22;

        stats.forEach((stat, i) => {
            const x = 15 + i * (cardW + 5);

            // Card background
            doc.setFillColor(248, 250, 248);
            doc.setDrawColor(...TABLE_BORDER);
            doc.setLineWidth(0.3);
            doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

            // Top accent
            const color = stat.color || UDESC_GREEN;
            doc.setFillColor(...color);
            doc.rect(x, y, cardW, 3, 'F');

            // Value
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...(stat.color || UDESC_GREEN));
            doc.text(stat.value, x + cardW / 2, y + 13, { align: 'center' });

            // Label
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TEXT_SECONDARY);
            doc.text(stat.label.toUpperCase(), x + cardW / 2, y + 19, { align: 'center' });
        });

        return y + cardH + 8;
    }

    private drawFooter(doc: any) {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const pageW = doc.internal.pageSize.getWidth();

            // Footer line
            doc.setDrawColor(...TABLE_BORDER);
            doc.setLineWidth(0.3);
            doc.line(15, 283, pageW - 15, 283);

            doc.setFontSize(6);
            doc.setTextColor(...TEXT_SECONDARY);
            doc.setFont('helvetica', 'normal');
            doc.text(
                'T-CAR Professional v3.0 • UDESC • Test de Course avec Accélération et Récupération',
                15, 288
            );
            doc.text(
                `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Página ${i}/${pageCount}`,
                pageW - 15, 288, { align: 'right' }
            );
        }
    }

    /**
     * Inserts a chart image (from canvas.toDataURL) into the PDF.
     */
    private drawChartImage(doc: any, y: number, chartImage: string | null, label: string): number {
        if (!chartImage) return y;

        // Check page break
        if (y + 75 > 270) {
            doc.addPage();
            y = 20;
        }

        y = this.drawSectionTitle(doc, y, label);

        // Chart border
        const pageW = doc.internal.pageSize.getWidth();
        const chartW = pageW - 30;
        const chartH = 60;
        doc.setDrawColor(...TABLE_BORDER);
        doc.setLineWidth(0.3);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(15, y, chartW, chartH, 2, 2, 'FD');

        try {
            doc.addImage(chartImage, 'PNG', 16, y + 1, chartW - 2, chartH - 2);
        } catch (e) {
            doc.setFontSize(8);
            doc.setTextColor(...TEXT_SECONDARY);
            doc.text('Gráfico não disponível', 15 + chartW / 2, y + chartH / 2, { align: 'center' });
        }

        return y + chartH + 10;
    }

    // ====================================================================
    // PDF Export Methods
    // ====================================================================

    /**
     * Gera PDF profissional com relatório de um teste.
     */
    async exportTestResultsToPDF(
        protocolLevel: number,
        totalTime: number,
        date: string,
        athleteResults: AthleteResult[],
        options?: { temperature?: number | null; notes?: string; chartImage?: string | null }
    ): Promise<void> {
        try {
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            // Header
            let y = this.drawHeader(doc, 'Relatório de Teste', `Sessão ${new Date(date).toLocaleDateString('pt-BR')}`);

            // Info Box
            const infoItems = [
                { label: 'Data:', value: new Date(date).toLocaleDateString('pt-BR') },
                { label: 'Horário:', value: new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
                { label: 'Protocolo:', value: `Nível ${protocolLevel}` },
                { label: 'Tempo Total:', value: this.formatTime(totalTime) },
                { label: 'Atletas:', value: `${athleteResults.length}` },
                { label: 'Temperatura:', value: options?.temperature ? `${options.temperature}°C` : 'N/I' },
            ];
            if (options?.notes) {
                infoItems.push({ label: 'Observações:', value: options.notes });
            }
            y = this.drawInfoBox(doc, y, infoItems, 2);

            // Stat Cards
            const pvValues = athleteResults.map(ar => ar.pvCorrigido);
            const bestPV = pvValues.length > 0 ? Math.max(...pvValues) : 0;
            const avgPV = pvValues.length > 0 ? pvValues.reduce((a, b) => a + b, 0) / pvValues.length : 0;
            const worstPV = pvValues.length > 0 ? Math.min(...pvValues) : 0;

            y = this.drawStatCards(doc, y, [
                { label: 'Melhor PV', value: bestPV.toFixed(2), color: UDESC_GREEN },
                { label: 'Média PV', value: avgPV.toFixed(2) },
                { label: 'Menor PV', value: worstPV.toFixed(2), color: ACCENT_RED },
                { label: 'Atletas', value: `${athleteResults.length}` },
            ]);

            // Chart
            if (options?.chartImage) {
                y = this.drawChartImage(doc, y, options.chartImage, 'Distribuição de PV Corrigido');
            }

            // Results Table
            y = this.drawSectionTitle(doc, y, 'Resultados Individuais');

            const headers = ['#', 'Atleta', 'PV Corr.', 'PV Bruto', 'FC', 'Estágios', 'Reps', 'Dist. (m)', 'Status'];
            const colWidths = [10, 40, 22, 22, 18, 18, 15, 20, 15];
            const rows = athleteResults
                .sort((a, b) => b.pvCorrigido - a.pvCorrigido)
                .map((ar, i) => {
                    const fc = ar.fcFinal != null ? `${ar.fcFinal}` : (ar.fcEstimada != null ? `~${ar.fcEstimada}` : '-');
                    return [
                        `${i + 1}`,
                        ar.athleteName.substring(0, 18),
                        ar.pvCorrigido.toFixed(2),
                        ar.pvBruto.toFixed(2),
                        fc,
                        `${ar.completedStages}`,
                        `${ar.totalReps}`,
                        `${ar.finalDistance}`,
                        ar.eliminatedByFailure ? 'Elim.' : 'OK',
                    ];
                });

            y = this.drawTable(doc, y, headers, colWidths, rows, { highlightFirst: true });

            // Footer
            this.drawFooter(doc);

            const fileName = `tcar_teste_${new Date(date).toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            throw new Error('Não foi possível gerar o PDF.');
        }
    }

    /**
     * Gera PDF profissional com histórico de testes de um atleta.
     */
    async exportAthleteHistoryToPDF(
        athleteName: string,
        tests: {
            date: string;
            protocolLevel: number;
            pvCorrigido: number;
            pvBruto?: number;
            fcFinal?: number | null;
            fcEstimada?: number | null;
            totalReps: number;
            completedStages?: number;
            finalDistance?: number;
        }[],
        options?: { chartImage?: string | null }
    ): Promise<void> {
        try {
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            // Header
            let y = this.drawHeader(doc, 'Histórico do Atleta', athleteName);

            // Info Box
            const pvValues = tests.map(t => t.pvCorrigido);
            const best = pvValues.length > 0 ? Math.max(...pvValues) : 0;
            const worst = pvValues.length > 0 ? Math.min(...pvValues) : 0;
            const avg = pvValues.length > 0 ? pvValues.reduce((a, b) => a + b, 0) / pvValues.length : 0;

            y = this.drawInfoBox(doc, y, [
                { label: 'Atleta:', value: athleteName },
                { label: 'Total de Testes:', value: `${tests.length}` },
                { label: 'Data do Relatório:', value: new Date().toLocaleDateString('pt-BR') },
                {
                    label: 'Período:', value: tests.length > 0
                        ? `${new Date(tests[tests.length - 1].date).toLocaleDateString('pt-BR')} a ${new Date(tests[0].date).toLocaleDateString('pt-BR')}`
                        : 'N/A'
                },
            ], 2);

            // Stat Cards
            y = this.drawStatCards(doc, y, [
                { label: 'Melhor PV', value: best.toFixed(2), color: UDESC_GREEN },
                { label: 'Média PV', value: avg.toFixed(2) },
                { label: 'Menor PV', value: worst.toFixed(2), color: ACCENT_RED },
                { label: 'Testes', value: `${tests.length}` },
            ]);

            // Chart
            if (options?.chartImage) {
                y = this.drawChartImage(doc, y, options.chartImage, 'Evolução PV Corrigido');
            }

            // Table
            y = this.drawSectionTitle(doc, y, 'Detalhamento dos Testes');

            const headers = ['#', 'Data', 'Nível', 'PV Corrigido', 'PV Bruto', 'FC Final', 'Estágios', 'Reps', 'Dist. (m)'];
            const colWidths = [10, 25, 15, 25, 22, 20, 18, 15, 20];
            const rows = tests.map((t, i) => [
                `${i + 1}`,
                new Date(t.date).toLocaleDateString('pt-BR'),
                `${t.protocolLevel}`,
                `${t.pvCorrigido.toFixed(2)}`,
                t.pvBruto != null ? `${t.pvBruto.toFixed(2)}` : '-',
                t.fcFinal != null ? `${t.fcFinal}` : (t.fcEstimada != null ? `~${t.fcEstimada}` : '-'),
                t.completedStages != null ? `${t.completedStages}` : '-',
                `${t.totalReps}`,
                t.finalDistance != null ? `${t.finalDistance}` : '-',
            ]);

            y = this.drawTable(doc, y, headers, colWidths, rows);

            // Footer
            this.drawFooter(doc);

            doc.save(`tcar_historico_${athleteName.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error('Erro ao gerar PDF do histórico:', error);
            throw new Error('Não foi possível gerar o PDF.');
        }
    }

    /**
     * Gera PDF profissional com ranking do grupo.
     */
    async exportGroupRankingToPDF(
        ranking: {
            position: number;
            athleteName: string;
            avgPV: number;
            lastPV: number;
            testCount: number;
        }[],
        options?: { chartImage?: string | null; totalTests?: number }
    ): Promise<void> {
        try {
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            // Header
            let y = this.drawHeader(doc, 'Dashboard do Grupo', 'Ranking & Estatísticas');

            // Info Box
            const totalTests = options?.totalTests || ranking.reduce((s, r) => s + r.testCount, 0);
            const groupAvg = ranking.length > 0
                ? ranking.reduce((s, r) => s + r.avgPV, 0) / ranking.length
                : 0;
            const bestAthlete = ranking.length > 0 ? ranking[0] : null;

            y = this.drawInfoBox(doc, y, [
                { label: 'Data:', value: new Date().toLocaleDateString('pt-BR') },
                { label: 'Horário:', value: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
                { label: 'Total de Atletas:', value: `${ranking.length}` },
                { label: 'Total de Testes:', value: `${totalTests}` },
            ], 2);

            // Stat Cards
            const stats = [
                { label: 'PV Médio do Grupo', value: groupAvg.toFixed(2), color: UDESC_GREEN },
                { label: 'Atletas', value: `${ranking.length}` },
                { label: 'Testes Realizados', value: `${totalTests}` },
            ];
            if (bestAthlete) {
                stats.push({ label: `Líder: ${bestAthlete.athleteName.split(' ')[0]}`, value: bestAthlete.avgPV.toFixed(2), color: UDESC_GREEN });
            }
            y = this.drawStatCards(doc, y, stats);

            // Chart
            if (options?.chartImage) {
                y = this.drawChartImage(doc, y, options.chartImage, 'PV Médio por Atleta');
            }

            // Ranking Table
            y = this.drawSectionTitle(doc, y, 'Ranking Completo');

            const headers = ['Pos.', 'Atleta', 'PV Médio (km/h)', 'Último PV (km/h)', 'Nº Testes'];
            const colWidths = [15, 55, 35, 35, 25];
            const rows = ranking.map(r => [
                `#${r.position}`,
                r.athleteName,
                r.avgPV.toFixed(2),
                r.lastPV.toFixed(2),
                `${r.testCount}`,
            ]);

            y = this.drawTable(doc, y, headers, colWidths, rows, { highlightFirst: true });

            // Footer
            this.drawFooter(doc);

            doc.save(`tcar_ranking_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Erro ao gerar PDF do ranking:', error);
            throw new Error('Não foi possível gerar o PDF.');
        }
    }

    // ====================================================================
    // CSV Export (mantido para compatibilidade)
    // ====================================================================

    exportTestResultsToCSV(
        protocolLevel: number,
        totalTime: number,
        date: string,
        athleteResults: AthleteResult[]
    ): string {
        const headers = [
            'Atleta', 'Estágios Completos', 'Reps Último Estágio', 'Total Reps',
            'PV Bruto (km/h)', 'PV Corrigido (km/h)', 'FC Final (bpm)',
            'FC Estimada (bpm)', 'Distância (m)', 'Eliminado por Falha',
        ];
        const rows = athleteResults.map(ar => [
            `"${ar.athleteName}"`, ar.completedStages, ar.completedRepsInLastStage,
            ar.totalReps, ar.pvBruto.toFixed(2), ar.pvCorrigido.toFixed(2),
            ar.fcFinal ?? '', ar.fcEstimada ?? '', ar.finalDistance,
            ar.eliminatedByFailure ? 'Sim' : 'Não',
        ]);
        const metaRows = [
            [`T-CAR - Relatório de Teste`],
            [`Data: ${new Date(date).toLocaleDateString('pt-BR')}`],
            [`Protocolo: Nível ${protocolLevel}`],
            [`Tempo Total: ${this.formatTime(totalTime)}`],
            [`Atletas: ${athleteResults.length}`],
            [],
        ];
        return [
            ...metaRows.map(r => r.join(',')),
            headers.join(','),
            ...rows.map(r => r.join(',')),
        ].join('\n');
    }

    exportGroupRankingToCSV(
        ranking: { position: number; athleteName: string; avgPV: number; testCount: number }[]
    ): string {
        const headers = ['Posição', 'Atleta', 'PV Médio (km/h)', 'Nº Testes'];
        const rows = ranking.map(r => [`#${r.position}`, `"${r.athleteName}"`, r.avgPV.toFixed(2), r.testCount]);
        return [
            [`T-CAR - Ranking do Grupo`].join(','),
            [`Data: ${new Date().toLocaleDateString('pt-BR')}`].join(','),
            [`Total de Atletas: ${ranking.length}`].join(','),
            '',
            headers.join(','),
            ...rows.map(r => r.join(',')),
        ].join('\n');
    }

    // ====================================================================
    // Utilitários
    // ====================================================================

    downloadCSV(csvContent: string, fileName: string): void {
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    /**
     * Captures a Recharts container as a PNG data URL for embedding in PDF.
     * Pass the ref or DOM element of the chart container.
     */
    async captureChartAsImage(chartElement: HTMLElement | null): Promise<string | null> {
        if (!chartElement) return null;
        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(chartElement, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true,
            });
            return canvas.toDataURL('image/png');
        } catch (error) {
            console.error('Erro ao capturar gráfico:', error);
            return null;
        }
    }

    private formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

export const ExportService = new ExportServiceClass();
