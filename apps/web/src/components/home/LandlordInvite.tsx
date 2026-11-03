import { Link } from '@tanstack/react-router';
import { buttonClasses } from '../ui/Button';

/** Editorial split that points landlords to their own page. Photo left, copy right. */
export function LandlordInvite() {
  return (
    <section aria-labelledby="landlord-invite-title" className="bg-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14 lg:px-8 lg:py-28">
        <div className="mx-auto w-full max-w-sm md:max-w-none">
          <img
            src="/assets/images/lanlod_portrait_with_interviewer.jpg"
            alt="A boarding-house landlord standing with a member of the Haven Space team outside her house"
            width={1536}
            height={2048}
            loading="lazy"
            className="aspect-[4/5] w-full rounded-2xl border border-border object-cover shadow-card"
          />
        </div>
        <div className="max-w-xl">
          <p className="kicker">Run a boarding house?</p>
          <h2 id="landlord-invite-title" className="display-lg mt-3 text-ink">
            Fewer notebooks, fewer missed messages.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-ink">
            List your rooms, schedule tours, review applications and confirm rent as it comes in.
            Your boarders see the same records you do, so there is less to argue about at the end
            of the month.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/for-landlords" className={buttonClasses({ variant: 'outline', size: 'lg' })}>
              How it works for landlords
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
