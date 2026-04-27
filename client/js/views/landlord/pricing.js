// Pricing Page JavaScript
// Handle FAQ accordion functionality

document.addEventListener('DOMContentLoaded', function () {
  // FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const toggle = item.querySelector('.faq-toggle');

    // Click on question or toggle button
    question.addEventListener('click', () => toggleFAQ(item));
    toggle.addEventListener('click', e => {
      e.stopPropagation();
      toggleFAQ(item);
    });
  });

  function toggleFAQ(item) {
    const isActive = item.classList.contains('active');

    // Close all FAQ items first
    faqItems.forEach(faq => faq.classList.remove('active'));

    // Open clicked item if it wasn't active
    if (!isActive) {
      item.classList.add('active');
    }
  }

  // Pricing CTA Button
  const pricingBtn = document.querySelector('.pricing-btn');
  if (pricingBtn) {
    pricingBtn.addEventListener('click', function () {
      // In a real implementation, this would redirect to checkout
      // For now, we'll show a confirmation message
      alert('Redirecting to checkout... (This would be a real payment flow in production)');

      // You could also implement:
      // window.location.href = '/checkout';
      // Or trigger a modal for plan selection
    });
  }

  // Add subtle animation to pricing card on load
  const pricingCard = document.querySelector('.pricing-card');
  if (pricingCard) {
    setTimeout(() => {
      pricingCard.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease';
      pricingCard.style.transform = 'translateY(-5px)';
      pricingCard.style.boxShadow = 'var(--shadow-2xl)';
    }, 300);
  }
});
