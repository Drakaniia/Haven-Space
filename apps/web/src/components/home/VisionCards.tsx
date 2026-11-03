const CARDS = [
  {
    icon: '/assets/images/icons/seamless_discovery.png',
    title: 'Seamless Discovery',
    description:
      'Finding your perfect boarding house made effortless with our smart search and verified listings, where technology anticipates your every need.',
    gradient: 'from-[rgba(255,200,100,0.3)]',
    underlined: true,
  },
  {
    icon: '/assets/images/icons/trusted_connection.png',
    title: 'Trusted Connections',
    description:
      'Building confidence through verified landlords, secure payments, and transparent communication between boarders and property owners.',
    gradient: 'from-[rgba(78,237,80,0.25)]',
    underlined: false,
  },
  {
    icon: '/assets/images/icons/community_first.png',
    title: 'Community First',
    description:
      'Bridging the gap between traditional property rentals and modern digital convenience, creating lasting community relationships.',
    gradient: 'from-[rgba(100,180,255,0.3)]',
    underlined: false,
  },
];

export function VisionCards() {
  return (
    <section className="relative bg-surface">
      {/* Dashed top fade grid background */}
      <div className="vision-grid-background" aria-hidden="true" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 py-20">
        <div className="flex max-w-4xl flex-col items-center gap-4 text-center">
          <span className="rounded-full bg-mint px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary">
            Vision
          </span>
          <h2 className="text-[2.5rem] font-extrabold leading-tight text-ink">Our Vision</h2>
          <p className="max-w-3xl text-[1.1rem] leading-relaxed text-gray-ink">
            Redefining the boarding house experience with modern technology and community-focused
            solutions.
          </p>
        </div>

        <div className="grid w-full gap-6 rounded-3xl border border-border bg-surface p-6 md:grid-cols-3">
          {CARDS.map(card => (
            <div
              key={card.title}
              className="relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-surface p-10"
            >
              <h3 className="flex flex-col items-start gap-2 text-2xl font-bold text-ink">
                <img src={card.icon} alt="" className="h-[67px] w-[67px] object-contain" />
                <span
                  className={
                    card.underlined ? 'underline decoration-primary underline-offset-4' : undefined
                  }
                >
                  {card.title}
                </span>
              </h3>
              <p
                className={`mt-4 text-[0.95rem] leading-relaxed text-gray-ink ${
                  card.underlined ? 'underline decoration-gray-ink underline-offset-4' : ''
                }`}
              >
                {card.description}
              </p>
              {/* Gradient overlay */}
              <div
                className={`pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t to-transparent ${card.gradient}`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
