import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface RestrictionModalProps {
  open: boolean;
  onClose: () => void;
  onCompleteProfile?: () => void;
  title?: string;
  description?: string;
}

export function RestrictionModal({
  open,
  onClose,
  onCompleteProfile,
  title = 'Action Restricted',
  description = 'You must complete your profile before you can perform this action.',
}: RestrictionModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="mt-2">
        <p className="text-sm text-gray-600 mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onCompleteProfile}>
            Complete Profile
          </Button>
        </div>
      </div>
    </Modal>
  );
}
