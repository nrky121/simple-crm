-- Full-text search setup using pg_trgm + tsvector GIN indexes

-- Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────────────────────
-- contacts search
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS contacts_search_idx
  ON public.contacts USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS contacts_email_trgm_idx
  ON public.contacts USING GIN (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS contacts_name_trgm_idx
  ON public.contacts USING GIN ((first_name || ' ' || COALESCE(last_name, '')) gin_trgm_ops);

-- Function to update contact search_vector
CREATE OR REPLACE FUNCTION public.update_contact_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contacts_search_update ON public.contacts;
CREATE TRIGGER contacts_search_update
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_contact_search_vector();

-- Back-fill existing rows
UPDATE public.contacts SET search_vector = (
  setweight(to_tsvector('english', COALESCE(first_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(last_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(title, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(notes, '')), 'D')
);

-- ─────────────────────────────────────────────────────────────────────────────
-- companies search
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS companies_search_idx
  ON public.companies USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS companies_name_trgm_idx
  ON public.companies USING GIN (name gin_trgm_ops);

-- Function to update company search_vector
CREATE OR REPLACE FUNCTION public.update_company_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.domain, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.industry, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_search_update ON public.companies;
CREATE TRIGGER companies_search_update
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_company_search_vector();

-- Back-fill existing rows
UPDATE public.companies SET search_vector = (
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(domain, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(industry, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(notes, '')), 'D')
);
