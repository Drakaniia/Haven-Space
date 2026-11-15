import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

// happy-dom 21 implements the Web Animations API, so motion now runs real
// `element.animate()` animations in tests. Cancelling one rejects its
// `finished` promise with an AbortError, and happy-dom leaves that rejection
// unhandled, which bun reports as a test failure. The spec (Web Animations,
// "cancel an animation") marks that promise as handled, as browsers do, so do
// the same here before cancelling.
const animationPrototype = (globalThis as { Animation?: { prototype: Animation } }).Animation
  ?.prototype;

if (animationPrototype) {
  const cancel = animationPrototype.cancel;

  animationPrototype.cancel = function cancelHandled(this: Animation) {
    this.finished?.catch(() => {});
    return cancel.call(this);
  };
}
