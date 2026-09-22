(() => {
  'use strict';

  const root = document.documentElement;
  const progressBar = document.querySelector('.page-progress span');
  const header = document.querySelector('[data-header]');
  const hero = document.querySelector('[data-hero]');
  const story = document.querySelector('[data-story]');
  const storySteps = story ? [...story.querySelectorAll('[data-story-step]')] : [];
  const indicators = story ? [...story.querySelectorAll('.story-indicator span')] : [];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileLayout = window.matchMedia('(max-width: 767px)');
  let frameRequested = false;
  let activeStoryIndex = 0;

  const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

  // スクロール位置から、ページ全体と各演出の進捗をまとめて更新する。
  const updateScrollEffects = () => {
    frameRequested = false;
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    if (progressBar && !reduceMotion.matches) {
      progressBar.style.transform = `scaleX(${maxScroll > 0 ? clamp(scrollY / maxScroll) : 0})`;
    }

    if (header) {
      header.classList.toggle('is-scrolled', scrollY > 24);
    }

    if (hero && !reduceMotion.matches) {
      const heroHeight = hero.offsetHeight;
      const heroProgress = heroHeight > 0 ? clamp(scrollY / heroHeight) : 0;
      root.style.setProperty('--hero-progress', heroProgress.toFixed(4));
    } else {
      root.style.setProperty('--hero-progress', '0');
    }

    if (story && storySteps.length && !reduceMotion.matches && !mobileLayout.matches) {
      const shell = story.querySelector('.story-shell');
      if (shell) {
        const rect = shell.getBoundingClientRect();
        const distance = shell.offsetHeight - window.innerHeight;
        const storyProgress = distance > 0 ? clamp(-rect.top / distance) : 0;
        const nextIndex = Math.min(storySteps.length - 1, Math.floor(storyProgress * storySteps.length));

        if (nextIndex !== activeStoryIndex) {
          activeStoryIndex = nextIndex;
          storySteps.forEach((step, index) => step.classList.toggle('is-active', index === activeStoryIndex));
          indicators.forEach((indicator, index) => indicator.classList.toggle('is-active', index === activeStoryIndex));
        }
      }
    }
  };

  const requestScrollUpdate = () => {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(updateScrollEffects);
  };

  // 表示領域に入った要素へ一度だけ表示クラスを付ける。
  const setupRevealObserver = () => {
    const revealItems = [...document.querySelectorAll('.reveal')];
    if (!revealItems.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -7% 0px' });

    revealItems.forEach((item) => observer.observe(item));
  };

  const resetStoryState = () => {
    activeStoryIndex = 0;
    storySteps.forEach((step, index) => step.classList.toggle('is-active', index === 0));
    indicators.forEach((indicator, index) => indicator.classList.toggle('is-active', index === 0));
    requestScrollUpdate();
  };

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate);
  reduceMotion.addEventListener('change', resetStoryState);
  mobileLayout.addEventListener('change', resetStoryState);

  setupRevealObserver();
  updateScrollEffects();
})();
