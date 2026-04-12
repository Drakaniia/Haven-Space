/**
 * Logo Cloud Infinite Slider
 * Vanilla JavaScript implementation
 */

export function initLogoCloud() {
  const slider = document.getElementById('logoSlider');
  if (!slider) {
    return;
  }

  let currentSpeed = 80; // base speed
  let animationFrameId = null;
  let position = 0;

  // Calculate the width of one complete set of logos
  const logoTrack = slider.querySelector('.logo-track');
  if (!logoTrack) {
    return;
  }

  const getTrackWidth = () => {
    const img = logoTrack.querySelector('img');
    if (!img) {
      return 0;
    }
    const gap = 42;
    // Use getBoundingClientRect for more accurate measurement
    const logoWidth = img.getBoundingClientRect().width;
    const logoCount = logoTrack.children.length;
    return (logoWidth + gap) * logoCount - gap;
  };

  // Wait a bit for images to be fully rendered
  setTimeout(() => {
    let trackWidth = getTrackWidth();

    // Fallback: if trackWidth is 0, use a reasonable estimate
    if (trackWidth === 0) {
      // Assume average logo width of 100px
      const gap = 42;
      const logoCount = logoTrack.children.length;
      trackWidth = (100 + gap) * logoCount - gap;
    }

    // Recalculate on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        trackWidth = getTrackWidth();
      }, 250);
    });

    // Animation loop
    const animate = () => {
      position -= currentSpeed / 60; // Convert speed to per-frame

      if (position <= -trackWidth) {
        position = 0;
      }

      slider.style.transform = `translateX(${position}px)`;
      animationFrameId = requestAnimationFrame(animate);
    };

    // Start animation
    const startAnimation = () => {
      if (!animationFrameId) {
        animate();
      }
    };

    // Stop animation
    const stopAnimation = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    // Hover effects - slow down on hover
    slider.addEventListener('mouseenter', () => {
      // Smoothly transition to slower speed
      const slowDown = () => {
        if (currentSpeed > 25) {
          currentSpeed -= 2;
          requestAnimationFrame(slowDown);
        } else {
          currentSpeed = 25;
        }
      };
      slowDown();
    });

    slider.addEventListener('mouseleave', () => {
      // Smoothly transition back to normal speed
      const speedUp = () => {
        if (currentSpeed < 80) {
          currentSpeed += 2;
          requestAnimationFrame(speedUp);
        } else {
          currentSpeed = 80;
        }
      };
      speedUp();
    });

    // Initialize
    startAnimation();

    // Cleanup function (if needed)
    return () => {
      stopAnimation();
    };
  }, 100);
}
