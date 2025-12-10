-- Enable RLS on access_grants if not already
ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything on access_grants
CREATE POLICY "Admins can manage all access grants"
ON access_grants
FOR ALL
USING (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- Policy: Users can view their own grants
CREATE POLICY "Users can view own access grants"
ON access_grants
FOR SELECT
USING (
  auth.uid() = user_id
);

-- REPEAT for other tables might be needed (logs, notes), but let's fix grants first.
