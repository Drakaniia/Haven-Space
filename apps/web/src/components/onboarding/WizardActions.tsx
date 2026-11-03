import { Button } from '../ui/Button';

/**
 * The wizard's action row: Back on the left, Skip + the primary action on the right, in the
 * same place on every step.
 *
 * On phones it is pinned to the bottom of the viewport (sticky, inside the step's card) so
 * Continue is always reachable without scrolling past a long form; from `sm` up it sits
 * statically under the fields. The negative margins let the bar run edge to edge of the card,
 * matching `WizardLayout`'s `px-5`.
 */
export function WizardActions({
  primaryLabel,
  savingLabel = 'Saving…',
  saving = false,
  onBack,
  onSkip,
  skipLabel = 'Skip for now',
}: {
  primaryLabel: string;
  savingLabel?: string;
  saving?: boolean;
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-8 flex items-center gap-2 rounded-b-2xl border-t border-border bg-surface/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:mx-0 sm:mt-10 sm:gap-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      {onBack ? (
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          Back
        </Button>
      ) : null}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {onSkip ? (
          <Button type="button" variant="ghost" onClick={onSkip} disabled={saving}>
            {skipLabel}
          </Button>
        ) : null}
        <Button type="submit" disabled={saving} aria-busy={saving}>
          {saving ? savingLabel : primaryLabel}
        </Button>
      </div>
    </div>
  );
}
