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
      className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-100 p-2 text-amber-600">
            <Icon name="flag" className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-900">
              Complete your profile
            </h3>
            <p className="text-sm text-amber-700">
              {isSkipped
                ? 'You skipped the onboarding process. Complete it to unlock all features.'
                : 'Your profile is incomplete. Please provide the missing information.'}
            </p>
          </div>
        </div>
        <Button onClick={onCompleteProfile} variant="primary" className="whitespace-nowrap bg-amber-600 hover:bg-amber-700">
          Complete Profile
        </Button>
      </div>
    </motion.div>
  );
}
