-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Creates the private "strips" bucket: JPEGs only, 2 MB at most. Nobody can read a file straight from
-- Supabase; the site hands out short-lived signed links, and only for strips it's willing to show
-- (SHOWN_FROM in lib/strip-id.ts). Re-running this on an existing public bucket makes it private.
-- No insert policy is needed (or wanted): the kiosk uploads with one-time signed URLs that the
-- server signs with the secret key, so the public can't upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('strips', 'strips', false, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
