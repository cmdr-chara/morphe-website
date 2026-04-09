// Testimonials Module
// Loads testimonials from i18n translations and handles carousel

(function() {
    'use strict';

    let carouselInstance = null;

    // Testimonial card template
    function createTestimonialCard(testimonial) {
        const avatar = testimonial.author ? testimonial.author.charAt(0).toUpperCase() : '?';
        return `
            <div class="testimonial-card">
                <div class="testimonial-content">
                    <p class="testimonial-text">${testimonial.text}</p>
                </div>
                <div class="testimonial-author">
                    <div class="author-avatar">${avatar}</div>
                    <div class="author-info">
                        <div class="author-name">${testimonial.author}</div>
                        <div class="author-role">${testimonial.role}</div>
                    </div>
                </div>
                <div class="testimonial-rating">
                    ${'<span class="star">★</span>'.repeat(5)}
                </div>
            </div>
        `;
    }

    // Extract testimonials from i18n
    function loadTestimonials() {
        if (!window.i18n?.translations?.testimonials) {
            return [];
        }

        const testimonials = [];
        const section = window.i18n.translations.testimonials;
        let index = 1;

        // Load all quote_N entries
        while (section[`quote_${index}`]) {
            const quote = section[`quote_${index}`];
            testimonials.push({
                text: quote.text || '',
                author: quote.author || 'Unknown',
                role: quote.role || ''
            });
            index++;
        }

        // Reorder testimony by declared indexes
        // Allows easily changing order without localized files
        return reorderByIndexes(
            [2, 9, 3, 16, 4, 18, 5, 10, 6, 11, 7, 13, 12, 15, 17, 14, 19, 8].map(n => n - 1),
            testimonials
        );
    }

    function reorderByIndexes(indexes, values) {
        return indexes
            .filter(i => i >= 0 && i < values.length)
            .map(i => values[i]);
    }

    // Render testimonials into DOM
    function renderTestimonials(testimonials) {
        const grid = document.getElementById('testimonials-grid');
        if (!grid) return;

        if (testimonials.length === 0) {
            grid.innerHTML = '<p>No testimonials available</p>';
            return;
        }

        grid.innerHTML = testimonials.map(createTestimonialCard).join('');
    }

    // Destroy existing carousel instance
    function destroyCarousel() {
        if (!carouselInstance) return;

        const { track, prevBtn, nextBtn, scrollHandler, resizeHandler, mouseUpHandler, mouseDown, touchStart, touchEnd, nextClick, prevClick } = carouselInstance;

        if (track) {
            if (scrollHandler) track.removeEventListener('scroll', scrollHandler);
            if (mouseDown)     track.removeEventListener('mousedown', mouseDown);
            if (touchStart)    track.removeEventListener('touchstart', touchStart);
            if (touchEnd)      track.removeEventListener('touchend', touchEnd);
            track.querySelectorAll('.testimonial-card-clone').forEach(el => el.remove());
            track.style.cssText = '';
        }

        if (prevBtn && prevClick) prevBtn.removeEventListener('click', prevClick);
        if (nextBtn && nextClick) nextBtn.removeEventListener('click', nextClick);
        if (mouseUpHandler) document.removeEventListener('mouseup', mouseUpHandler);
        if (resizeHandler)  window.removeEventListener('resize', resizeHandler);

        carouselInstance = null;
    }

    // Initialize carousel
    function initializeCarousel() {
        // Destroy existing carousel first
        destroyCarousel();

        const carousel = document.querySelector('.testimonials-carousel');
        if (!carousel) return;

        const track = carousel.querySelector('.testimonials-grid');
        const prevBtn = carousel.querySelector('.carousel-button.prev');
        const nextBtn = carousel.querySelector('.carousel-button.next');
        if (!track || !prevBtn || !nextBtn) return;

        track.querySelectorAll('.testimonial-card-clone').forEach(el => el.remove());

        const originalCards = Array.from(track.querySelectorAll('.testimonial-card'));
        if (originalCards.length === 0) return;

        const isMobile = window.innerWidth <= 768;
        const isRTL = document.documentElement.dir === 'rtl';
        const total = originalCards.length;

        // Clone all cards on both sides for infinite buffer.
        // clonesBefore: must mirror the END of the real list so scrolling back
        // from card[0] immediately shows card[total-1], card[total-2], etc.
        // We insert them one-by-one at the front, so the last one inserted
        // ends up first — that means we iterate forward and prepend.
        const clonesAfter = originalCards.map(c => {
            const cl = c.cloneNode(true);
            cl.classList.add('testimonial-card-clone');
            return cl;
        });

        // Prepend in reverse so DOM order is [..., card[total-2], card[total-1]] before real cards
        for (let i = originalCards.length - 1; i >= 0; i--) {
            const cl = originalCards[i].cloneNode(true);
            cl.classList.add('testimonial-card-clone');
            track.insertBefore(cl, track.firstChild);
        }

        clonesAfter.forEach(c => track.appendChild(c));

        // Style track as scroll container.
        // overflow-y cannot be visible when overflow-x is scroll (browser resets it to auto).
        // Instead we add vertical padding so the box-shadow on hover fits within the scroll area.
        track.style.overflowX = 'scroll';
        track.style.paddingTop = '8px';
        track.style.paddingBottom = '16px';
        track.style.scrollSnapType = 'x mandatory';
        track.style.scrollBehavior = 'auto';
        track.style.msOverflowStyle = 'none';
        track.style.scrollbarWidth = 'none';
        track.style.cursor = 'grab';
        track.style.webkitOverflowScrolling = 'touch';

        // Each card snaps to start
        const allCards = Array.from(track.querySelectorAll('.testimonial-card, .testimonial-card-clone'));
        allCards.forEach(card => {
            card.style.scrollSnapAlign = 'start';
            card.style.flexShrink = '0';
        });

        // currentIndex: real cards occupy positions [total .. total*2-1]
        let currentIndex = total;
        let isStepping = false;

        function getScrollLeft(index) {
            const card = allCards[index];
            if (!card) return 0;
            return card.offsetLeft - track.offsetLeft;
        }

        function scrollToIndex(index, smooth) {
            track.style.scrollBehavior = smooth ? 'smooth' : 'auto';
            track.scrollLeft = getScrollLeft(index);
        }

        function teleportIfNeeded() {
            if (currentIndex < total) {
                currentIndex = currentIndex + total;
                scrollToIndex(currentIndex, false);
            } else if (currentIndex >= total * 2) {
                currentIndex = currentIndex - total;
                scrollToIndex(currentIndex, false);
            }
            isStepping = false;
        }

        function step(direction) {
            if (isStepping) return;
            isStepping = true;
            currentIndex += direction;
            scrollToIndex(currentIndex, true);
            setTimeout(teleportIfNeeded, 400);
        }

        // Initial silent position
        requestAnimationFrame(() => {
            scrollToIndex(currentIndex, false);
        });

        // Mouse drag
        let dragStartX = 0;
        let isDragging = false;

        const mouseDown = (e) => {
            isDragging = true;
            dragStartX = e.clientX;
            track.style.scrollBehavior = 'auto';
            track.style.cursor = 'grabbing';
            e.preventDefault();
        };

        const mouseUpHandler = (e) => {
            if (!isDragging) return;
            isDragging = false;
            track.style.cursor = 'grab';
            const delta = dragStartX - e.clientX;
            const normalizedDelta = isRTL ? -delta : delta;
            if (Math.abs(delta) > 50) step(normalizedDelta > 0 ? 1 : -1);
        };

        track.addEventListener('mousedown', mouseDown);
        document.addEventListener('mouseup', mouseUpHandler);

        // Touch: let native scroll-snap handle the animation.
        // We only need to detect when the user lands on a clone and teleport silently.
        let scrollEndTimer = null;

        const scrollHandler = () => {
            // Debounce: fire ~100ms after scrolling stops
            clearTimeout(scrollEndTimer);
            scrollEndTimer = setTimeout(() => {
                if (isStepping) return;

                // Sync currentIndex to wherever the scroll landed
                const scrollLeft = track.scrollLeft;
                let closest = 0;
                let minDist = Infinity;
                allCards.forEach((card, i) => {
                    const dist = Math.abs(card.offsetLeft - track.offsetLeft - scrollLeft);
                    if (dist < minDist) { minDist = dist; closest = i; }
                });
                currentIndex = closest;

                // Teleport if landed on a clone
                if (currentIndex < total) {
                    currentIndex = currentIndex + total;
                    scrollToIndex(currentIndex, false);
                } else if (currentIndex >= total * 2) {
                    currentIndex = currentIndex - total;
                    scrollToIndex(currentIndex, false);
                }
            }, 100);
        };

        track.addEventListener('scroll', scrollHandler, { passive: true });

        // Touch: native scroll-snap handles animation
        const touchStart = (e) => {
            touchStartX = e.touches[0].screenX;
        };
        let touchStartX = 0;

        const touchEnd = (e) => {
            // Native scroll-snap handles the animation; we do nothing here
        };

        track.addEventListener('touchstart', touchStart, { passive: true });
        track.addEventListener('touchend', touchEnd, { passive: true });

        // Button controls
        if (isRTL) {
            const prevIcon = prevBtn.querySelector('.material-symbols-rounded');
            const nextIcon = nextBtn.querySelector('.material-symbols-rounded');
            if (prevIcon) prevIcon.textContent = 'chevron_right';
            if (nextIcon) nextIcon.textContent = 'chevron_left';
            if (prevBtn.parentNode) prevBtn.parentNode.insertBefore(nextBtn, prevBtn);
        }

        const nextClick = (e) => { e.preventDefault(); step(isRTL ? -1 : 1); };
        const prevClick = (e) => { e.preventDefault(); step(isRTL ? 1 : -1); };

        nextBtn.addEventListener('click', nextClick);
        prevBtn.addEventListener('click', prevClick);

        // Resize
        let resizeTimer;
        const resizeHandler = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if ((window.innerWidth <= 768) !== isMobile) { location.reload(); return; }
                scrollToIndex(currentIndex, false);
            }, 250);
        };
        window.addEventListener('resize', resizeHandler);

        carouselInstance = {
            track,
            prevBtn,
            nextBtn,
            scrollHandler,
            resizeHandler,
            mouseDown,
            mouseUpHandler,
            touchStart,
            touchEnd,
            nextClick,
            prevClick,
        };
    }

    // Reload testimonials on language change
    window.reloadTestimonials = function() {
        const testimonials = loadTestimonials();
        renderTestimonials(testimonials);
        setTimeout(() => { initializeCarousel(); }, 100);
    };

    // Initialize testimonials with event-based approach
    function init() {
        window.addEventListener('i18nReady', function(event) {
            console.log('i18n ready event received:', event.detail);
            const testimonials = loadTestimonials();
            renderTestimonials(testimonials);
            setTimeout(() => { initializeCarousel(); }, 100);
        });

        if (window.i18n && window.i18n.translations && window.i18n.translations.testimonials) {
            console.log('i18n already ready, loading immediately');
            const testimonials = loadTestimonials();
            renderTestimonials(testimonials);
            setTimeout(() => { initializeCarousel(); }, 100);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
