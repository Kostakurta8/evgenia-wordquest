-- Strike counter for the Преговор/Трудни routing (lib/strikes.ts).
-- Until this runs, `misses` is local-first (zustand-persisted on the device);
-- a cloud pull will not wipe it (see sync.ts fromRow + store mergeCloud).
--
-- To enable cross-device sync of strikes:
--   1. Run this in the Supabase SQL editor (project sfnrbogmmhloctlipwcr).
--   2. Regenerate src/lib/supabase/database.types.ts (Supabase MCP generate types).
--   3. Add `misses: p.misses` to toRow() in src/lib/sync.ts.

alter table public.progress
  add column if not exists misses integer not null default 0;
