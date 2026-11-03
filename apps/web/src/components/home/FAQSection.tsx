import { Icon } from '../ui/Icon';

/**
 * Plain answers to the questions people actually ask before signing up. Every answer describes what
 * the app does today (verification documents, payment logging, the Haven AI limits), not a promise.
 */
const FAQS = [
  {
    question: 'How do I find a boarding house near me?',
    answer:
      'Open Find a room and search by area, school or property name, then narrow it down by price and room type. The map shows the same listings by location. Browsing does not need an account.',
  },
  {
    question: 'How are landlords checked?',
    answer:
      'Before a landlord can publish or change a listing, they upload a government-issued ID, proof that they own the property, a business permit and a selfie holding their ID. An admin reviews those documents and approves the account by hand.',
  },
  {
    question: 'Can I see the room before I apply?',
    answer:
      'Yes. Request a tour from the listing and the landlord will confirm a time. We recommend visiting in person before you send an application.',
  },
  {
    question: 'Does Haven Space take my rent money?',
    answer:
      'No. You pay your landlord directly by GCash, bank transfer or cash, the same way you would without us. Haven keeps the record: you log the payment with its reference, and your landlord confirms it.',
  },
  {
    question: 'What is Haven AI, and is it free?',
    answer:
      'Haven AI is an assistant that answers questions about listings and how the app works. Visitors can ask one question without an account; signed-in boarders get ten a day. It can make mistakes, so check anything important with the landlord.',
  },
  {
    question: 'What if something goes wrong with my landlord?',
    answer:
      'Start with a message in the app so there is a written record. If you cannot sort it out together, Haven admins can step in on listing, application and payment disputes.',
  },
];

export function FAQSection() {
  return (
    <section aria-labelledby="faq-title" className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16 lg:px-8 lg:py-28">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="kicker">Questions</p>
          <h2 id="faq-title" className="display-lg mt-3 text-ink">
            Before you sign up
          </h2>
          <p className="mt-5 max-w-sm leading-relaxed text-gray-ink">
            Something we have not covered? Write to us and a real person will reply.
          </p>
          <a
            href="mailto:support@havenspace.app"
            className="mt-4 inline-flex text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
          >
            support@havenspace.app
          </a>
        </div>

        <div className="border-t border-border">
          {FAQS.map((faq, index) => (
            <details
              key={faq.question}
              open={index === 0}
              className="group border-b border-border"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 rounded-lg py-5 text-left [&::-webkit-details-marker]:hidden">
                <span className="font-display text-lg font-medium leading-snug tracking-[-0.01em] text-ink sm:text-xl">
                  {faq.question}
                </span>
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-strong text-gray-ink transition-[transform,color,border-color] duration-200 ease-out group-open:rotate-45 group-open:border-primary group-open:text-primary motion-reduce:transition-none">
                  <Icon name="plus" size={14} />
                </span>
              </summary>
              <p className="max-w-2xl pb-6 pr-12 leading-relaxed text-gray-ink">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
