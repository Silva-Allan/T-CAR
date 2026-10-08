// ======================================================================
// T-CAR 2.0 — Merge Service
// ======================================================================
// Unifica várias baterias (tests) em um único relatório:
//  - Baterias agrupadas em "avaliações" (por dia ou por avaliação salva)
//  - Ranking geral por nível de protocolo
//  - Comparativo entre avaliações (Aval. 1, Aval. 2, ...) quando há mais de uma
// Não depende de UI nem de Supabase — recebe dados normalizados.
// ======================================================================

import { Athlete, AthleteResult, calculateCategory } from '@/models/types';

export interface ReportResult {
  testId: string;
  athleteId: string;
  athleteName: string;
  team: string | null;
  birthDate: string | null;
  category: string | null;
  position: string | null;
  pvCorrigido: number;
  pvBruto: number;
  fcFinal: number | null;
  fcEstimada: number | null;
  completedStages: number;
  completedRepsInLastStage: number;
  totalReps: number;
  finalDistance: number;
  eliminatedByFailure: boolean;
}

export interface ReportTest {
  id: string;
  /** Dia local da bateria (YYYY-MM-DD) */
  day: string;
  /** Hora local da bateria (HH:mm), null se o registro só tem a data */
  time: string | null;
  /** Timestamp para ordenar as baterias */
  sortKey: string;
  protocolLevel: number;
  totalTime: number;
  temperature: number | null;
  notes: string | null;
  results: ReportResult[];
}

export interface ReportGroupInput {
  key: string;
  label: string;
  testIds: string[];
}

export interface ReportGroup {
  key: string;
  label: string;
  /** Primeiro dia da avaliação (YYYY-MM-DD) */
  day: string;
  batteryCount: number;
  athleteCount: number;
}

export interface ReportBattery {
  testId: string;
  groupKey: string;
  /** Número da bateria dentro da avaliação (1, 2, 3...) */
  number: number;
  day: string;
  time: string | null;
  protocolLevel: number;
  totalTime: number;
  temperature: number | null;
  notes: string | null;
  athleteCount: number;
}

export interface ReportRow extends ReportResult {
  groupKey: string;
  groupIndex: number;
  day: string;
  time: string | null;
  batteryNumber: number;
  protocolLevel: number;
}

export interface RankingEntry {
  position: number;
  row: ReportRow;
  /** Atleta fez mais de uma bateria na mesma avaliação (vale o melhor PV) */
  repeated: boolean;
}

export interface ComparisonEntry {
  athleteId: string;
  athleteName: string;
  team: string | null;
  category: string | null;
  /** Melhor PV corrigido em cada avaliação (mesma ordem de `groups`) */
  values: (number | null)[];
  /** Diferença entre a última e a primeira avaliação com resultado */
  evolution: number | null;
  evolutionPct: number | null;
}

export interface LevelSection {
  level: number;
  ranking: RankingEntry[];
  comparison: ComparisonEntry[];
}

export interface MergedReport {
  groups: ReportGroup[];
  batteries: ReportBattery[];
  rows: ReportRow[];
  sections: LevelSection[];
  stats: {
    athletes: number;
    batteries: number;
    bestPV: number;
    avgPV: number;
    worstPV: number;
  };
  mixedLevels: boolean;
  period: { start: string; end: string } | null;
}

export interface ReportFilters {
  team?: string | null;
  category?: string | null;
}

const pad = (n: number) => n.toString().padStart(2, '0');

class MergeServiceClass {
  // ====================================================================
  // Normalização (linhas do Supabase → ReportTest)
  // ====================================================================

