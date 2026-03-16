// ======================================================================
// T-CAR 2.0 — Export Service (Design Aprimorado)
// ======================================================================
// Exportação de dados em PDF profissional com layout modernizado.
// Destaque para: T-CAR, nome do atleta, clube/equipe e data do PDF.
// ======================================================================

import { AthleteResult } from '@/models/types';

// Cores UDESC (mantidas)
const UDESC_GREEN = [0, 102, 51] as const;       // #006633
const UDESC_DARK = [0, 51, 25] as const;          // #003319
const ACCENT_RED = [200, 16, 46] as const;        // #C8102E
const TEXT_PRIMARY = [30, 30, 30] as const;
const TEXT_SECONDARY = [120, 120, 120] as const;
const TEXT_LIGHT = [255, 255, 255] as const;
const TABLE_HEADER_BG = [0, 102, 51] as const;
const TABLE_ROW_ALT = [240, 245, 240] as const;
const TABLE_BORDER = [200, 210, 200] as const;
const BG_LIGHT = [248, 250, 248] as const;

class ExportServiceClass {

    // ====================================================================
    // PDF Helpers — Design Aprimorado
    // ====================================================================

    private drawEnhancedHeader(doc: any, title: string, lang: string, athleteName?: string, team?: string): number {
        const pageW = doc.internal.pageSize.getWidth();
        const headerHeight = 50;
        const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';
        const currentDate = new Date().toLocaleDateString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Fundo principal com gradiente visual (faixas)
        doc.setFillColor(...UDESC_GREEN);
        doc.rect(0, 0, pageW, headerHeight, 'F');

        // Faixa superior mais escura
        doc.setFillColor(...UDESC_DARK);
        doc.rect(0, 0, pageW, 6, 'F');

        // LOGOTIPO T-CAR (esquerda)
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TEXT_LIGHT);
        doc.text('T-CAR', 15, 22);

        // Slogan ou versão (pequeno abaixo do logo)
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(200, 230, 200);
        doc.text('T-CAR App • UDESC', 15, 32);

        // NOME DO ATLETA (centralizado, destaque)
        if (athleteName) {
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...TEXT_LIGHT);

            // Centraliza o nome do atleta
            const nameWidth = doc.getTextWidth(athleteName);
            const centerX = (pageW - nameWidth) / 2;
            doc.text(athleteName, centerX, 22);

