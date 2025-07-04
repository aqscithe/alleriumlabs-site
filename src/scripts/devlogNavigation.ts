// Devlog Navigation System
interface TocItem {
    id: string;
    text: string;
    level: number;
    element: HTMLElement;
}

class DevlogNavigation {
    private tocItems: TocItem[] = [];
    private activeSection: string = '';
    private progressBar!: HTMLElement;
    private tocContainer!: HTMLElement;
    private tocToggle!: HTMLElement;
    private isScrolling = false;

    constructor() {
        this.init();
    }

    private init(): void {
        this.createProgressBar();
        this.generateTableOfContents();
        this.setupScrollHandlers();
        this.setupTocToggle();
        this.highlightActiveSection();
    }

    private createProgressBar(): void {
        // Create reading progress bar
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'reading-progress';
        this.progressBar.innerHTML = '<div class="reading-progress-fill"></div>';
        document.body.appendChild(this.progressBar);
    }

    private generateTableOfContents(): void {
        const prose = document.querySelector('.prose');
        if (!prose) return;

        const headings = prose.querySelectorAll('h1, h2, h3, h4, h5, h6') as NodeListOf<HTMLElement>;
        if (headings.length === 0) return;

        // Generate IDs and collect TOC items
        headings.forEach((heading, index) => {
            const id = this.generateId(heading.textContent || `heading-${index}`);
            heading.id = id;
            
            const level = parseInt(heading.tagName.charAt(1));
            this.tocItems.push({
                id,
                text: heading.textContent || '',
                level,
                element: heading
            });
        });

        this.createTocUI();
    }

    private generateId(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    private createTocUI(): void {
        if (this.tocItems.length === 0) return;

        // Create TOC container
        this.tocContainer = document.createElement('nav');
        this.tocContainer.className = 'table-of-contents';
        this.tocContainer.innerHTML = `
            <div class="toc-header">
                <h3>Table of Contents</h3>
                <button class="toc-toggle" aria-label="Toggle table of contents">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                </button>
            </div>
            <div class="toc-content">
                <ul class="toc-list">
                    ${this.tocItems.map(item => `
                        <li class="toc-item toc-level-${item.level}">
                            <a href="#${item.id}" class="toc-link" data-target="${item.id}">
                                ${item.text}
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;

        // Insert TOC after the header
        const header = document.querySelector('.devlog-post-header');
        if (header && header.nextSibling) {
            header.parentNode?.insertBefore(this.tocContainer, header.nextSibling);
        }

        // Add click handlers for TOC links
        this.tocContainer.querySelectorAll('.toc-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = (e.target as HTMLElement).closest('.toc-link') as HTMLElement;
                const targetId = target.dataset.target;
                if (targetId) {
                    this.scrollToSection(targetId);
                }
            });
        });
    }

    private setupTocToggle(): void {
        this.tocToggle = this.tocContainer?.querySelector('.toc-toggle') as HTMLElement;
        if (!this.tocToggle) return;

        this.tocToggle.addEventListener('click', () => {
            this.tocContainer.classList.toggle('toc-collapsed');
        });
    }

    private setupScrollHandlers(): void {
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.updateReadingProgress();
                    this.highlightActiveSection();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    private updateReadingProgress(): void {
        const progressFill = this.progressBar?.querySelector('.reading-progress-fill') as HTMLElement;
        if (!progressFill) return;

        const article = document.querySelector('.devlog-post-content') as HTMLElement;
        if (!article) return;

        const articleTop = article.getBoundingClientRect().top + window.scrollY;
        const articleHeight = article.offsetHeight;
        const windowHeight = window.innerHeight;
        const scrolled = window.scrollY - articleTop + windowHeight;
        
        const progress = Math.min(Math.max(scrolled / (articleHeight + windowHeight), 0), 1);
        progressFill.style.width = `${progress * 100}%`;
    }

    private highlightActiveSection(): void {
        if (this.isScrolling) return;

        let currentActive = '';
        const scrollPosition = window.scrollY + 100; // Offset for better UX

        // Find the current section
        for (let i = this.tocItems.length - 1; i >= 0; i--) {
            const item = this.tocItems[i];
            const elementTop = item.element.getBoundingClientRect().top + window.scrollY;
            
            if (scrollPosition >= elementTop) {
                currentActive = item.id;
                break;
            }
        }

        // Update active state
        if (currentActive !== this.activeSection) {
            this.activeSection = currentActive;
            
            // Remove previous active states
            this.tocContainer?.querySelectorAll('.toc-link').forEach(link => {
                link.classList.remove('active');
            });

            // Add active state to current section
            if (currentActive) {
                const activeLink = this.tocContainer?.querySelector(`[data-target="${currentActive}"]`);
                activeLink?.classList.add('active');
            }
        }
    }

    private scrollToSection(targetId: string): void {
        const target = document.getElementById(targetId);
        if (!target) return;

        this.isScrolling = true;
        
        const headerHeight = 80; // Account for fixed header
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;

        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });

        // Reset scrolling flag after animation
        setTimeout(() => {
            this.isScrolling = false;
        }, 1000);
    }

    // Public method to jump to specific section (can be called externally)
    public jumpToSection(sectionId: string): void {
        this.scrollToSection(sectionId);
    }
}

// Auto-initialize for devlog posts
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.devlog-post-main')) {
        new DevlogNavigation();
    }
});

export { DevlogNavigation }; 