const TESTIMONIALS = [
  {
    image: '/assets/images/boarder_interview.jpg',
    avatar: '/assets/images/public/maria.jpg',
    quote:
      'Haven Space changed my university experience. I found not just a room, but a community. The verification system gave me peace of mind I never had with other platforms.',
    name: 'Maria Santos',
    role: 'Boarder since 2023',
  },
  {
    avatar: '/assets/images/public/carlos.jpg',
    quote:
      'As a landlord, Haven Space has been a game-changer. The quality of tenants is exceptional, and the platform handles all the messy parts of renting. My properties stay full year-round.',
    name: 'Carlos Mendoza',
    role: 'Landlord Partner',
  },
  {
    avatar: '/assets/images/public/jasmine.jpg',
    quote:
      'The AI matching found me the perfect boarding house - close to campus, within budget, and with roommates who share my interests. It felt like magic!',
    name: 'Jasmine Lee',
    role: 'Student Boarder',
  },
];

export function Testimonials() {
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-10 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Voices</span>
          <h2 className="mt-2 text-3xl font-bold text-ink">Real Stories, Real Impact</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-ink">
            Hear from the students and landlords whose lives we&apos;ve touched.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map(testimonial => (
            <div
              key={testimonial.name}
              className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-card"
            >
              {testimonial.image ? (
                <img
                  src={testimonial.image}
                  alt={`${testimonial.name} interview`}
                  className="mb-4 h-40 w-full rounded-lg object-cover"
                />
              ) : null}
              <p className="flex-1 text-sm leading-relaxed text-gray-ink">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-ink">{testimonial.name}</div>
                  <div className="text-sm text-gray-ink">{testimonial.role}</div>
                </div>
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
