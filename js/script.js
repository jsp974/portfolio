// --- 1. Animation d'apparition au Scroll (Reveal) ---
const reveal = () => {
    const reveals = document.querySelectorAll(".reveal");
    reveals.forEach((el) => {
        const windowHeight = window.innerHeight;
        const elementTop = el.getBoundingClientRect().top;
        const elementVisible = 100;
        if (elementTop < windowHeight - elementVisible) {
            el.classList.add("active");
        }
    });
};

window.addEventListener("scroll", reveal);
window.onload = reveal;

// --- 2. Slider de Projets (Page Accueil) ---
const track = document.getElementById("sliderTrack");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");

if (track && nextBtn && prevBtn) {
    let index = 0;

    const updateSlider = () => {
        const slides = document.querySelectorAll(".project-slide");
        const isMobile = window.innerWidth < 768;
        const cardsPerView = isMobile ? 1 : 2;
        const maxIndex = slides.length - cardsPerView;

        if (index > maxIndex) index = 0;
        if (index < 0) index = maxIndex;

        const gap = 32; // Correspond à 2rem
        const cardWidth = slides[0].offsetWidth;
        const move = index * (cardWidth + gap);

        track.style.transform = `translateX(-${move}px)`;
    };

    nextBtn.addEventListener("click", () => { index++; updateSlider(); });
    prevBtn.addEventListener("click", () => { index--; updateSlider(); });
    window.addEventListener("resize", updateSlider);
}

// --- 3. Smooth Scroll pour les liens de navigation ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});