-- Outside the Data API (api.schemas = public) and no grants to app roles: trigger functions and
-- their helpers live here so they aren't callable as RPCs.
CREATE SCHEMA "internal";
