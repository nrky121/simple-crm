-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function: is the current user an admin?
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = TRUE
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can read all active profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = TRUE);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "System can insert profiles via trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- tags
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Authenticated users can read tags"
  ON public.tags FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can create tags"
  ON public.tags FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update tags"
  ON public.tags FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete tags"
  ON public.tags FOR DELETE
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- companies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Authenticated users can read non-archived companies"
  ON public.companies FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owner or admin can update company"
  ON public.companies FOR UPDATE
  USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Owner or admin can delete (archive) company"
  ON public.companies FOR DELETE
  USING (owner_id = auth.uid() OR public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- company_tags
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Authenticated users can read company tags"
  ON public.company_tags FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can add company tags"
  ON public.company_tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can remove company tags"
  ON public.company_tags FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- contacts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Authenticated users can read contacts"
  ON public.contacts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owner or admin can update contact"
  ON public.contacts FOR UPDATE
  USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Owner or admin can delete (archive) contact"
  ON public.contacts FOR DELETE
  USING (owner_id = auth.uid() OR public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- contact_tags
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Authenticated users can read contact tags"
  ON public.contact_tags FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can add contact tags"
  ON public.contact_tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can remove contact tags"
  ON public.contact_tags FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- deals
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Authenticated users can read deals"
  ON public.deals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create deals"
  ON public.deals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owner or admin can update deal"
  ON public.deals FOR UPDATE
  USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Owner or admin can delete (archive) deal"
  ON public.deals FOR DELETE
  USING (owner_id = auth.uid() OR public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- deal_contacts, deal_stage_history
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Authenticated users can read deal contacts"
  ON public.deal_contacts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage deal contacts"
  ON public.deal_contacts FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read deal stage history"
  ON public.deal_stage_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert deal stage history"
  ON public.deal_stage_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- activities
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Authenticated users can read activities"
  ON public.activities FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create activities"
  ON public.activities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creator or admin can update activity"
  ON public.activities FOR UPDATE
  USING (created_by_id = auth.uid() OR public.is_admin());

CREATE POLICY "Creator or admin can delete activity"
  ON public.activities FOR DELETE
  USING (created_by_id = auth.uid() OR public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- tasks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Authenticated users can read tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Assignee or admin can update task"
  ON public.tasks FOR UPDATE
  USING (assignee_id = auth.uid() OR public.is_admin());

CREATE POLICY "Assignee or admin can delete task"
  ON public.tasks FOR DELETE
  USING (assignee_id = auth.uid() OR public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_logs (read-only for everyone; written by service role only)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can read their own audit entries"
  ON public.audit_logs FOR SELECT
  USING (user_id = auth.uid());
