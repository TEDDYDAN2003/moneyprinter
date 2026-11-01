-- ============================================================================
-- Migration: 20261101000006_liquidity_sweep_reference_scope.sql
-- Purpose:
--   Extend public.pullback_checklist_images market & step_id constraints so
--   Liquidity Sweep Strategy checklist steps ('liq_bullish', 'liq_bearish')
--   can also store <= 10 MB reference images.
-- ============================================================================

alter table public.pullback_checklist_images
  drop constraint if exists pullback_checklist_images_market_check;

alter table public.pullback_checklist_images
  add constraint pullback_checklist_images_market_check
  check (
    market in (
      'bullish',
      'bearish',
      'catching',
      'vp_setup',
      'vp_poc',
      'vp_reversal',
      'vp_breakout',
      'liq_bullish',
      'liq_bearish'
    )
  );

alter table public.pullback_checklist_images
  drop constraint if exists pullback_checklist_images_step_id_check;

alter table public.pullback_checklist_images
  add constraint pullback_checklist_images_step_id_check
  check (
    step_id ~ '^(bull|bear|catch|vp|liq)-(setup-|poc-|var-|bo-|flow-|bull-|bear-)?[1-9][0-9]*$'
  );
