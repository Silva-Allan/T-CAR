// ======================================================================
// T-CAR 2.0 — Excel Export Service
// ======================================================================
// Gera .xlsx real (números como número, datas como data) a partir de um
// MergedReport. Serve tanto para o relatório unificado quanto para uma
// bateria isolada (relatório de um teste só).
// A biblioteca é carregada sob demanda para não pesar no bundle do PWA.
// ======================================================================

import type { Cell, Row, SheetData, Sheet } from 'write-excel-file/browser';
import type { MergedReport, ReportRow } from '@/services/MergeService';
import { ClassificationService } from '@/services/ClassificationService';
import { Logger } from '@/utils/Logger';

type T = (key: any, ...args: (string | number)[]) => string;

const HEADER_STYLE = { fontWeight: 'bold', backgroundColor: '#006633', textColor: '#FFFFFF' } as const;
const PV_FORMAT = '0.0';
const SIGNED_FORMAT = '+0.0;-0.0;0.0';
const SIGNED_PCT_FORMAT = '+0.0%;-0.0%;0.0%';
const DATE_FORMAT = 'dd/mm/yyyy';

class ExcelExportServiceClass {
  async exportReport(report: MergedReport, t: T, fileName: string): Promise<void> {
    try {
      const sheets: Sheet<any>[] = [
        this.rankingSheet(report, t),
        this.detailSheet(report, t),
      ];
      if (report.groups.length > 1) sheets.push(this.comparisonSheet(report, t));
      sheets.push(this.batteriesSheet(report, t));

      const { default: writeXlsxFile } = await import('write-excel-file/browser');
      await writeXlsxFile(sheets).toFile(fileName);
    } catch (error) {
      Logger.error('Erro ao gerar Excel:', error);
      throw new Error('Não foi possível gerar o Excel.');
    }
  }

  /** Ranking geral do Dashboard (média de todos os testes de cada atleta) */
  async exportGroupRanking(
    ranking: { position: number; athleteName: string; avgPV: number; lastPV: number; testCount: number }[],
    t: T,
    fileName: string
  ): Promise<void> {
    try {
      const data: SheetData = [
        this.header([t('xlsRank'), t('xlsAthlete'), t('xlsAvgPV'), t('xlsLastPV'), t('xlsTestCount')]),
        ...ranking.map(r => [r.position, r.athleteName, this.pv(r.avgPV), this.pv(r.lastPV), r.testCount]),
      ];
      const { default: writeXlsxFile } = await import('write-excel-file/browser');
      await writeXlsxFile([{
        data,
        sheet: t('xlsSheetRanking'),
        stickyRowsCount: 1,
        columns: [{ width: 11 }, { width: 28 }, { width: 18 }, { width: 18 }, { width: 10 }],
      }]).toFile(fileName);
    } catch (error) {
      Logger.error('Erro ao gerar Excel do ranking:', error);
      throw new Error('Não foi possível gerar o Excel.');
    }
  }

  // ====================================================================
  // Abas
  // ====================================================================

  private rankingSheet(report: MergedReport, t: T): Sheet<any> {
    const withLevel = report.mixedLevels;
    const multiGroup = report.groups.length > 1;
    const headers = [
      ...(withLevel ? [t('xlsLevel')] : []),
      t('xlsRank'), t('xlsAthlete'), t('xlsTeam'), t('xlsCategory'), t('xlsFieldPosition'),
      t('xlsPvCorr'), t('xlsPvRaw'), t('xlsClassification'),
      t('xlsHrFinal'), t('xlsHrEstimated'),
      t('xlsStages'), t('xlsTotalReps'), t('xlsDistance'),
      ...(multiGroup ? [t('xlsEvaluation')] : []),
      t('xlsBattery'), t('xlsStatus'), t('xlsNotes'),
    ];

    const data: SheetData = [this.header(headers)];
    for (const section of report.sections) {
      for (const entry of section.ranking) {
        const r = entry.row;
        data.push([
          ...(withLevel ? [section.level] : []),
          entry.position,
          r.athleteName,
          r.team,
          r.category,
          this.positionLabel(r.position, t),
          this.pv(r.pvCorrigido),
          this.pv(r.pvBruto),
          this.classification(r, t),
          r.fcFinal,
          r.fcEstimada,
          r.completedStages,
          r.totalReps,
          r.finalDistance,
          ...(multiGroup ? [report.groups[r.groupIndex].label] : []),
          r.batteryNumber,
          r.eliminatedByFailure ? t('statusEliminated') : t('statusOK'),
          entry.repeated ? t('xlsBestOfBatteries') : null,
        ]);
      }
    }

    return {
      data,
      sheet: t('xlsSheetRanking'),
      stickyRowsCount: 1,
      columns: [
        ...(withLevel ? [{ width: 7 }] : []),
        { width: 9 }, { width: 28 }, { width: 18 }, { width: 13 }, { width: 18 },
        { width: 16 }, { width: 15 }, { width: 16 },
        { width: 14 }, { width: 18 },
        { width: 10 }, { width: 13 }, { width: 14 },
        ...(multiGroup ? [{ width: 22 }] : []),
        { width: 9 }, { width: 9 }, { width: 24 },
      ],
    };
  }

