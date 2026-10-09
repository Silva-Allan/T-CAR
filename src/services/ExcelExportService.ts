// ======================================================================
// T-CAR 2.1 — Excel Export Service
// ======================================================================
// Gera .xlsx real (números como número, datas como data) com a identidade
// do T-CAR em todas as abas: logo oficial, título, "gerado pelo aplicativo
// T-CAR", faixa verde, tabela com linhas alternadas e assinatura no fim.
// Serve para o relatório unificado, a bateria isolada, o ranking do grupo
// e o histórico do atleta.
// A biblioteca é carregada sob demanda para não pesar no bundle do PWA.
// ======================================================================

import type { Cell, Row, SheetData, Sheet } from 'write-excel-file/browser';
import type { MergedReport } from '@/services/MergeService';
import { BRAND, LOGO_PX, loadLogo } from '@/services/BrandService';
import { Logger } from '@/utils/Logger';

type T = (key: any, ...args: (string | number)[]) => string;

const HEADER_STYLE = {
  fontWeight: 'bold',
  backgroundColor: BRAND.green,
  textColor: '#FFFFFF',
  alignVertical: 'center',
  wrap: true,
  borderColor: BRAND.greenDark,
  borderStyle: 'thin',
} as const;
const PV_FORMAT = '0.0';
const SIGNED_FORMAT = '+0.0;-0.0;0.0';
const SIGNED_PCT_FORMAT = '+0.0%;-0.0%;0.0%';
const DATE_FORMAT = 'dd/mm/yyyy';

// Linhas do bloco de abertura antes da tabela (título, subtítulo, faixa verde)
const BRAND_ROWS = 3;

interface DocInfo {
  /** Título do documento, ex.: "Pré-temporada Sub-15" ou "Relatório do Teste" */
  title: string;
  /** Contexto curto depois da assinatura, ex.: período e número de atletas */
  context?: string;
}

class ExcelExportServiceClass {
  async exportReport(
    report: MergedReport,
    t: T,
    fileName: string,
    options: { title?: string | null; kind?: 'battery' | 'merged' } = {}
  ): Promise<void> {
    try {
      const title = options.title || (options.kind === 'battery' ? t('reportTest') : t('mergedReportTitle'));
      const sheets: Sheet<any>[] = [
        this.rankingSheet(report, t),
        this.detailSheet(report, t),
      ];
      if (report.groups.length > 1) sheets.push(this.comparisonSheet(report, t));
      sheets.push(this.batteriesSheet(report, t));

      const context = [this.periodText(report, t), `${report.stats.athletes} ${t('athletesPlural')}`]
        .filter(Boolean).join(' · ');
      await this.write(sheets, { title, context }, t, fileName);
    } catch (error) {
      Logger.error('Erro ao gerar Excel:', error);
      throw new Error('Não foi possível gerar o Excel.');
    }
  }

  /** Ranking geral do Dashboard (média de todos os testes de cada atleta) */
  async exportGroupRanking(
    ranking: { position: number; athleteName: string; avgPV: number; lastPV: number; testCount: number }[],
    t: T,
    fileName: string,
    options: { team?: string | null } = {}
  ): Promise<void> {
    try {
      const data: SheetData = [
        this.header([t('xlsRank'), t('xlsAthlete'), t('xlsAvgPV'), t('xlsLastPV'), t('xlsTestCount')]),
        ...ranking.map(r => [r.position, r.athleteName, this.pv(r.avgPV), this.pv(r.lastPV), r.testCount]),
      ];
      const sheet: Sheet<any> = {
        data,
        sheet: t('xlsSheetRanking'),
        columns: [{ width: 11 }, { width: 30 }, { width: 18 }, { width: 18 }, { width: 10 }],
      };
      const context = [options.team, `${ranking.length} ${t('athletesPlural')}`].filter(Boolean).join(' · ');
      await this.write([sheet], { title: t('reportGroup'), context }, t, fileName);
    } catch (error) {
      Logger.error('Erro ao gerar Excel do ranking:', error);
      throw new Error('Não foi possível gerar o Excel.');
    }
  }

