import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface RestrictionBannerProps {
  isSkipped?: boolean;
  isIncomplete?: boolean;
  onCompleteProfile?: () => void;
}

export function RestrictionBanner({
  isSkipped,
  isIncomplete,
  onCompleteProfile,
}: RestrictionBannerProps) {
  if (!isSkipped && !isIncomplete) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-2xl bg-warning-tint border border-warning-border p-4 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* A stronger tint than the banner it sits on — the same token twice would make the disc vanish. */}
          <div className="rounded-full bg-warning-border p-2 text-warning-ink">
            <Icon name="flag" className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-warning-ink">Complete your profile</h3>
            <p className="text-sm text-warning-ink">
              {isSkipped
                ? 'You skipped the onboarding process. Complete it to unlock all features.'
                : 'Your profile is incomplete. Please provide the missing information.'}
            </p>
          </div>
        </div>
        {/* The `warning` variant is the amber CTA these "finish setting up" prompts use
            (`VerificationNotice` does the same). The literal `bg-amber-600` this replaced lost to the
            `primary` variant's `bg-primary-strong`, which is emitted later — so this button was
            rendering brand green inside an amber banner. */}
        <Button onClick={onCompleteProfile} variant="warning" className="whitespace-nowrap">
          Complete Profile
        </Button>
      </div>
    </motion.div>
  );
}
