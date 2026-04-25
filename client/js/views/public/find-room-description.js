// Initialize word-by-word animation for find-room description
export function initFindRoomDescriptionAnimation() {
  const description = document.getElementById('find-room-description');
  if (!description) return;

  // Store original text and split into words
  const text = description.textContent;
  const words = text.split(' ').filter(word => word.trim() !== '');

  // Wrap each word in a span with index for sequential animation
  description.innerHTML = words
    .map((word, index) => `<span class="word" data-word-index="${index}">${word}</span>`)
    .join(' ');

  const wordElements = description.querySelectorAll('.word');
  const totalWords = wordElements.length;

  // Use Intersection Observer to track when the section is in view
  const sectionObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          startWordAnimation();
        } else {
          resetWordAnimation();
        }
      });
    },
    {
      threshold: 0.3,
      rootMargin: '-10% 0px -10% 0px',
    }
  );

  sectionObserver.observe(description);

  function startWordAnimation() {
    // Calculate scroll progress within the section
    const updateAnimation = () => {
      const rect = description.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate how much of the section has been scrolled through
      const sectionTop = rect.top;
      const sectionHeight = rect.height;

      // Progress from 0 to 1 as we scroll through the section
      let progress = 0;

      if (sectionTop <= windowHeight * 0.7) {
        progress = Math.max(
          0,
          (windowHeight * 0.7 - sectionTop) / (sectionHeight + windowHeight * 0.4)
        );
        progress = Math.min(1, progress);
      }

      // Calculate how many words should be active based on scroll progress
      const activeWordCount = Math.floor(progress * totalWords);

      // Update word states
      wordElements.forEach((word, index) => {
        if (index < activeWordCount) {
          word.classList.add('active');
        } else {
          word.classList.remove('active');
        }
      });
    };

    // Throttled scroll handler
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateAnimation();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Initial update
    updateAnimation();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Store the handler for cleanup
    description._scrollHandler = handleScroll;
  }

  function resetWordAnimation() {
    // Remove scroll listener if it exists
    if (description._scrollHandler) {
      window.removeEventListener('scroll', description._scrollHandler);
      description._scrollHandler = null;
    }

    // Reset all words to inactive state
    wordElements.forEach(word => {
      word.classList.remove('active');
    });
  }
}

// Auto-initialize if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFindRoomDescriptionAnimation);
} else {
  initFindRoomDescriptionAnimation();
}
