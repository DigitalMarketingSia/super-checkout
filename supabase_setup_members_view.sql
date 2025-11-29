-- Function to get members of a specific member area
-- Returns user details by joining access_grants, contents, and auth.users
create or replace function get_member_area_members(area_id uuid)
returns table (
  user_id uuid,
  email text,
  name text,
  joined_at timestamptz,
  status text
)
security definer
as $$
begin
  return query
  select distinct
    u.id as user_id,
    u.email::text,
    coalesce((u.raw_user_meta_data->>'name')::text, 'Sem nome') as name,
    min(ag.granted_at) as joined_at,
    ag.status::text
  from access_grants ag
  join auth.users u on ag.user_id = u.id
  join contents c on ag.content_id = c.id
  where c.member_area_id = area_id
  group by u.id, u.email, u.raw_user_meta_data, ag.status;
end;
$$ language plpgsql;
