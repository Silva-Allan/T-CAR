-- Create sport enum for athletes
CREATE TYPE public.sport_type AS ENUM ('athletics', 'cycling', 'other');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Create athletes table
CREATE TABLE public.athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE,
  sport sport_type DEFAULT 'athletics',
  team TEXT,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on athletes
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

-- Athletes policies
CREATE POLICY "Users can view their own athletes" 
ON public.athletes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own athletes" 
ON public.athletes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own athletes" 
ON public.athletes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own athletes" 
ON public.athletes FOR DELETE 
USING (auth.uid() = user_id);

-- Create tests table (stores test sessions with multiple athletes)
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_level INTEGER NOT NULL CHECK (protocol_level IN (1, 2)),
  total_time INTEGER NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tests
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- Tests policies
CREATE POLICY "Users can view their own tests" 
ON public.tests FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tests" 
ON public.tests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tests" 
ON public.tests FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tests" 
ON public.tests FOR DELETE 
USING (auth.uid() = user_id);

-- Create test_results table (individual athlete results within a test)
CREATE TABLE public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  athlete_name TEXT NOT NULL,
  completed_stages INTEGER NOT NULL,
  completed_reps_in_last_stage INTEGER NOT NULL,
  is_last_stage_complete BOOLEAN NOT NULL DEFAULT false,
  peak_velocity NUMERIC(5,2) NOT NULL,
  final_distance INTEGER NOT NULL,
  heart_rate INTEGER,
  eliminated_by_failure BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on test_results
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Test results policies (through tests table ownership)
CREATE POLICY "Users can view their own test results" 
ON public.test_results FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tests 
    WHERE tests.id = test_results.test_id 
    AND tests.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own test results" 
ON public.test_results FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tests 
    WHERE tests.id = test_results.test_id 
    AND tests.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own test results" 
ON public.test_results FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.tests 
    WHERE tests.id = test_results.test_id 
    AND tests.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own test results" 
ON public.test_results FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.tests 
    WHERE tests.id = test_results.test_id 
    AND tests.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at
BEFORE UPDATE ON public.athletes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Create trigger for auto profile creation on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_athletes_user_id ON public.athletes(user_id);
CREATE INDEX idx_tests_user_id ON public.tests(user_id);
CREATE INDEX idx_tests_date ON public.tests(date DESC);
CREATE INDEX idx_test_results_test_id ON public.test_results(test_id);
CREATE INDEX idx_test_results_athlete_id ON public.test_results(athlete_id);