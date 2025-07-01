import logoLight from "../assets/img/full-logo/Logo_High_White_text.png";
import logoDark from "../assets/img/full-logo/Logo_White.png";
    
// Set dark mode as default
document.documentElement.setAttribute('data-theme', 'dark');
    
// Logo URLs
const logoImage = document.getElementById('logoImage');

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


