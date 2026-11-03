import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * The in-shell listing detail was a duplicate of the public `/rooms/$id` page
 * (spec `boarder-find-a-room-redirect`). Only the apply/tour routes below this
 * layout still render inside the boarder shell; a direct visit to the detail
 * itself redirects to the public page before the shell renders.
 */
export const Route = createFileRoute('/boarder/find-a-room/$id/')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/rooms/$id', params: { id: params.id }, replace: true });
  },
});
