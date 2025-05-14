import logoLight from "../assets/img/full-logo/Logo_High_res.png";
import logoDark from "../assets/img/full-logo/Logo_White.png";
    
// Set dark mode as default
document.documentElement.setAttribute('data-theme', 'dark');
    
// Logo URLs
const logoImage = document.getElementById('logoImage');

// Scroll animation
window.addEventListener('scroll', function() {
    const scrollPos = window.scrollY;
    const windowHeight = window.innerHeight;
    
    // Logo section - visible at start, fades out as user scrolls
    const logoSection = document.getElementById('logoSection');
    if (scrollPos < windowHeight) {
        logoSection.style.opacity = 1 - scrollPos / windowHeight;
    } else {
        logoSection.style.opacity = 0;
    }
    
    // Welcome section - fades in as logo fades out, then fades out
    const welcomeSection = document.getElementById('welcomeSection');
    if (scrollPos < windowHeight) {
        welcomeSection.style.opacity = scrollPos / windowHeight;
    } else if (scrollPos < windowHeight * 2) {
        welcomeSection.style.opacity = 2 - scrollPos / windowHeight;
    } else {
        welcomeSection.style.opacity = 0;
    }
    
    // Final section - fades in as welcome fades out
    const finalSection = document.getElementById('finalSection');
    if (scrollPos < windowHeight * 2) {
        finalSection.style.opacity = (scrollPos - windowHeight) / windowHeight;
    } else {
        finalSection.style.opacity = 1;
    }
});

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = 'Dark Mode';
        logoImage.src = logoLight.src;
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = 'Light Mode';
        logoImage.src = logoDark.src;
    }
});

// Initial setup
window.dispatchEvent(new Event('scroll'));


