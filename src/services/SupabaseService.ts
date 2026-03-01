// ======================================================================
// T-CAR 2.0 — Supabase Service (Atualizado)
// ======================================================================
// CRUD para o schema T-CAR 2.0.
// Todas as operações respeitam RLS (user_id).
// ======================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type AthleteRow = Tables<'athletes'>;
type TestRow = Tables<'tests'>;
type TestResultRow = Tables<'test_results'>;
type ProfileRow = Tables<'profiles'>;

type AthleteInsert = TablesInsert<'athletes'>;
type TestInsert = TablesInsert<'tests'>;
type TestResultInsert = TablesInsert<'test_results'>;

class SupabaseServiceClass {
  // ====================================================================
  // PERFIL
  // ====================================================================

  async getProfile(): Promise<ProfileRow | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
    return data;
  }

  async updateProfile(updates: Partial<ProfileRow>): Promise<ProfileRow | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,          // required for conflict resolution
        email: user.email,    // keep email in sync
        ...updates,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
    return data;
  }

  // ====================================================================
  // ATLETAS
  // ====================================================================

  async getAthletes(): Promise<AthleteRow[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('Erro ao buscar atletas:', error);
      return [];
    }
    return data || [];
  }

  async getAthlete(id: string): Promise<AthleteRow | null> {
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar atleta:', error);
      return null;
    }
    return data;
  }

  async createAthlete(athlete: Omit<AthleteInsert, 'user_id'>): Promise<AthleteRow> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('athletes')
      .insert({ ...athlete, user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar atleta:', error);
      throw error;
    }
    return data!;
  }

  async updateAthlete(id: string, updates: Partial<AthleteRow>): Promise<AthleteRow> {
    const { data, error } = await supabase
      .from('athletes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar atleta:', error);
      throw error;
    }
    return data!;
  }

  async deleteAthlete(id: string): Promise<void> {
    const { error } = await supabase
      .from('athletes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar atleta:', error);
      throw error;
    }
  }

  // ====================================================================
  // TESTES
  // ====================================================================

  async createTest(
    testData: Omit<TestInsert, 'user_id'>,
    resultsData: Omit<TestResultInsert, 'test_id'>[]
  ): Promise<{ test: TestRow; results: TestResultRow[] }> {
    // Get user — detect network error vs real auth error
    let user: any;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        // Network-related errors (fetch failed, DNS error, timeout)
        const isNetworkError =
          error.message?.includes('fetch') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.status === 0;
        if (isNetworkError) {
          console.warn('[SupabaseService] Erro de rede ao autenticar — salvando offline:', error.message);
          throw new Error('NETWORK_ERROR');
        }
      }
      user = data?.user;
    } catch (err: any) {
      // fetch() itself threw — definitely a network error
      if (err.message === 'NETWORK_ERROR') throw err;
      if (err.message?.includes('fetch') || err.name === 'TypeError') {
        console.warn('[SupabaseService] Falha de rede (fetch exception) — salvando offline:', err.message);
        throw new Error('NETWORK_ERROR');
      }
      throw err;
    }

    if (!user) throw new Error('AUTH_ERROR');

    // 1. Criar teste
    // Remove fields that don't exist in the DB (e.g. 'synced' from old cached data)
    const { synced: _s, ...cleanTestData } = testData as any;
    const { data: test, error: testError } = await supabase
      .from('tests')
      .insert({ ...cleanTestData, user_id: user.id })
      .select()
      .single();

    if (testError || !test) {
      console.error('Erro ao criar teste:', testError);
      throw testError;
    }

    // 2. Criar resultados individuais
    // Sanitize: ensure required fields exist (handles old IndexedDB cached data)
    const resultsWithTestId = resultsData.map(r => {
      const result = { ...r } as any;
      result.test_id = test.id;
      // Ensure peak_velocity exists (NOT NULL in DB) — default to pv_bruto
      if (result.peak_velocity == null) {
        result.peak_velocity = result.pv_bruto ?? 0;
      }
      // Ensure heart_rate exists — default to fc_final (nullable, so ok if null)
      if (!('heart_rate' in result)) {
        result.heart_rate = result.fc_final ?? null;
      }
      // Remove any fields not in DB schema
      delete result.synced;
      return result;
    });

    const { data: results, error: resultsError } = await supabase
      .from('test_results')
      .insert(resultsWithTestId)
      .select();

    if (resultsError) {
      console.error('Erro ao criar resultados:', resultsError);
      // Rollback: deletar teste se resultados falharam
      await supabase.from('tests').delete().eq('id', test.id);
      throw resultsError;
    }

    return { test, results: results || [] };
  }

  async getTests(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('tests')
      .select('*, test_results(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar testes:', error);
      return [];
    }
    return data || [];
  }

  async getTestWithResults(testId: string): Promise<{
    test: TestRow;
    results: TestResultRow[];
  } | null> {
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError || !test) return null;

    const { data: results, error: resultsError } = await supabase
      .from('test_results')
      .select('*')
      .eq('test_id', testId);

    if (resultsError) return null;

    return { test, results: results || [] };
  }

  async deleteTest(testId: string): Promise<void> {
    const { error } = await supabase
      .from('tests')
      .delete()
      .eq('id', testId);

    if (error) {
      console.error('Erro ao deletar teste:', error);
      throw error;
    }
  }

  // ====================================================================
  // CONSULTAS ESPECIALIZADAS T-CAR
  // ====================================================================

  /**
   * Busca histórico de resultados de um atleta específico.
   */
  async getAthleteTestHistory(athleteId: string): Promise<(TestResultRow & { test: TestRow })[]> {
    const { data, error } = await supabase
      .from('test_results')
      .select('*, test:tests!inner(*)')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar histórico do atleta:', error);
      return [];
    }

    console.log('[SupabaseService] getAthleteTestHistory raw data:', JSON.stringify(data?.[0], null, 2));

    return (data || []).map((row: any) => {
      // Handle test relation being array or object
      const testRelation = Array.isArray(row.test) ? row.test[0] : row.test;
      return {
        ...row,
        test: testRelation,
      };
    });
  }

  /**
   * Ranking do grupo: média de PV corrigido por atleta.
   */
  async getGroupRanking(): Promise<{
    athleteId: string;
    athleteName: string;
    avgPV: number;
    lastPV: number;
    testCount: number;
  }[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    try {
      // Step 1: Get all test IDs belonging to this user
      const { data: userTests, error: testsError } = await supabase
        .from('tests')
        .select('id, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (testsError || !userTests || userTests.length === 0) {
        console.error('Error fetching user tests:', testsError);
        return [];
      }

      const testIds = userTests.map(t => t.id);

      // Step 2: Get all test_results for those tests
      const { data: results, error: resultsError } = await supabase
        .from('test_results')
        .select('athlete_id, athlete_name, pv_corrigido, test_id')
        .in('test_id', testIds);

      if (resultsError || !results) {
        console.error('Error fetching test results:', resultsError);
        return [];
      }

      // Build a map of test_id → date for ordering
      const testDateMap = new Map(userTests.map(t => [t.id, t.date]));

      // Sort results by test date descending (newest first)
      const sortedResults = [...results].sort((a, b) => {
        const dateA = testDateMap.get(a.test_id) || '';
        const dateB = testDateMap.get(b.test_id) || '';
        return dateB.localeCompare(dateA);
      });

      // Agrupa por atleta
      const athleteMap = new Map<string, {
        name: string;
        pvValues: number[];
        lastPV: number;
      }>();

      for (const r of sortedResults) {
        const pvValue = parseFloat(String(r.pv_corrigido)) || 0;
        const existing = athleteMap.get(r.athlete_id);
        if (existing) {
          existing.pvValues.push(pvValue);
        } else {
          athleteMap.set(r.athlete_id, {
            name: r.athlete_name,
            pvValues: [pvValue],
            lastPV: pvValue,
          });
        }
      }

      // Calcula ranking
      const ranking = Array.from(athleteMap.entries()).map(([athleteId, data]) => ({
        athleteId,
        athleteName: data.name,
        avgPV: data.pvValues.reduce((a, b) => a + b, 0) / data.pvValues.length,
        lastPV: data.lastPV,
        testCount: data.pvValues.length,
      }));

      return ranking.sort((a, b) => b.avgPV - a.avgPV);
    } catch (error) {
      console.error('Error computing group ranking:', error);
      return [];
    }
  }

  /**
   * Busca resultado mais recente de cada atleta (para classificação).
   */
  async getLatestResultPerAthlete(): Promise<TestResultRow[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: tests, error: testsError } = await supabase
      .from('tests')
      .select('id')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (testsError || !tests?.length) return [];

    const testIds = tests.map(t => t.id);

    const { data: results, error } = await supabase
      .from('test_results')
      .select('*')
      .in('test_id', testIds);

    if (error || !results) return [];

    // Mantém apenas o mais recente por atleta
    const latestByAthlete = new Map<string, TestResultRow>();
    for (const r of results) {
      if (!latestByAthlete.has(r.athlete_id)) {
        latestByAthlete.set(r.athlete_id, r);
      }
    }

    return Array.from(latestByAthlete.values());
  }

  /**
   * Exporta todos os dados do usuário para portabilidade (LGPD).
   */
  async exportAllUserData(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const profile = await this.getProfile();
    const athletes = await this.getAthletes();
    const tests = await this.getTests();

    return {
      export_date: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        profile
      },
      athletes,
      tests
    };
  }

  /**
   * Exclui todos os dados do usuário (Direito ao Esquecimento - LGPD).
   * Nota: Isso limpa as tabelas públicas. A conta auth.users permanece 
   * (embora vazia) pois deletar o user requer service_role.
   */
  async deleteAllUserData(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    // O cascade no schema deve cuidar disso, mas vamos garantir as tabelas principais
    await supabase.from('test_results').delete().filter('test_id', 'in',
      supabase.from('tests').select('id').eq('user_id', user.id)
    );
    await supabase.from('athletes').delete().eq('user_id', user.id);
    await supabase.from('tests').delete().eq('user_id', user.id);
    await supabase.from('profiles').delete().eq('id', user.id);
  }
}

export const SupabaseService = new SupabaseServiceClass();
