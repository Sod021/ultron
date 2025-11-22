-- Create websites table
CREATE TABLE public.websites (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create daily_checks table
CREATE TABLE public.daily_checks (
  id BIGSERIAL PRIMARY KEY,
  website_id BIGINT NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  website_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  is_live BOOLEAN NOT NULL DEFAULT true,
  is_functional BOOLEAN NOT NULL DEFAULT true,
  has_problem BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (but allow all operations since no auth required)
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checks ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations without authentication
CREATE POLICY "Allow all operations on websites" 
  ON public.websites 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations on daily_checks" 
  ON public.daily_checks 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_daily_checks_website_id ON public.daily_checks(website_id);
CREATE INDEX idx_daily_checks_created_at ON public.daily_checks(created_at);
CREATE INDEX idx_websites_created_at ON public.websites(created_at);