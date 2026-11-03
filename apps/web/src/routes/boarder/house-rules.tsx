import { createFileRoute } from '@tanstack/react-router';
import { RequireTenancy } from '../../components/boarder/FeatureGate';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { useBoarderNav } from '../../lib/use-boarder-nav';

export const Route = createFileRoute('/boarder/house-rules')({
  component: () => (
    <Protected role="boarder">
      <HouseRulesPage />
    </Protected>
  ),
});

const SECTIONS: { title: string; rules: { title: string; body: string }[] }[] = [
  {
    title: 'General Conduct',
    rules: [
      {
        title: 'Respect for Others',
        body: 'Treat all residents, staff, and visitors with respect and courtesy. Discrimination, harassment, or disruptive behavior will not be tolerated.',
      },
      {
        title: 'Cleanliness',
        body: 'Keep common areas clean and tidy. Dispose of trash properly and clean up after yourself in shared spaces including kitchen, bathroom, and lounge areas.',
      },
      {
        title: 'No Smoking Policy',
        body: 'Smoking is strictly prohibited inside the building. Designated smoking areas are located outside the main entrance. Violations may result in fines.',
      },
      {
        title: 'Illegal Activities',
        body: 'No illegal drugs, substances, or activities are permitted on the premises. Violation will result in immediate termination of tenancy and possible legal action.',
      },
    ],
  },
  {
    title: 'Quiet Hours',
    rules: [
      {
        title: 'Noise Levels',
        body: 'Keep noise to a minimum during quiet hours. This includes music, television, conversations, and other activities that may disturb other residents.',
      },
      {
        title: 'Study Areas',
        body: 'The study room on the 2nd floor is available 24/7. Please maintain silence in this area at all times to respect those who are studying.',
      },
    ],
  },
  {
    title: 'Visitors & Guests',
    rules: [
      {
        title: 'Visitor Registration',
        body: 'All visitors must register at the front desk upon arrival. Provide your name, purpose of visit, and the room number you are visiting.',
      },
      {
        title: 'Visiting Hours',
        body: 'Visitors are allowed from 8:00 AM to 9:00 PM daily. Overnight guests require prior approval from the landlord/management and must follow the guest pass request process.',
      },
      {
        title: 'Guest Responsibility',
        body: "You are responsible for your guests' behavior and adherence to house rules. Any violations by your guests may result in penalties to your account.",
      },
    ],
  },
  {
    title: 'Safety & Security',
    rules: [
      {
        title: 'ID Access Card',
        body: 'Always carry your ID access card. Do not lend your card to anyone. Report lost or stolen cards immediately to management. A replacement fee of ₱200 applies.',
      },
      {
        title: 'Door Security',
        body: 'Keep your room door locked at all times. Do not prop open exterior doors. Report any suspicious activity or unauthorized persons to management immediately.',
      },
      {
        title: 'Fire Safety',
        body: 'Familiarize yourself with fire exit routes and assembly points. Participate in mandatory fire drills. Do not block fire exits or tamper with fire safety equipment.',
      },
      {
        title: 'Prohibited Items',
        body: 'The following items are not allowed: firearms, explosives, flammable materials, and any items deemed dangerous by management.',
      },
    ],
  },
  {
    title: 'Utilities & Amenities',
    rules: [
      {
        title: 'Water & Electricity',
        body: 'Water and electricity are included in your rent. Please use responsibly. Excessive usage may be reviewed and charged accordingly. Report leaks or electrical issues promptly.',
      },
      {
        title: 'WiFi Usage',
        body: 'Free WiFi is provided for all residents. Do not share the password with non-residents. Streaming and downloading large files should be done during off-peak hours (10 PM - 7 AM).',
      },
      {
        title: 'Common Areas',
        body: 'Common areas including the lounge, kitchen, and laundry room are available from 6:00 AM to 10:00 PM. Clean up after use and report any damage or maintenance needs.',
      },
      {
        title: 'Laundry Facilities',
        body: 'Laundry machines are available on the ground floor. Use your own detergent. Do not leave clothes unattended for extended periods. Report machine malfunctions to management.',
      },
    ],
  },
];

function HouseRulesPage() {
  const nav = useBoarderNav();
  return (
    <RoleShell nav={nav}>
      <RequireTenancy>
        <div className="mb-6 flex items-center gap-3">
          <Icon name="book" size={28} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              House Rules &amp; Handbook
            </h1>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          {SECTIONS.map((section, sectionIndex) => (
            <Card key={section.title}>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint text-sm font-bold text-primary">
                  {sectionIndex + 1}
                </span>
                {section.title}
              </h2>
              <ul className="mt-3 flex flex-col gap-4">
                {section.rules.map((rule, ruleIndex) => (
                  <li key={rule.title} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 text-sm font-semibold text-primary">
                      {sectionIndex + 1}.{ruleIndex + 1}
                    </span>
                    <div>
                      <h3 className="font-medium">{rule.title}</h3>
                      <p className="mt-0.5 text-sm text-gray-ink">{rule.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}

          <Card className="border-l-4 border-primary">
            <h2 className="text-lg font-semibold">Acknowledgment</h2>
            <p className="mt-2 text-sm text-gray-ink">
              By continuing to reside at the property you agree to follow these house rules. Please
              direct any questions or concerns to your landlord or property management.
            </p>
          </Card>
        </div>
      </RequireTenancy>
    </RoleShell>
  );
}
