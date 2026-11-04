-- Extend existing private reference storage scopes for MA crossover steps.
alter table public.pullback_checklist_images drop constraint if exists pullback_checklist_images_market_check;
alter table public.pullback_checklist_images add constraint pullback_checklist_images_market_check
  check (market in ('bullish','bearish','catching','vp_setup','vp_poc','vp_reversal','vp_breakout','liq_bullish','liq_bearish','ma_bullish','ma_bearish'));
alter table public.pullback_checklist_images drop constraint if exists pullback_checklist_images_step_id_check;
alter table public.pullback_checklist_images add constraint pullback_checklist_images_step_id_check
  check (step_id ~ '^(bull|bear|catch|vp|liq|ma)-(setup-|poc-|var-|bo-|flow-|bull-|bear-)?[1-9][0-9]*$');