  private detailSheet(report: MergedReport, t: T): Sheet<any> {
    const headers = [
      t('xlsEvaluation'), t('xlsDate'), t('xlsTime'), t('xlsBattery'), t('xlsLevel'),
      t('xlsAthlete'), t('xlsTeam'), t('xlsCategory'), t('xlsFieldPosition'),
      t('xlsPvCorr'), t('xlsPvRaw'),
      t('xlsHrFinal'), t('xlsHrEstimated'),
      t('xlsStages'), t('xlsRepsLastStage'), t('xlsTotalReps'), t('xlsDistance'),
      t('xlsEliminated'),
    ];

    const rows = [...report.rows].sort((a, b) =>
      a.groupIndex - b.groupIndex || a.batteryNumber - b.batteryNumber || b.pvCorrigido - a.pvCorrigido
    );

    const data: SheetData = [this.header(headers)];
    for (const r of rows) {
      data.push([
        report.groups[r.groupIndex].label,
        this.date(r.day),
        r.time,
        r.batteryNumber,
        r.protocolLevel,
        r.athleteName,
        r.team,
        r.category,
        this.positionLabel(r.position, t),
        this.pv(r.pvCorrigido),
        this.pv(r.pvBruto),
        r.fcFinal,
        r.fcEstimada,
        r.completedStages,
        r.completedRepsInLastStage,
        r.totalReps,
        r.finalDistance,
        r.eliminatedByFailure ? t('yes') : t('no'),
      ]);
    }

    return {
      data,
      sheet: t('xlsSheetDetail'),
      stickyRowsCount: 1,
      columns: [
        { width: 22 }, { width: 12 }, { width: 8 }, { width: 9 }, { width: 7 },
        { width: 28 }, { width: 18 }, { width: 13 }, { width: 18 },
        { width: 16 }, { width: 15 },
        { width: 14 }, { width: 18 },
        { width: 10 }, { width: 14 }, { width: 13 }, { width: 14 },
        { width: 12 },
      ],
    };
  }

  private comparisonSheet(report: MergedReport, t: T): Sheet<any> {
    const withLevel = report.mixedLevels;
    const groupHeaders = report.groups.map((g, i) => `${i + 1}. ${g.label}`);
    const headers = [
      ...(withLevel ? [t('xlsLevel')] : []),
      t('xlsAthlete'), t('xlsTeam'), t('xlsCategory'),
      ...groupHeaders,
      t('xlsEvolution'), t('xlsEvolutionPct'),
    ];

    const data: SheetData = [this.header(headers)];
    for (const section of report.sections) {
      for (const c of section.comparison) {
        data.push([
          ...(withLevel ? [section.level] : []),
          c.athleteName,
          c.team,
          c.category,
          ...c.values.map(v => (v != null ? this.pv(v) : null)),
          c.evolution != null ? { value: Math.round(c.evolution * 10) / 10, type: Number, format: SIGNED_FORMAT } : null,
          c.evolutionPct != null ? { value: Math.round(c.evolutionPct * 10) / 1000, type: Number, format: SIGNED_PCT_FORMAT } : null,
        ]);
      }
    }

    return {
      data,
      sheet: t('xlsSheetComparison'),
      stickyRowsCount: 1,
      stickyColumnsCount: withLevel ? 2 : 1,
      columns: [
        ...(withLevel ? [{ width: 7 }] : []),
        { width: 28 }, { width: 18 }, { width: 13 },
        ...groupHeaders.map(h => ({ width: Math.max(14, Math.min(h.length + 2, 30)) })),
        { width: 16 }, { width: 14 },
      ],
    };
  }

  private batteriesSheet(report: MergedReport, t: T): Sheet<any> {
    const headers = [
      t('xlsEvaluation'), t('xlsDate'), t('xlsTime'), t('xlsBattery'), t('xlsLevel'),
      t('xlsAthleteCount'), t('xlsTotalTime'), t('xlsTemperature'), t('xlsNotes'),
    ];
    const groupLabel = new Map(report.groups.map(g => [g.key, g.label]));

    const data: SheetData = [this.header(headers)];
    for (const b of report.batteries) {
      data.push([
        groupLabel.get(b.groupKey) ?? '',
        this.date(b.day),
        b.time,
        b.number,
        b.protocolLevel,
        b.athleteCount,
        this.formatTime(b.totalTime),
        b.temperature,
        b.notes,
      ]);
    }

    return {
      data,
      sheet: t('xlsSheetBatteries'),
      stickyRowsCount: 1,
      columns: [
        { width: 22 }, { width: 12 }, { width: 8 }, { width: 9 }, { width: 7 },
        { width: 10 }, { width: 12 }, { width: 16 }, { width: 40 },
      ],
    };
  }

  // ====================================================================
  // Utilitários
  // ====================================================================

  private header(labels: string[]): Row {
    return labels.map(value => ({ value, ...HEADER_STYLE }));
  }

  private pv(value: number): Cell {
    return { value: Math.round(value * 10) / 10, type: Number, format: PV_FORMAT };
  }

  /** A biblioteca converte datas em UTC — construir em UTC evita trocar o dia */
  private date(day: string): Cell {
    const [y, m, d] = day.split('-').map(Number);
    if (!y || !m || !d) return day;
    return { value: new Date(Date.UTC(y, m - 1, d)), type: Date, format: DATE_FORMAT };
  }

  private positionLabel(position: string | null, t: T): string | null {
    if (!position) return null;
    const label = t(position);
    return label || position;
  }

  private classification(r: ReportRow, t: T): string {
    const cl = ClassificationService.getClassification(r.protocolLevel, r.pvCorrigido, {
      birth_date: r.birthDate ?? undefined,
      position: r.position ?? undefined,
    });
    return t(cl.label);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const ExcelExportService = new ExcelExportServiceClass();
