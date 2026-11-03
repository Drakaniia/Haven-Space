import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSavedStatus, saveListing, unsaveListing } from '../../lib/api/boarder';
import { useAuth } from '../../lib/auth-context';
import { buttonClasses } from '../ui/Button';
import { Icon } from '../ui/Icon';

/**
 * Save / unsave a listing for the signed-in boarder.
 *
 * `button` is the labelled control on the listing detail; `icon` is the compact
 * bookmark that sits on a browse card's photo (it lifts itself above the card's
 * stretched link). Both share the `['saved-status', id]` cache, so saving on a
 * card shows as saved on the detail page and vice versa.
 */
export function SaveButton({
  propertyId,
  variant = 'button',
  label,
}: {
  propertyId: number;
  variant?: 'button' | 'icon';
  /** Listing name, for the icon variant's accessible label. */
  label?: string;
}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const saved = useQuery({
    queryKey: ['saved-status', propertyId],
    queryFn: () => getSavedStatus(token!, propertyId),
    enabled: Boolean(token),
  });

  const toggle = useMutation({
    mutationFn: () =>
      saved.data?.is_saved ? unsaveListing(token!, propertyId) : saveListing(token!, propertyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-status', propertyId] });
      void queryClient.invalidateQueries({ queryKey: ['saved-listings'] });
    },
  });

  const isSaved = saved.data?.is_saved ?? false;
  const busy = toggle.isPending || saved.isLoading;

  if (variant === 'icon') {
    const name = label ? ` ${label}` : ' this listing';
    return (
      <button
        type="button"
        onClick={() => toggle.mutate()}
        disabled={busy}
        aria-pressed={isSaved}
        aria-label={isSaved ? `Remove${name} from saved` : `Save${name}`}
        title={isSaved ? 'Saved' : 'Save'}
        className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-xl shadow-card transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.94] disabled:opacity-60 ${
          isSaved
            ? 'bg-primary-strong text-white hover:bg-primary-hover'
            : 'bg-surface/95 text-ink hover:bg-surface'
        }`}
      >
        <Icon name="bookmark" size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle.mutate()}
      disabled={busy}
      aria-pressed={isSaved}
      className={buttonClasses({ variant: isSaved ? 'primary' : 'outline', size: 'sm' })}
    >
      <Icon name={isSaved ? 'check' : 'bookmark'} size={16} />
      {isSaved ? 'Saved' : 'Save listing'}
    </button>
  );
}
