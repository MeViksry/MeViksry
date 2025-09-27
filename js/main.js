(function(html) {

    "use strict";

    html.className = html.className.replace(/\bno-js\b/g, '') + ' js ';

    const tl = anime.timeline({
        easing: 'easeInOutCubic',
        duration: 800,
        autoplay: false
    })
    .add({
        targets: '#loader',
        opacity: 0,
        duration: 1000,
        begin: function(anim) {
            window.scrollTo(0, 0);
        }
    })
    .add({
        targets: '#preloader',
        opacity: 0,
        complete: function(anim) {
            document.querySelector("#preloader").style.visibility = "hidden";
            document.querySelector("#preloader").style.display = "none";
        }
    })
    .add({
        targets: '.v-header',
        translateY: [-100, 0],
        opacity: [0, 1]
    }, '-=200')
    .add({
        targets: ['.v-intro .text-pretitle', '.v-intro .text-huge-title'],
        translateX: [100, 0],
        opacity: [0, 1],
        delay: anime.stagger(400)
    })
    .add({
        targets: '.circles span',
        keyframes: [
            {opacity: [0, .3]},
            {opacity: [.3, .1], delay: anime.stagger(100, {direction: 'reverse'})}
        ],
        delay: anime.stagger(100, {direction: 'reverse'})
    })
    .add({
        targets: '.intro-social li',
        translateX: [-50, 0],
        opacity: [0, 1],
        delay: anime.stagger(100, {direction: 'reverse'})
    })
    .add({
        targets: '.intro-scrolldown',
        translateY: [100, 0],
        opacity: [0, 1]
    }, '-=800');

    const vvPreloader = function() {
        const preloader = document.querySelector('#preloader');
        if (!preloader) return;
        
        window.addEventListener('load', function() {
            document.querySelector('html').classList.remove('vv-preload');
            document.querySelector('html').classList.add('vv-loaded');

            document.querySelectorAll('.vv-animated').forEach(function(item){
                item.classList.remove('vv-animated');
            });

            tl.play();
        });
    };

    const vvMobileMenu = function() {
        const toggleButton = document.querySelector('.mobile-menu-toggle');
        const mainNavWrap = document.querySelector('.main-nav-wrap');
        const siteBody = document.querySelector("body");

        if (!(toggleButton && mainNavWrap)) return;

        toggleButton.addEventListener('click', function(event) {
            event.preventDefault();
            toggleButton.classList.toggle('is-clicked');
            siteBody.classList.toggle('menu-is-open');
        });

        mainNavWrap.querySelectorAll('.main-nav a').forEach(function(link) {
            link.addEventListener("click", function(event) {
                if (window.matchMedia('(max-width: 800px)').matches) {
                    toggleButton.classList.toggle('is-clicked');
                    siteBody.classList.toggle('menu-is-open');
                }
            });
        });

        window.addEventListener('resize', function() {
            if (window.matchMedia('(min-width: 801px)').matches) {
                if (siteBody.classList.contains('menu-is-open')) siteBody.classList.remove('menu-is-open');
                if (toggleButton.classList.contains("is-clicked")) toggleButton.classList.remove("is-clicked");
            }
        });
    };

    const vvScrollSpy = function() {
        const sections = document.querySelectorAll(".target-section");
        window.addEventListener("scroll", navHighlight);

        function navHighlight() {
            let scrollY = window.pageYOffset;
            sections.forEach(function(current) {
                const sectionHeight = current.offsetHeight;
                const sectionTop = current.offsetTop - 50;
                const sectionId = current.getAttribute("id");
            
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    document.querySelector(".main-nav a[href*=" + sectionId + "]").parentNode.classList.add("current");
                } else {
                    document.querySelector(".main-nav a[href*=" + sectionId + "]").parentNode.classList.remove("current");
                }
            });
        }
    };

    const vvViewAnimate = function() {
        const blocks = document.querySelectorAll("[data-animate-block]");
        window.addEventListener("scroll", viewportAnimation);

        function viewportAnimation() {
            let scrollY = window.pageYOffset;
            blocks.forEach(function(current) {
                const viewportHeight = window.innerHeight;
                const triggerTop = (current.offsetTop + (viewportHeight * .2)) - viewportHeight;
                const blockHeight = current.offsetHeight;
                const blockSpace = triggerTop + blockHeight;
                const inView = scrollY > triggerTop && scrollY <= blockSpace;
                const isAnimated = current.classList.contains("vv-animated");

                if (inView && (!isAnimated)) {
                    anime({
                        targets: current.querySelectorAll("[data-animate-el]"),
                        opacity: [0, 1],
                        translateY: [100, 0],
                        delay: anime.stagger(400, {start: 200}),
                        duration: 800,
                        easing: 'easeInOutCubic',
                        begin: function(anim) {
                            current.classList.add("vv-animated");
                        }
                    });
                }
            });
        }
    };

    const vvSwiper = function() {
        if (typeof Swiper === 'undefined') {
            console.error('Swiper library tidak ditemukan!');
            return;
        }

        const swiperContainer = document.querySelector('.swiper-container');
        if (!swiperContainer) {
            console.warn('Element .swiper-container tidak ditemukan');
            return;
        }

        const mySwiper = new Swiper('.swiper-container', {
            slidesPerView: 1,
            spaceBetween: 10,
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                401: { slidesPerView: 1, spaceBetween: 20 },
                801: { slidesPerView: 2, spaceBetween: 32 },
                1201: { slidesPerView: 2, spaceBetween: 80 }
            }
        });

        return mySwiper;
    };

    const vvLightbox = function() {
        if (typeof basicLightbox === 'undefined') {
            console.error('basicLightbox library tidak ditemukan!');
            return;
        }

        const folioLinks = document.querySelectorAll('.folio-list__item-link');
        if (folioLinks.length === 0) {
            console.warn('Tidak ada element .folio-list__item-link ditemukan');
            return;
        }

        const modals = [];
        let keydownHandler = null;

        folioLinks.forEach(function(link, index) {
            let modalSelector = link.getAttribute('href');
            
            if (!modalSelector || !modalSelector.startsWith('#')) {
                console.warn(`Link ke-${index + 1} tidak memiliki href yang valid:`, modalSelector);
                return;
            }

            const modalElement = document.querySelector(modalSelector);
            if (!modalElement) {
                console.warn(`Modal element tidak ditemukan untuk selector: ${modalSelector}`);
                return;
            }

            const modalClone = modalElement.cloneNode(true);
            modalClone.style.display = 'block';

            let instance = basicLightbox.create(modalClone, {
                onShow: function(instance) {
                    if (keydownHandler) {
                        document.removeEventListener("keydown", keydownHandler);
                    }
                    
                    keydownHandler = function(event) {
                        event = event || window.event;
                        if (event.keyCode === 27 || event.key === 'Escape') {
                            instance.close();
                        }
                    };
                    
                    document.addEventListener("keydown", keydownHandler);
                },
                onClose: function() {
                    if (keydownHandler) {
                        document.removeEventListener("keydown", keydownHandler);
                        keydownHandler = null;
                    }
                }
            });

            modals.push(instance);
        });

        folioLinks.forEach(function(link, index) {
            if (modals[index]) {
                link.addEventListener("click", function(event) {
                    event.preventDefault();
                    modals[index].show();
                });
            }
        });

        return modals;
    };

    const vvAlertBoxes = function() {
        const boxes = document.querySelectorAll('.alert-box');
        boxes.forEach(function(box){
            box.addEventListener('click', function(event) {
                if (event.target.matches(".alert-box__close")) {
                    event.stopPropagation();
                    event.target.parentElement.classList.add("hideit");
                    setTimeout(function(){
                        box.style.display = "none";
                    }, 500);
                }    
            });
        });
    };

    const vvMoveTo = function(){
        if (typeof MoveTo === 'undefined') {
            console.error('MoveTo library tidak ditemukan!');
            return;
        }

        const easeFunctions = {
            easeInQuad: function (t, b, c, d) { t /= d; return c * t * t + b; },
            easeOutQuad: function (t, b, c, d) { t /= d; return -c * t* (t - 2) + b; },
            easeInOutQuad: function (t, b, c, d) { t /= d/2; if (t < 1) return c/2*t*t + b; t--; return -c/2 * (t*(t-2) - 1) + b; },
            easeInOutCubic: function (t, b, c, d) { t /= d/2; if (t < 1) return c/2*t*t*t + b; t -= 2; return c/2*(t*t*t + 2) + b; }
        };

        const triggers = document.querySelectorAll('.smoothscroll');
        if (triggers.length === 0) {
            console.warn('Tidak ada element .smoothscroll ditemukan');
            return;
        }

        const moveTo = new MoveTo({
            tolerance: 0,
            duration: 1200,
            easing: 'easeInOutCubic',
            container: window
        }, easeFunctions);

        triggers.forEach(function(trigger) {
            moveTo.registerTrigger(trigger);
        });
    };

    (function vvInit() {
        vvPreloader();
        vvMobileMenu();
        vvScrollSpy();
        vvViewAnimate();
        vvSwiper();
        vvLightbox();
        vvAlertBoxes();
        vvMoveTo();
    })();

})(document.documentElement);