-- Roll back the optional risk management feature; journal entries are untouched.
drop table if exists public.journal_risk_settings;
