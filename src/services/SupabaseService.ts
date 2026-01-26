import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Athlete = Database['public']['Tables']['athletes']['Row'];
type AthleteInsert = Database['public']['Tables']['athletes']['Insert'];
type Test = Database['public']['Tables']['tests']['Row'];
type TestInsert = Database['public']['Tables']['tests']['Insert'];
type TestResult = Database['public']['Tables']['test_results']['Row'];
type TestResultInsert = Database['public']['Tables']['test_results']['Insert'];

class SupabaseServiceClass {
  // Athletes
  async getAthletes(): Promise<Athlete[]> {
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  async getAthlete(id: string): Promise<Athlete | null> {
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  async createAthlete(athlete: Omit<AthleteInsert, 'id' | 'user_id'>): Promise<Athlete> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('athletes')
      .insert({ ...athlete, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateAthlete(id: string, updates: Partial<AthleteInsert>): Promise<Athlete> {
    const { data, error } = await supabase
      .from('athletes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteAthlete(id: string): Promise<void> {
    const { error } = await supabase
      .from('athletes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Tests
  async getTests(): Promise<(Test & { test_results: TestResult[] })[]> {
    const { data, error } = await supabase
      .from('tests')
      .select(`
        *,
        test_results (*)
      `)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getTest(id: string): Promise<(Test & { test_results: TestResult[] }) | null> {
    const { data, error } = await supabase
      .from('tests')
      .select(`
        *,
        test_results (*)
      `)
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  async createTest(
    test: Omit<TestInsert, 'id' | 'user_id'>,
    results: Omit<TestResultInsert, 'id' | 'test_id'>[]
  ): Promise<Test> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create test
    const { data: testData, error: testError } = await supabase
      .from('tests')
      .insert({ ...test, user_id: user.id })
      .select()
      .single();
    
    if (testError) throw testError;

    // Create test results
    const testResults = results.map(r => ({
      ...r,
      test_id: testData.id
    }));

    const { error: resultsError } = await supabase
      .from('test_results')
      .insert(testResults);
    
    if (resultsError) throw resultsError;

    return testData;
  }

  async updateTestResult(id: string, updates: Partial<TestResultInsert>): Promise<TestResult> {
    const { data, error } = await supabase
      .from('test_results')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteTest(id: string): Promise<void> {
    const { error } = await supabase
      .from('tests')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Get athlete test history
  async getAthleteTests(athleteId: string): Promise<TestResult[]> {
    const { data, error } = await supabase
      .from('test_results')
      .select(`
        *,
        tests!inner (date, protocol_level)
      `)
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
}

export const SupabaseService = new SupabaseServiceClass();
