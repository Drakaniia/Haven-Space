import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSavedStatus, saveListing, unsaveListing } from '../../lib/api/boarder';
import { useAuth } from '../../lib/auth-context';

export function SaveButton({ propertyId }: { propertyId: number }) {
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

  return (
    <button
      type="button"
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending || saved.isLoading}
      className={`rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60 ${
        isSaved
          ? 'border-primary bg-primary-strong text-white'
          : 'border-border-strong bg-surface text-gray-ink hover:bg-subtle'
      }`}
    >
      {isSaved ? 'Saved ✓' : 'Save listing'}
    </button>
  );
}
