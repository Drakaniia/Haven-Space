import { createFileRoute } from '@tanstack/react-router';
import { AfterMoveIn } from '../components/home/AfterMoveIn';
import { FAQSection } from '../components/home/FAQSection';
import { HowItWorks } from '../components/home/HowItWorks';
import { LandlordInvite } from '../components/home/LandlordInvite';
import { PublicLayout } from '../components/layout/PublicLayout';
import { Hero } from '../components/rooms/Hero';

export const Route = createFileRoute('/')({
  component: HomePage,
});

/**
 * Home: hero (search + map) → the real renting flow → what happens after move-in (the boarder
 * dashboard) → a pointer for landlords → plain answers.
 */
function HomePage() {
  return (
    <PublicLayout>
      <Hero />
      <HowItWorks />
      <AfterMoveIn />
      <LandlordInvite />
      <FAQSection />
    </PublicLayout>
  );
}
