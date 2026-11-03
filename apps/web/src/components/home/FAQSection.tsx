import { useState } from 'react';

const FAQS = [
  {
    category: 'getting-started',
    question: 'How do I find boarding houses near me?',
    answer:
      'Simply use our interactive map or search feature to browse verified boarding houses in your preferred location. Filter by price, amenities, and availability to find your perfect match.',
  },
  {
    category: 'features',
    question: 'Are the landlords verified?',
    answer:
      'Yes! All landlords on Haven Space go through a verification process. We ensure they are legitimate property owners or authorized managers before they can list their properties on our platform.',
  },
  {
    category: 'billing',
    question: 'Is my payment information secure?',
    answer:
      'Absolutely. We use industry-standard encryption and secure payment processing to protect your financial information. Your payment data is never shared with third parties.',
  },
  {
    category: 'features',
    question: 'Can I schedule a viewing before booking?',
    answer:
      'Yes! You can request a viewing directly through the property listing. Many landlords offer virtual tours or in-person visits so you can see the space before committing.',
  },
  {
    category: 'support',
    question: 'What if I have issues with my boarding house?',
    answer:
      'Our platform includes a built-in messaging system and maintenance request feature. You can communicate directly with your landlord, and our support team is available to help resolve any disputes.',
  },
];

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'getting-started', label: 'Getting Started' },
  { key: 'features', label: 'Features' },
  { key: 'billing', label: 'Billing' },
  { key: 'support', label: 'Support' },
];

export function FAQSection() {
  const [tab, setTab] = useState('all');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const visible = tab === 'all' ? FAQS : FAQS.filter(faq => faq.category === tab);

  return (
    <section className="bg-subtle">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-left">
          <span className="mb-4 inline-block rounded-full bg-mint px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary">
            FAQ
          </span>
          <h2 className="mb-4 text-4xl font-extrabold text-ink">Frequently Asked Questions</h2>
          <p className="max-w-2xl text-lg leading-relaxed text-gray-ink">
            Everything you need to know about Haven Space, from finding rooms to secure payments and
            trusted landlords.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left — image + CTA */}
          <div className="lg:col-span-1 lg:sticky lg:top-8">
            <div className="overflow-hidden rounded-lg bg-surface">
              <img
                src="/assets/images/public/costumer_support.png"
                alt="Customer support representative"
                className="block w-full"
              />
              <div className="p-6">
                <p className="mb-4 font-semibold text-ink">
                  Any other questions?{' '}
                  <span className="font-normal text-gray-ink">We have the answers.</span>
                </p>
                <a
                  href="mailto:support@havenspace.app"
                  className="inline-block rounded-full bg-primary-strong px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  Contact us
                </a>
              </div>
            </div>
          </div>

          {/* Right — tabs + accordion */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="mb-2 flex flex-wrap gap-2 border-b border-border">
              {TABS.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setTab(item.key);
                    setOpenIndex(null);
                  }}
                  className={`relative whitespace-nowrap px-4 py-3 text-sm transition-colors ${
                    tab === item.key
                      ? 'font-semibold text-ink'
                      : 'font-medium text-gray-ink hover:text-ink'
                  }`}
                >
                  {item.label}
                  {tab === item.key ? (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-t bg-primary-strong" />
                  ) : null}
                </button>
              ))}
            </div>
            {visible.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-xl bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="flex-1 pr-4 font-semibold text-ink">{faq.question}</span>
                    <span
                      className={`text-xl text-gray-ink transition-transform ${
                        isOpen ? 'rotate-45 text-primary' : ''
                      }`}
                    >
                      +
                    </span>
                  </button>
                  {isOpen ? (
                    <p className="px-6 pb-5 text-sm leading-relaxed text-gray-ink">{faq.answer}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