  /**
   * `tests.date` é timestamptz em produção, mas registros antigos/locais podem
   * vir só com a data. Converte para o dia e hora LOCAIS — usar o prefixo da
   * string ISO jogaria uma bateria das 21h30 (BRT) para o dia seguinte (UTC).
   */
  localDayAndTime(date: string): { day: string; time: string | null } {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return { day: date, time: null };
    const d = new Date(date);
    if (isNaN(d.getTime())) return { day: date.slice(0, 10), time: null };
    return {
      day: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }

  /** Converte o retorno de `SupabaseService.getTestsForReport` */
  fromSupabase(test: any): ReportTest {
    const { day, time } = this.localDayAndTime(test.date || test.created_at);
    const results: ReportResult[] = (test.test_results || []).map((r: any) => {
      const athlete = Array.isArray(r.athletes) ? r.athletes[0] : r.athletes;
      const stages = Number(r.completed_stages) || 0;
      const reps = Number(r.completed_reps_in_last_stage) || 0;
      // Testes antigos têm pv_bruto/pv_corrigido = 0 (default da migration) e o valor em peak_velocity
      const legacyPV = Number(r.peak_velocity) || 0;
      return {
        testId: test.id,
        athleteId: r.athlete_id,
        athleteName: r.athlete_name,
        team: athlete?.team || null,
        birthDate: athlete?.birth_date || null,
        category: athlete?.birth_date ? calculateCategory(athlete.birth_date) : null,
        position: athlete?.position || null,
        pvCorrigido: Number(r.pv_corrigido) || legacyPV,
        pvBruto: Number(r.pv_bruto) || legacyPV,
        fcFinal: r.fc_final ?? r.heart_rate ?? null,
        fcEstimada: r.fc_estimada ?? null,
        completedStages: stages,
        completedRepsInLastStage: reps,
        totalReps: Number(r.total_reps) || stages * 5 + reps,
        finalDistance: Number(r.final_distance) || 0,
        eliminatedByFailure: !!r.eliminated_by_failure,
      };
    });

    return {
      id: test.id,
      day,
      time,
      sortKey: test.date || test.created_at || '',
      protocolLevel: Number(test.protocol_level) || 1,
      totalTime: Number(test.total_time) || 0,
      temperature: test.temperature != null ? Number(test.temperature) : null,
      notes: test.notes || null,
      results,
    };
  }

  /** Converte um teste recém-executado (tela de Resultados, ainda em memória) */
  fromAthleteResults(
    test: { id: string; date: string; protocolLevel: number; totalTime: number; temperature: number | null },
    results: AthleteResult[],
    athletes: Athlete[]
  ): ReportTest {
    const { day, time } = this.localDayAndTime(test.date);
    return {
      id: test.id,
      day,
      time,
      sortKey: test.date,
      protocolLevel: test.protocolLevel,
      totalTime: test.totalTime,
      temperature: test.temperature,
      notes: null,
      results: results.map(ar => {
        const athlete = athletes.find(a => a.id === ar.athleteId);
        const birthDate = athlete?.birthDate || athlete?.birth_date || null;
        return {
          testId: test.id,
          athleteId: ar.athleteId,
          athleteName: ar.athleteName,
          team: athlete?.team || null,
          birthDate,
          category: birthDate ? calculateCategory(birthDate) : null,
          position: athlete?.position || null,
          pvCorrigido: ar.pvCorrigido,
          pvBruto: ar.pvBruto,
          fcFinal: ar.fcFinal ?? null,
          fcEstimada: ar.fcEstimada ?? null,
          completedStages: ar.completedStages,
          completedRepsInLastStage: ar.completedRepsInLastStage,
          totalReps: ar.totalReps,
          finalDistance: ar.finalDistance,
          eliminatedByFailure: ar.eliminatedByFailure,
        };
      }),
    };
  }

  // ====================================================================
  // Agrupamento e filtros
  // ====================================================================

  /** Uma avaliação por dia — usado na unificação a partir do Histórico */
  groupByDay(tests: ReportTest[], formatDay: (day: string) => string): ReportGroupInput[] {
    const byDay = new Map<string, string[]>();
    for (const test of tests) {
      if (!byDay.has(test.day)) byDay.set(test.day, []);
      byDay.get(test.day)!.push(test.id);
    }
    return Array.from(byDay.entries()).map(([day, testIds]) => ({
      key: day,
      label: formatDay(day),
      testIds,
    }));
  }

  /** Valores distintos de equipe e categoria, para montar os filtros */
  filterOptions(tests: ReportTest[]): { teams: string[]; categories: string[] } {
    const teams = new Set<string>();
    const categories = new Set<string>();
    for (const test of tests) {
      for (const r of test.results) {
        if (r.team) teams.add(r.team);
        if (r.category) categories.add(r.category);
      }
    }
    return {
      teams: Array.from(teams).sort((a, b) => a.localeCompare(b)),
      categories: Array.from(categories).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    };
  }

  applyFilters(tests: ReportTest[], filters: ReportFilters): ReportTest[] {
    if (!filters.team && !filters.category) return tests;
    return tests
      .map(test => ({
        ...test,
        results: test.results.filter(r =>
          (!filters.team || r.team === filters.team) &&
          (!filters.category || r.category === filters.category)
        ),
      }))
      .filter(test => test.results.length > 0);
  }

  // ====================================================================
  // Unificação
  // ====================================================================

  merge(tests: ReportTest[], groupInputs: ReportGroupInput[]): MergedReport {
    const testById = new Map(tests.map(t => [t.id, t]));

    // Monta os grupos (um teste pertence só ao primeiro grupo que o cita)
    const assigned = new Set<string>();
    const groupsWithTests = groupInputs
      .map(g => {
        const groupTests = g.testIds
          .filter(id => testById.has(id) && !assigned.has(id))
          .map(id => testById.get(id)!)
          .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        groupTests.forEach(t => assigned.add(t.id));
        return { input: g, tests: groupTests };
      })
      .filter(g => g.tests.length > 0)
      .sort((a, b) => a.tests[0].sortKey.localeCompare(b.tests[0].sortKey));

    const groups: ReportGroup[] = [];
    const batteries: ReportBattery[] = [];
    const rows: ReportRow[] = [];

    groupsWithTests.forEach(({ input, tests: groupTests }, groupIndex) => {
      const athleteIds = new Set<string>();
      groupTests.forEach((test, i) => {
        batteries.push({
          testId: test.id,
          groupKey: input.key,
          number: i + 1,
          day: test.day,
          time: test.time,
          protocolLevel: test.protocolLevel,
          totalTime: test.totalTime,
          temperature: test.temperature,
          notes: test.notes,
          athleteCount: test.results.length,
        });
        for (const r of test.results) {
          athleteIds.add(r.athleteId);
          rows.push({
            ...r,
            groupKey: input.key,
            groupIndex,
            day: test.day,
            time: test.time,
            batteryNumber: i + 1,
            protocolLevel: test.protocolLevel,
          });
        }
      });
      groups.push({
        key: input.key,
        label: input.label,
        day: groupTests[0].day,
        batteryCount: groupTests.length,
        athleteCount: athleteIds.size,
      });
    });

    const levels = Array.from(new Set(rows.map(r => r.protocolLevel))).sort();
    const sections = levels.map(level =>
      this.buildSection(level, rows.filter(r => r.protocolLevel === level), groups.length)
    );

    const rankingPVs = sections.flatMap(s => s.ranking.map(e => e.row.pvCorrigido));
    const days = groups.map(g => g.day).concat(batteries.map(b => b.day)).sort();

    return {
      groups,
      batteries,
      rows,
      sections,
      stats: {
        athletes: new Set(rows.map(r => r.athleteId)).size,
        batteries: batteries.length,
        bestPV: rankingPVs.length ? Math.max(...rankingPVs) : 0,
        avgPV: rankingPVs.length ? rankingPVs.reduce((a, b) => a + b, 0) / rankingPVs.length : 0,
        worstPV: rankingPVs.length ? Math.min(...rankingPVs) : 0,
      },
      mixedLevels: levels.length > 1,
      period: days.length ? { start: days[0], end: days[days.length - 1] } : null,
    };
  }

  private buildSection(level: number, rows: ReportRow[], groupCount: number): LevelSection {
    // Linhas por atleta
    const byAthlete = new Map<string, ReportRow[]>();
    for (const r of rows) {
      if (!byAthlete.has(r.athleteId)) byAthlete.set(r.athleteId, []);
      byAthlete.get(r.athleteId)!.push(r);
    }

    // Ranking: melhor PV do atleta na avaliação mais recente em que ele aparece
    const ranking: RankingEntry[] = Array.from(byAthlete.values())
      .map(athleteRows => {
        const lastGroup = Math.max(...athleteRows.map(r => r.groupIndex));
        const inLastGroup = athleteRows.filter(r => r.groupIndex === lastGroup);
        const best = inLastGroup.reduce((a, b) => (b.pvCorrigido > a.pvCorrigido ? b : a));
        return { position: 0, row: best, repeated: inLastGroup.length > 1 };
      })
      .sort((a, b) => b.row.pvCorrigido - a.row.pvCorrigido || a.row.athleteName.localeCompare(b.row.athleteName))
      .map((entry, i) => ({ ...entry, position: i + 1 }));

    // Comparativo: só faz sentido com mais de uma avaliação
    const comparison: ComparisonEntry[] = groupCount < 2 ? [] : ranking.map(({ row }) => {
      const athleteRows = byAthlete.get(row.athleteId)!;
      const values: (number | null)[] = Array.from({ length: groupCount }, (_, gi) => {
        const inGroup = athleteRows.filter(r => r.groupIndex === gi);
        return inGroup.length ? Math.max(...inGroup.map(r => r.pvCorrigido)) : null;
      });
      const present = values.filter((v): v is number => v != null);
      const evolution = present.length >= 2 ? present[present.length - 1] - present[0] : null;
      return {
        athleteId: row.athleteId,
        athleteName: row.athleteName,
        team: row.team,
        category: row.category,
        values,
        evolution,
        evolutionPct: evolution != null && present[0] > 0 ? (evolution / present[0]) * 100 : null,
      };
    }).sort((a, b) => a.athleteName.localeCompare(b.athleteName));

    return { level, ranking, comparison };
  }
}

export const MergeService = new MergeServiceClass();