  /** Histórico de testes de um atleta (perfil do atleta) */
  async exportAthleteHistory(
    athlete: { name: string; team?: string | null; category?: string | null; sport?: string | null; position?: string | null },
    tests: {
      date: string;
      protocolLevel: number;
      pvCorrigido: number;
      classification: string | null;
      fcFinal?: number | null;
      fcEstimada?: number | null;
      completedStages?: number | null;
      totalReps?: number | null;
      finalDistance?: number | null;
    }[],
    t: T,
    fileName: string
  ): Promise<void> {
    try {
      const data: SheetData = [
        this.header([
          t('xlsDate'), t('xlsLevel'), t('xlsPvCorr'), t('xlsClassification'),
          t('xlsHrFinal'), t('xlsHrEstimated'), t('xlsStages'), t('xlsTotalReps'), t('xlsDistance'),
        ]),
        ...tests.map(test => [
          this.date(this.dayOf(test.date)),
          test.protocolLevel,
          this.pv(test.pvCorrigido),
          test.classification ?? t('xlsNoReferenceTable'),
          test.fcFinal ?? null,
          test.fcEstimada ?? null,
          test.completedStages ?? null,
          test.totalReps ?? null,
          test.finalDistance ?? null,
        ]),
      ];
      const sheet: Sheet<any> = {
        data,
        sheet: t('xlsSheetHistory'),
        columns: [
          { width: 12 }, { width: 8 }, { width: 18 }, { width: 22 },
          { width: 14 }, { width: 18 }, { width: 10 }, { width: 13 }, { width: 14 },
        ],
      };
      const context = [
        athlete.sport ? t(`sport_${athlete.sport}`) : null,
        athlete.position ? this.positionLabel(athlete.position, t) : null,
        athlete.category,
        athlete.team,
        `${tests.length} ${t('xlsTestsCountLabel')}`,
      ].filter(Boolean).join(' · ');
      await this.write([sheet], { title: `${t('reportHistory')} · ${athlete.name}`, context }, t, fileName);
    } catch (error) {
      Logger.error('Erro ao gerar Excel do histórico:', error);
      throw new Error('Não foi possível gerar o Excel.');
    }
  }

  // ====================================================================
  // Identidade T-CAR em cada aba
  // ====================================================================

  private async write(sheets: Sheet<any>[], info: DocInfo, t: T, fileName: string): Promise<void> {
    const logo = await loadLogo();
    const branded = sheets.map(sheet => this.brand(sheet, info, t, logo));
    const { default: writeXlsxFile } = await import('write-excel-file/browser');
    await writeXlsxFile(branded, { fontFamily: 'Calibri', fontSize: 11 }).toFile(fileName);
  }

