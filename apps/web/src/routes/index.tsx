import { createFileRoute } from '@tanstack/react-router';
import { FAQSection } from '../components/home/FAQSection';
import { LogoCloud } from '../components/home/LogoCloud';
import { VisionCards } from '../components/home/VisionCards';
import { PublicLayout } from '../components/layout/PublicLayout';
import { Hero } from '../components/rooms/Hero';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <PublicLayout>
      <Hero />

      {/* App preview image overlapping the hero */}
      <section className="pointer-events-none relative z-10 mx-auto -mt-16 max-w-[1500px] px-6">
        <img
          src="/assets/images/public/main.png"
          alt="Haven Space app dashboard preview"
          className="mx-auto block w-full"
        />
      </section>

      <LogoCloud />

      {/* What is Haven Space */}
      <section className="bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            What is Haven Space
          </span>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-gray-ink">
            <strong className="font-semibold text-ink">
              Haven Space is a next-gen boarding house platform
            </strong>{' '}
            bridging traditional property rentals with modern digital convenience. We provide a
            seamless, verified experience for boarders by integrating smart search, secure payments,
            and trusted landlord connections.
          </p>
          <img
            src="/assets/images/public/find_illustratin.png"
            alt="Students finding boarding houses in a neighborhood"
            className="mx-auto mt-10 w-full max-w-3xl rounded-xl"
          />
        </div>
      </section>

      <VisionCards />
      <FAQSection />
    </PublicLayout>
  );
}