            // CLUBE/EQUIPE abaixo do nome do atleta
            if (team) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(220, 240, 220);
                const teamWidth = doc.getTextWidth(team);
                const teamCenterX = (pageW - teamWidth) / 2;
                doc.text(team, teamCenterX, 35);
            }
        }

        // DATA DO PDF (direita)
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TEXT_LIGHT);
        doc.text(currentDate, pageW - 15, 18, { align: 'right' });

        // Título do relatório (abaixo da data)
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 240, 220);
        doc.text(title, pageW - 15, 32, { align: 'right' });

        // Linha decorativa inferior (ajustada para evitar setGlobalAlpha que quebra em algumas versões)
        doc.setDrawColor(180, 220, 180); // Verde claro para simular transparência sobre o fundo verde
        doc.setLineWidth(0.3);
        doc.line(15, headerHeight - 8, pageW - 15, headerHeight - 8);

        return headerHeight + 10; // Y position after header
    }

    private drawModernInfoBox(doc: any, y: number, items: { label: string; value: string }[], columns = 3): number {
        const pageW = doc.internal.pageSize.getWidth();
        const boxW = pageW - 30;
        const colW = boxW / columns;
        const lineH = 8;
        const rows = Math.ceil(items.length / columns);
        const boxH = rows * lineH + 15;

        // Box com sombra simulada (borda dupla)
        doc.setFillColor(...BG_LIGHT);
        doc.setDrawColor(...TABLE_BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, y, boxW, boxH, 4, 4, 'FD');

        // Barra lateral verde (identidade visual)
        doc.setFillColor(...UDESC_GREEN);
        doc.roundedRect(15, y, 4, boxH, 2, 2, 'F');

        // Grid de informações
        doc.setFontSize(8.5);
        items.forEach((item, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);
            const x = 28 + col * colW;
            const itemY = y + 10 + row * lineH;

            // Label
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...TEXT_SECONDARY);
            doc.text(item.label, x, itemY);

            // Value
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TEXT_PRIMARY);
            const labelWidth = doc.getTextWidth(item.label + '  ');
            doc.text(item.value, x + labelWidth, itemY);
        });

        return y + boxH + 10;
    }

    private drawSectionTitleModern(doc: any, y: number, title: string, icon?: string): number {
        // Título com ícone
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...UDESC_GREEN);

        const text = icon ? `${icon}  ${title}` : title;
        doc.text(text, 15, y);

        // Linha dupla decorativa
        doc.setDrawColor(...UDESC_GREEN);
        doc.setLineWidth(0.5);
        doc.line(15, y + 2, 15 + doc.getTextWidth(text), y + 2);

        doc.setDrawColor(...TABLE_BORDER);
        doc.setLineWidth(0.2);
        doc.line(15 + doc.getTextWidth(text) + 5, y + 2, doc.internal.pageSize.getWidth() - 15, y + 2);

        return y + 12;
    }

    private drawMetricCard(doc: any, y: number, metrics: { label: string; value: string; color?: readonly [number, number, number]; icon?: string }[]): number {
        const pageW = doc.internal.pageSize.getWidth();
        const cardW = (pageW - 30 - (metrics.length - 1) * 8) / metrics.length;
        const cardH = 35;

        metrics.forEach((metric, i) => {
            const x = 15 + i * (cardW + 8);

            // Card com efeito elevado
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(...TABLE_BORDER);
            doc.setLineWidth(0.3);
            doc.roundedRect(x, y, cardW, cardH, 5, 5, 'FD');

            // Barra superior colorida
            const color = metric.color || UDESC_GREEN;
            doc.setFillColor(...color);
            doc.roundedRect(x, y, cardW, 4, 2, 2, 'F');

            // Ícone opcional
            if (metric.icon) {
                doc.setFontSize(12);
                doc.setTextColor(...color);
                doc.text(metric.icon, x + 8, y + 16);
            }

            // Valor (grande)
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...color);

            const valueX = metric.icon ? x + 22 : x + cardW / 2;
            const valueAlign: 'left' | 'center' = metric.icon ? 'left' : 'center';

            if (metric.icon) {
                doc.text(metric.value, valueX, y + 18);
            } else {
                doc.text(metric.value, valueX, y + 18, { align: 'center' });
            }

            // Label
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TEXT_SECONDARY);

            const labelX = metric.icon ? x + 22 : x + cardW / 2;
            doc.text(metric.label.toUpperCase(), labelX, y + 27, { align: valueAlign });
        });

        return y + cardH + 12;
    }

    private drawEnhancedTable(
        doc: any,
        y: number,
        headers: string[],
        colWidths: number[],
        rows: string[][],
        options: { highlightFirst?: boolean; title?: string } = {}
    ): number {
        const startX = 15;
        const rowH = 8;
        const headerH = 10;

        // Título opcional da tabela
        if (options.title) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...UDESC_GREEN);
            doc.text(options.title, startX, y - 3);
        }

        // Header com gradiente visual
        doc.setFillColor(...TABLE_HEADER_BG);
        doc.roundedRect(startX, y, colWidths.reduce((a, b) => a + b, 0), headerH, 3, 3, 'F');

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);

        let x = startX + 4;
        headers.forEach((h, i) => {
            doc.text(h, x, y + 7);
            x += colWidths[i];
        });

        y += headerH + 2;

        // Data rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        rows.forEach((row, rowIdx) => {
            // Page break check
            if (y > 260) {
                doc.addPage();
                y = 30;

                // Redraw header
                doc.setFillColor(...TABLE_HEADER_BG);
                doc.roundedRect(startX, y, colWidths.reduce((a, b) => a + b, 0), headerH, 3, 3, 'F');
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                let hx = startX + 4;
                headers.forEach((h, i) => {
                    doc.text(h, hx, y + 7);
                    hx += colWidths[i];
                });
                y += headerH + 2;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
            }

            // Alternating row background
            if (rowIdx % 2 === 0) {
                doc.setFillColor(...TABLE_ROW_ALT);
                doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH, 'F');
            }

            // Highlight top positions
            if (options.highlightFirst) {
                if (rowIdx === 0) {
                    doc.setTextColor(...UDESC_GREEN);
                    doc.setFont('helvetica', 'bold');
                } else if (rowIdx === 1 || rowIdx === 2) {
                    doc.setTextColor(...TEXT_PRIMARY);
                    doc.setFont('helvetica', 'normal');
                } else {
                    doc.setTextColor(...TEXT_SECONDARY);
                    doc.setFont('helvetica', 'normal');
                }
            } else {
                doc.setTextColor(...TEXT_PRIMARY);
                doc.setFont('helvetica', 'normal');
            }

            let rx = startX + 4;
            row.forEach((cell, i) => {
                doc.text(cell, rx, y + 5.5);
                rx += colWidths[i];
            });

            y += rowH;
        });

        return y + 5;
    }

    private drawChartWithFrame(doc: any, y: number, chartImage: string | null, label: string): number {
        if (!chartImage) return y;

        const pageW = doc.internal.pageSize.getWidth();
        const chartW = pageW - 30;

        let chartH = 75;
        try {
            const props = doc.getImageProperties(chartImage);
            if (props?.width && props?.height) {
                const aspectRatio = props.width / props.height;
                chartH = Math.min(chartW / aspectRatio, 100);
            }
        } catch {
            // use default 
        }

        // Page break check
        if (y + chartH + 25 > 270) {
            doc.addPage();
            y = 30;
        }

        y = this.drawSectionTitleModern(doc, y, label);

        // Frame com sombra
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...TABLE_BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, y, chartW, chartH, 5, 5, 'FD');

        try {
            if (chartImage) {
                doc.addImage(chartImage, 'PNG', 17, y + 2, chartW - 4, chartH - 4);
            }
        } catch (e) {
            doc.setFontSize(9);
            doc.setTextColor(...TEXT_SECONDARY);
            doc.text('Chart not available', 15 + chartW / 2, y + chartH / 2, { align: 'center' });
        }

        return y + chartH + 15;
    }

    private drawEnhancedFooter(doc: any, t: any, lang: string) {
        const pageCount = doc.internal.getNumberOfPages();
        const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';
        const currentDate = new Date().toLocaleDateString(locale);
        const currentTime = new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const pageW = doc.internal.pageSize.getWidth();

            // Linha decorativa
            doc.setDrawColor(...TABLE_BORDER);
            doc.setLineWidth(0.3);
            doc.line(15, 280, pageW - 15, 280);

            // Logo texto
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...UDESC_GREEN);
            doc.text('T-CAR', 15, 287);

            // Info central
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TEXT_SECONDARY);
            doc.text('T-CAR App - UDESC - Test de Course avec Acceleration et Recuperation', 15, 292);

            // Data e página
            doc.setFont('helvetica', 'normal');
            doc.text(
                `${t('page')} ${i}/${pageCount}  |  ${currentTime}  |  ${currentDate}`,
                pageW - 15, 287, { align: 'right' }
            );
        }
    }

    // ====================================================================
    // PDF Export Methods (Atualizados)
    // ====================================================================

    async exportTestResultsToPDF(
        protocolLevel: number,
        totalTime: number,
        date: string,
        athleteResults: AthleteResult[],
        t: any,
        lang: string,
        options?: { temperature?: number | null; notes?: string; chartImage?: string | null; team?: string | null }
    ): Promise<void> {
        try {
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            // Header aprimorado
            let y = this.drawEnhancedHeader(doc, t('reportTest'), lang, undefined, options?.team ?? undefined);

            const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';

            // Info Box moderno
            const infoItems = [
                { label: t('reportTestDate'), value: new Date(date.includes('T') ? date : `${date}T12:00:00`).toLocaleDateString(locale) },
                { label: t('timeLabel'), value: new Date(date.includes('T') ? date : `${date}T12:00:00`).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) },
                { label: t('protocolLabel'), value: `${t('level')} ${protocolLevel}` },
                { label: t('totalTime') + ':', value: this.formatTime(totalTime) },
                { label: t('athletesLabel'), value: `${athleteResults.length}` },
                { label: t('temperatureLabel'), value: options?.temperature ? `${options.temperature}°C` : 'N/I' },
            ];

            if (options?.team && !athleteResults.length) {
                infoItems.push({ label: t('teamLabel'), value: options.team });
            }

            if (options?.notes) {
                infoItems.push({ label: t('notesLabel'), value: options.notes.substring(0, 30) + (options.notes.length > 30 ? '...' : '') });
            }

            y = this.drawModernInfoBox(doc, y, infoItems, 3);

            // Stat Cards aprimorados
            const pvValues = athleteResults.map(ar => ar.pvCorrigido);
            const bestPV = pvValues.length > 0 ? Math.max(...pvValues) : 0;
            const avgPV = pvValues.length > 0 ? pvValues.reduce((a, b) => a + b, 0) / pvValues.length : 0;
            const worstPV = pvValues.length > 0 ? Math.min(...pvValues) : 0;

            y = this.drawMetricCard(doc, y, [
                { label: t('bestPV'), value: bestPV.toFixed(1), color: UDESC_GREEN },
                { label: t('avgPV'), value: avgPV.toFixed(1), color: UDESC_GREEN },
                { label: t('worstPV'), value: worstPV.toFixed(1), color: ACCENT_RED },
                { label: t('totalAthletes'), value: `${athleteResults.length}`, color: UDESC_GREEN },
            ]);

            // Chart
            if (options?.chartImage) {
                y = this.drawChartWithFrame(doc, y, options.chartImage, t('pvDistribution'));
            }

            // Enhanced Table
            y = this.drawSectionTitleModern(doc, y, t('individualResults'));

            const headers = ['#', t('athlete'), t('pvCorr'), t('pvBruto'), t('fcLabel'), t('reportStages'), t('reportReps'), t('reportDistance'), t('status')];
            const colWidths = [8, 38, 20, 20, 18, 16, 14, 18, 13];

            const rows = athleteResults
                .sort((a, b) => b.pvCorrigido - a.pvCorrigido)
                .map((ar, i) => {
                    const fc = ar.fcFinal != null ? `${ar.fcFinal}` : (ar.fcEstimada != null ? `~${ar.fcEstimada}` : '-');
                    const statusSymbol = ar.eliminatedByFailure ? t('statusEliminated') : t('statusOK');
                    return [
                        `${i + 1}`,
                        ar.athleteName.substring(0, 16),
                        ar.pvCorrigido.toFixed(1),
                        ar.pvBruto.toFixed(1),
                        fc,
                        `${ar.completedStages}`,
                        `${ar.totalReps}`,
                        `${ar.finalDistance}`,
                        statusSymbol,
                    ];
                });

            y = this.drawEnhancedTable(doc, y, headers, colWidths, rows, {
                highlightFirst: true,
                title: t('rankingByPVCorrigido')
            });

            // Footer
            this.drawEnhancedFooter(doc, t, lang);

            const fileName = `tcar_teste_${new Date(date).toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            throw new Error('Não foi possível gerar o PDF.');
        }
    }

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
        t: any,
        lang: string,
        options?: {
            chartImage?: string | null;
            team?: string | null;
            classification?: { label: string; percentile: number; color: string } | null;
            lastTestDate?: string | null;
        }
    ): Promise<void> {
        try {
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            // Header com nome do atleta e equipe em destaque
            let y = this.drawEnhancedHeader(doc, t('reportHistory'), lang, athleteName, options?.team ?? undefined);
            const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';

            // Info Box
            const pvValues = tests.map(t => t.pvCorrigido);
            const best = pvValues.length > 0 ? Math.max(...pvValues) : 0;
            const worst = pvValues.length > 0 ? Math.min(...pvValues) : 0;
            const avg = pvValues.length > 0 ? pvValues.reduce((a, b) => a + b, 0) / pvValues.length : 0;

            const firstTest = tests.length > 0 ? tests[tests.length - 1] : null;
            const lastTest = tests.length > 0 ? tests[0] : null;

            y = this.drawModernInfoBox(doc, y, [
                { label: t('totalTests'), value: `${tests.length}` },
                {
                    label: t('period'), value: tests.length > 0
                        ? `${new Date(firstTest!.date).toLocaleDateString(locale)} - ${new Date(lastTest!.date).toLocaleDateString(locale)}`
                        : 'N/A'
                },
                { label: t('bestPV') + ':', value: best.toFixed(1) },
                { label: t('avgPV') + ':', value: avg.toFixed(1) },
                { label: t('worstPV') + ':', value: worst.toFixed(1) },
                {
                    label: t('evolution'), value: tests.length > 1
                        ? (pvValues[0] - pvValues[pvValues.length - 1] > 0 ? '+' : '') + (pvValues[0] - pvValues[pvValues.length - 1]).toFixed(1)
                        : 'N/A'
                },
            ], 3);

            // Metric Cards
            y = this.drawMetricCard(doc, y, [
                { label: t('bestPV'), value: best.toFixed(1), color: UDESC_GREEN },
                { label: t('avgPV'), value: avg.toFixed(1), color: UDESC_GREEN },
                { label: t('realizedTests'), value: `${tests.length}`, color: UDESC_GREEN },
            ]);

            // Classification Banner (se disponível)
            if (options?.classification) {
                const cl = options.classification;
                const hex = cl.color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16) || 0;
                const g = parseInt(hex.substring(2, 4), 16) || 102;
                const b = parseInt(hex.substring(4, 6), 16) || 51;

                const boxW = doc.internal.pageSize.getWidth() - 30;
                const boxH = 35;

                // 10% opacity background (blended with white manually for compatibility)
                const br = Math.round(255 * 0.9 + r * 0.1);
                const bg = Math.round(255 * 0.9 + g * 0.1);
                const bb = Math.round(255 * 0.9 + b * 0.1);

                doc.setFillColor(br, bg, bb);
                doc.setDrawColor(r, g, b);
                doc.setLineWidth(0.5);
                doc.roundedRect(15, y, boxW, boxH, 5, 5, 'FD');

                doc.setFillColor(r, g, b);
                doc.roundedRect(15, y, 5, boxH, 2, 2, 'F');

                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...TEXT_SECONDARY);
                doc.text(t('currentClassificationRule'), 30, y + 10);

                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(r, g, b);
                doc.text(t(cl.label as any), 30, y + 26);

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...TEXT_SECONDARY);

                const percentileText = `${t('percentile')} ${cl.percentile}`;
                if (options.lastTestDate) {
                    const dateStr = new Date(options.lastTestDate).toLocaleDateString(locale);
                    doc.text(`${percentileText}  |  ${t('lastTest')} ${dateStr}`, doc.internal.pageSize.getWidth() - 17, y + 26, { align: 'right' });
                } else {
                    doc.text(percentileText, doc.internal.pageSize.getWidth() - 17, y + 26, { align: 'right' });
                }

                y += boxH + 12;
            }

            // Chart
            if (options?.chartImage) {
                y = this.drawChartWithFrame(doc, y, options.chartImage, t('evolutionPVLabel'));
            }

            // Table
            y = this.drawSectionTitleModern(doc, y, t('testDetailing'));

            const headers = ['#', t('testDate'), t('level'), t('pvCorr'), t('pvBruto'), t('fcLabel'), t('reportStages'), t('reportReps'), t('reportDistance')];
            const colWidths = [8, 22, 14, 23, 20, 20, 18, 15, 20];

            const rows = tests.map((t_item, i) => [
                `${i + 1}`,
                new Date(t_item.date).toLocaleDateString(locale),
                `${t_item.protocolLevel}`,
                `${t_item.pvCorrigido.toFixed(1)}`,
                t_item.pvBruto != null ? `${t_item.pvBruto.toFixed(1)}` : '-',
                t_item.fcFinal != null ? `${t_item.fcFinal}` : (t_item.fcEstimada != null ? `~${t_item.fcEstimada}` : '-'),
                t_item.completedStages != null ? `${t_item.completedStages}` : '-',
                `${t_item.totalReps}`,
                t_item.finalDistance != null ? `${t_item.finalDistance}` : '-',
            ]);

            y = this.drawEnhancedTable(doc, y, headers, colWidths, rows, {
                title: t('fullTestHistory')
            });

            this.drawEnhancedFooter(doc, t, lang);

            const fileName = `tcar_historico_${athleteName.replace(/\s+/g, '_')}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error('Erro ao gerar PDF do histórico:', error);
            throw new Error('Não foi possível gerar o PDF.');
        }
    }

    async exportGroupRankingToPDF(
        ranking: {
            position: number;
            athleteName: string;
            avgPV: number;
            lastPV: number;
            testCount: number;
        }[],
        t: any,
        lang: string,
        options?: { chartImage?: string | null; totalTests?: number; team?: string | null }
    ): Promise<void> {
        try {
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF();
            const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';

            // Header
            let y = this.drawEnhancedHeader(doc, t('reportGroup'), lang, undefined, options?.team ?? undefined);

            // Info Box
            const totalTests = options?.totalTests || ranking.reduce((s, r) => s + r.testCount, 0);
            const groupAvg = ranking.length > 0
                ? ranking.reduce((sum, r) => sum + r.avgPV, 0) / ranking.length
                : 0;
            const bestAthlete = ranking.length > 0 ? ranking[0] : null;

            y = this.drawModernInfoBox(doc, y, [
                { label: t('reportDate'), value: new Date().toLocaleDateString(locale) },
                { label: t('totalAthletes') + ':', value: `${ranking.length}` },
                { label: t('totalTests'), value: `${totalTests}` },
                { label: t('groupAvg'), value: groupAvg.toFixed(1) },
                { label: t('leader'), value: bestAthlete ? bestAthlete.athleteName.split(' ')[0] : 'N/A' },
                { label: t('leaderPV'), value: bestAthlete ? bestAthlete.avgPV.toFixed(1) : 'N/A' },
            ], 3);

            // Stat Cards
            y = this.drawMetricCard(doc, y, [
                { label: t('groupAvgStats'), value: groupAvg.toFixed(1), color: UDESC_GREEN },
                { label: t('athletesLabel').replace(':', ''), value: `${ranking.length}`, color: UDESC_GREEN },
                { label: t('summaryTests'), value: `${totalTests}`, color: UDESC_GREEN },
                { label: t('leader').replace(':', ''), value: bestAthlete ? bestAthlete.avgPV.toFixed(1) : '-', color: UDESC_GREEN },
            ]);

            // Chart
            if (options?.chartImage) {
                y = this.drawChartWithFrame(doc, y, options.chartImage, t('pvDistributionAvg'));
            }

            // Ranking Table
            y = this.drawSectionTitleModern(doc, y, t('fullRanking'));

            const headers = [t('position'), t('athlete'), t('avgPVLabel'), t('lastPVLabel'), t('testCount')];
            const colWidths = [18, 60, 35, 35, 22];

            const rows = ranking.map(r => [
                r.position === 1 ? `1${lang === 'en' ? 'st' : 'º'}` :
                    r.position === 2 ? `2${lang === 'en' ? 'nd' : 'º'}` :
                        r.position === 3 ? `3${lang === 'en' ? 'rd' : 'º'}` : `#${r.position}`,
                r.athleteName,
                `${r.avgPV.toFixed(1)} km/h`,
                `${r.lastPV.toFixed(1)} km/h`,
                `${r.testCount}`,
            ]);

            y = this.drawEnhancedTable(doc, y, headers, colWidths, rows, {
                highlightFirst: true,
                title: t('generalClassificationAvg')
            });

            this.drawEnhancedFooter(doc, t, lang);

            const fileName = `tcar_ranking_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
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
        athleteResults: AthleteResult[],
        t: any,
        lang: string
    ): string {
        const headers = [
            t('athlete'), t('reportStages'), t('repsLabel'), t('totalReps'),
            `${t('pvBruto')} (km/h)`, `${t('pvCorr')} (km/h)`, `${t('fcFinal')} (bpm)`,
            `${t('estimatedHR')} (bpm)`, `${t('distance')} (m)`, t('status'),
        ];
        const rows = athleteResults.map(ar => [
            `"${ar.athleteName}"`, ar.completedStages, ar.completedRepsInLastStage,
            ar.totalReps, ar.pvBruto.toFixed(1), ar.pvCorrigido.toFixed(1),
            ar.fcFinal ?? '', ar.fcEstimada ?? '', ar.finalDistance,
            ar.eliminatedByFailure ? t('yes') : t('no'),
        ]);
        const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';
        const metaRows = [
            [`T-CAR - ${t('reportTest')}`],
            [`${t('testDate')} ${new Date(date).toLocaleDateString(locale)}`],
            [`${t('protocolLabel')}: ${t('level')} ${protocolLevel}`],
            [`${t('totalTime')}: ${this.formatTime(totalTime)}`],
            [`${t('athletesLabel')} ${athleteResults.length}`],
            [],
        ];
        return [
            ...metaRows.map(r => r.join(',')),
            headers.join(','),
            ...rows.map(r => r.join(',')),
        ].join('\n');
    }

    exportGroupRankingToCSV(
        ranking: { position: number; athleteName: string; avgPV: number; testCount: number }[],
        t: any,
        lang: string
    ): string {
        const headers = [t('position'), t('athlete'), `${t('avgPVLabel')} (km/h)`, t('testCount')];
        const rows = ranking.map(r => [`#${r.position}`, `"${r.athleteName}"`, r.avgPV.toFixed(1), r.testCount]);
        const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';
        return [
            [`T-CAR - ${t('reportGroup')}`].join(','),
            [`${t('reportDate')} ${new Date().toLocaleDateString(locale)}`].join(','),
            [`${t('totalAthletes')} ${ranking.length}`].join(','),
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