  /**
   * Monta a aba com a identidade do T-CAR. Recebe a aba "crua" (primeira
   * linha = cabeçalho da tabela) e devolve com o bloco de abertura, a tabela
   * estilizada e a assinatura no fim.
   */
  private brand(sheet: Sheet<any>, info: DocInfo, t: T, logo: Blob | null): Sheet<any> {
    const [header, ...rows] = sheet.data;
    const cols = header.length;
    const widths = (sheet.columns ?? []).map(c => c.width ?? 10);

    // O título começa na primeira coluna livre à direita da logo (~60 px; 1 caractere ≈ 7 px)
    let titleCol = 0;
    if (logo) {
      let px = 0;
      while (titleCol < cols - 1 && px < 60) {
        px += (widths[titleCol] ?? 10) * 7 + 5;
        titleCol++;
      }
    }
    const span = Math.max(1, cols - titleCol);
    const spanRow = (cell: Cell): Row => [
      ...Array(titleCol).fill(null),
      cell,
      ...Array(span - 1).fill(null),
    ];

    const locale = t('dateLocale') || 'pt-BR';
    const now = new Date();
    const generatedAt = `${now.toLocaleDateString(locale)} ${now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
    const subtitle = [t('docGeneratedAt', generatedAt), info.context].filter(Boolean).join(' · ');

    const titleRow = spanRow({
      value: info.title,
      fontSize: 16,
      fontWeight: 'bold',
      textColor: BRAND.green,
      alignVertical: 'bottom',
      height: 30,
      columnSpan: span,
    });
    const subtitleRow = spanRow({
      value: subtitle,
      fontSize: 9,
      textColor: BRAND.muted,
      alignVertical: 'top',
      height: 22,
      columnSpan: span,
    });
    // Faixa verde com ponta vermelha, como no PDF
    const bandRow: Row = Array.from({ length: cols }, (_, i) => ({
      value: '',
      backgroundColor: i === cols - 1 ? BRAND.red : BRAND.green,
      height: 4,
    }));

    const styledHeader: Row = header.map(cell => ({ ...this.asObject(cell), align: 'center', height: 30 }));

    const styledRows: Row[] = rows.map((row, index) =>
      row.map(cell => {
        const obj = this.asObject(cell);
        // Números e datas centralizados; texto à esquerda
        const centered = typeof obj.value === 'number' || obj.value instanceof Date;
        return {
          ...obj,
          ...(centered ? { align: 'center' } : {}),
          ...(index % 2 === 1 ? { backgroundColor: BRAND.zebra } : {}),
          bottomBorderColor: BRAND.border,
          bottomBorderStyle: 'thin',
          alignVertical: 'center',
          height: 18,
        };
      })
    );

    const signatureRow: Row = [{
      value: `${t('docGeneratedBy')} · ${BRAND.tagline}`,
      fontSize: 9,
      fontStyle: 'italic',
      textColor: BRAND.muted,
      columnSpan: cols,
    }, ...Array(cols - 1).fill(null)];

    return {
      ...sheet,
      data: [titleRow, subtitleRow, bandRow, styledHeader, ...styledRows, [], signatureRow],
      stickyRowsCount: BRAND_ROWS + 1,
      showGridLines: false,
      images: logo ? [{
        content: logo,
        contentType: 'image/png',
        width: LOGO_PX,
        height: LOGO_PX,
        // ~46 px na planilha
        dpi: Math.round((LOGO_PX * 96) / 46),
        anchor: { row: 1, column: 1 },
        offsetX: 4,
        offsetY: 4,
        title: 'T-CAR',
      }] : undefined,
    };
  }

  /** Célula como objeto, para receber estilo sem perder valor/formato */
  private asObject(cell: Cell): Record<string, any> {
    if (cell === null || cell === undefined) return {};
    if (typeof cell === 'object' && !(cell instanceof Date)) return { ...cell };
    return { value: cell };
  }

  private periodText(report: MergedReport, t: T): string | null {
    if (!report.period) return null;
    const locale = t('dateLocale') || 'pt-BR';
    const fmt = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(locale);
    const range = report.period.start === report.period.end
      ? fmt(report.period.start)
      : `${fmt(report.period.start)} - ${fmt(report.period.end)}`;
    return `${t('period')} ${range}`;
  }

  /** Dia local de um timestamp (ou data pura) para a coluna de data */
  private dayOf(date: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const d = new Date(date);
    if (isNaN(d.getTime())) return date.slice(0, 10);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // ====================================================================
  // Abas
  // ====================================================================

  private rankingSheet(report: MergedReport, t: T): Sheet<any> {
    const withLevel = report.mixedLevels;
    const withGroup = report.mixedGroups;
    const multiGroup = report.groups.length > 1;
    const headers = [
      ...(withGroup ? [t('xlsSport')] : []),
      ...(withLevel ? [t('xlsLevel')] : []),
      t('xlsRank'), t('xlsAthlete'), t('xlsTeam'), t('xlsCategory'), t('xlsGender'), t('xlsFieldPosition'),
      t('xlsPvCorr'), t('xlsClassification'),
      t('xlsHrFinal'), t('xlsHrEstimated'),
      t('xlsStages'), t('xlsTotalReps'), t('xlsDistance'),
      ...(multiGroup ? [t('xlsEvaluation')] : []),
      t('xlsBattery'), t('xlsNotes'),
    ];

    const data: SheetData = [this.header(headers)];
    for (const section of report.sections) {
      for (const entry of section.ranking) {
        const r = entry.row;
        data.push([
          ...(withGroup ? [t(`group_${section.group}`)] : []),
          ...(withLevel ? [section.level] : []),
          entry.position,
          r.athleteName,
          r.team,
          r.category,
          this.genderLabel(r.gender, t),
          this.positionLabel(r.position, t),
          this.pv(r.pvCorrigido),
          // Sem tabela de referência, a colocação (coluna ao lado) é o resultado
          entry.classification ? t(entry.classification.label) : t('xlsNoReferenceTable'),
          r.fcFinal,
          r.fcEstimada,
          r.completedStages,
          r.totalReps,
          r.finalDistance,
          ...(multiGroup ? [report.groups[r.groupIndex].label] : []),
          r.batteryNumber,
          entry.repeated ? t('xlsBestOfBatteries') : null,
        ]);
      }
    }

    return {
      data,
      sheet: t('xlsSheetRanking'),
      columns: [
        ...(withGroup ? [{ width: 18 }] : []),
        ...(withLevel ? [{ width: 7 }] : []),
        { width: 11 }, { width: 28 }, { width: 18 }, { width: 13 }, { width: 11 }, { width: 18 },
        { width: 18 }, { width: 22 },
        { width: 14 }, { width: 18 },
        { width: 10 }, { width: 13 }, { width: 14 },
        ...(multiGroup ? [{ width: 22 }] : []),
        { width: 9 }, { width: 30 },
      ],
    };
  }

  private detailSheet(report: MergedReport, t: T): Sheet<any> {
    const headers = [
      t('xlsEvaluation'), t('xlsDate'), t('xlsTime'), t('xlsBattery'), t('xlsLevel'),
      t('xlsAthlete'), t('xlsTeam'), t('xlsCategory'), t('xlsGender'), t('xlsSport'), t('xlsFieldPosition'),
      t('xlsPvCorr'),
      t('xlsHrFinal'), t('xlsHrEstimated'),
      t('xlsStages'), t('xlsRepsLastStage'), t('xlsTotalReps'), t('xlsDistance'),
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
        this.genderLabel(r.gender, t),
        t(`sport_${r.sport}`),
        this.positionLabel(r.position, t),
        this.pv(r.pvCorrigido),
        r.fcFinal,
        r.fcEstimada,
        r.completedStages,
        r.completedRepsInLastStage,
        r.totalReps,
        r.finalDistance,
      ]);
    }

    return {
      data,
      sheet: t('xlsSheetDetail'),
      columns: [
        { width: 22 }, { width: 12 }, { width: 8 }, { width: 9 }, { width: 7 },
        { width: 28 }, { width: 18 }, { width: 13 }, { width: 11 }, { width: 12 }, { width: 18 },
        { width: 18 },
        { width: 14 }, { width: 18 },
        { width: 10 }, { width: 14 }, { width: 13 }, { width: 14 },
      ],
    };
  }

  private comparisonSheet(report: MergedReport, t: T): Sheet<any> {
    const withLevel = report.mixedLevels;
    const withGroup = report.mixedGroups;
    const groupHeaders = report.groups.map((g, i) => `${i + 1}. ${g.label}`);
    const headers = [
      ...(withGroup ? [t('xlsSport')] : []),
      ...(withLevel ? [t('xlsLevel')] : []),
      t('xlsAthlete'), t('xlsTeam'), t('xlsCategory'),
      ...groupHeaders,
      t('xlsEvolution'), t('xlsEvolutionPct'),
    ];

    const data: SheetData = [this.header(headers)];
    for (const section of report.sections) {
      for (const c of section.comparison) {
        data.push([
          ...(withGroup ? [t(`group_${section.group}`)] : []),
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
      stickyColumnsCount: 1 + (withGroup ? 1 : 0) + (withLevel ? 1 : 0),
      columns: [
        ...(withGroup ? [{ width: 18 }] : []),
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

  private genderLabel(gender: string | null, t: T): string | null {
    if (gender === 'M') return t('genderM');
    if (gender === 'F') return t('genderF');
    if (gender === 'Outro') return t('genderOther');
    return null;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const ExcelExportService = new ExcelExportServiceClass();
