document.addEventListener('DOMContentLoaded', () => {
  const teamCards = document.querySelectorAll('.team-card');

  teamCards.forEach(card => {
    // Click on card to expand/collapse
    card.addEventListener('click', e => {
      // Don't expand if clicking on collapse button
      if (e.target.classList.contains('collapse-btn')) {
        return;
      }

      // If card is already expanded, collapse it
      if (card.classList.contains('expanded')) {
        card.classList.remove('expanded');
        // Remove collapsed class from all other cards
        teamCards.forEach(otherCard => {
          if (otherCard !== card) {
            otherCard.classList.remove('collapsed');
          }
        });
        return;
      }

      // Collapse all other cards and mark them as collapsed
      teamCards.forEach(otherCard => {
        if (otherCard !== card) {
          otherCard.classList.remove('expanded');
          otherCard.classList.add('collapsed');
        }
      });

      // Expand clicked card
      card.classList.add('expanded');
      card.classList.remove('collapsed');
    });

    // Collapse button functionality
    const collapseBtn = card.querySelector('.collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', e => {
        e.stopPropagation();
        card.classList.remove('expanded');
        // Remove collapsed class from all other cards
        teamCards.forEach(otherCard => {
          if (otherCard !== card) {
            otherCard.classList.remove('collapsed');
          }
        });
      });
    }
  });

  // Close expanded card when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('.team-card')) {
      teamCards.forEach(card => {
        card.classList.remove('expanded');
        card.classList.remove('collapsed');
      });
    }
  });

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      teamCards.forEach(card => {
        card.classList.remove('expanded');
        card.classList.remove('collapsed');
      });
    }
  });
});
