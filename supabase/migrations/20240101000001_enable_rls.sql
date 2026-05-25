-- Enable Row Level Security on all application tables
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_tags   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs     ENABLE ROW LEVEL SECURITY;
