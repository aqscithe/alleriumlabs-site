// Enhanced Devlog Navigation System
interface TocItem {
    id: string;
    text: string;
    level: number;
    element: HTMLElement;
}

interface MobileElements {
    trigger: HTMLElement;
    overlay: HTMLElement;
    drawer: HTMLElement;
    close: HTMLElement;
}

class DevlogNavigation {
    private tocItems: TocItem[] = [];
    private activeSection: string = '';
    private progressBar!: HTMLElement;
    private tocContainer!: HTMLElement;
    private mobileElements!: MobileElements;
    private isScrolling = false;
    private isMobile = false;
    private resizeObserver?: ResizeObserver;
    private intersectionObserver?: IntersectionObserver;

    constructor() {
        console.log('[DevlogNavigation] Enhanced navigation initializing...');
        this.detectMobile();
        this.init();
        this.setupResizeHandler();
    }

    private detectMobile(): void {
        this.isMobile = window.innerWidth <= 768;
    }

    private init(): void {
        console.log('[DevlogNavigation] Initializing components...');
        this.createProgressBar();
        this.generateTableOfContents();
        this.setupScrollHandlers();
        this.setupIntersectionObserver();
        this.setupMobileNavigation();
        this.highlightActiveSection();
    }

    private createProgressBar(): void {
        console.log('[DevlogNavigation] Creating progress bar');
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'reading-progress';
        this.progressBar.innerHTML = '<div class="reading-progress-fill"></div>';
        document.body.appendChild(this.progressBar);
    }

    private generateTableOfContents(): void {
        console.log('[DevlogNavigation] Generating TOC');
        const prose = document.querySelector('.prose');
        if (!prose) {
            console.warn('[DevlogNavigation] .prose not found');
            return;
        }

        const headings = prose.querySelectorAll('h1, h2, h3, h4, h5, h6') as NodeListOf<HTMLElement>;
        console.log(`[DevlogNavigation] Found ${headings.length} headings`);
        if (headings.length === 0) {
            console.warn('[DevlogNavigation] No headings found in .prose');
            return;
        }

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
            console.log(`[DevlogNavigation] Heading: ${heading.tagName} - ${heading.textContent} (id: ${id})`);
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
        if (this.tocItems.length === 0) {
            console.warn('[DevlogNavigation] No TOC items to create UI for');
            return;
        }

        // Create desktop TOC container
        this.tocContainer = document.createElement('nav');
        this.tocContainer.className = 'table-of-contents';
        this.tocContainer.innerHTML = `
            <div class="toc-header">
                <h3 class="toc-title">Contents</h3>
            </div>
            <div class="toc-content">
                <ul class="toc-list">
                    ${this.generateTocHTML()}
                </ul>
            </div>
        `;

        // Insert TOC in the content wrapper
        const contentWrapper = document.querySelector('.content-wrapper');
        if (contentWrapper) {
            contentWrapper.appendChild(this.tocContainer);
            console.log('[DevlogNavigation] Desktop TOC inserted into content wrapper');
        } else {
            console.warn('[DevlogNavigation] .content-wrapper not found');
        }

        // Add click handlers for TOC links
        this.setupTocClickHandlers(this.tocContainer);
    }

    private generateTocHTML(): string {
        return this.tocItems.map(item => `
            <li class="toc-item toc-level-${item.level}">
                <a href="#${item.id}" class="toc-link" data-target="${item.id}">
                    ${this.escapeHtml(item.text)}
                </a>
            </li>
        `).join('');
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private setupTocClickHandlers(container: HTMLElement): void {
        container.querySelectorAll('.toc-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const target = (e.target as HTMLElement).closest('.toc-link') as HTMLElement;
                const targetId = target?.getAttribute('data-target') || target?.getAttribute('href')?.substring(1);
                
                console.log('[DevlogNavigation] TOC link clicked:', targetId);
                
                if (targetId) {
                    this.scrollToSection(targetId);
                    if (this.isMobile && this.mobileElements?.drawer?.classList.contains('show')) {
                        this.closeMobileDrawer();
                    }
                } else {
                    console.warn('[DevlogNavigation] No target ID found for clicked link');
                }
            });
        });
    }



    private setupScrollHandlers(): void {
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.updateReadingProgress();
                    this.updateTocVisibility();
                    ticking = false;
                });
                ticking = true;
            }
        });
        
        // Check initial visibility on load
        setTimeout(() => {
            this.updateTocVisibility();
        }, 100);
    }

    private setupIntersectionObserver(): void {
        if (!('IntersectionObserver' in window)) {
            console.warn('[DevlogNavigation] IntersectionObserver not supported, falling back to scroll handler');
            this.setupFallbackScrollHandler();
            return;
        }

        const options = {
            root: null,
            rootMargin: '-80px 0px -50% 0px',
            threshold: 0
        };

        this.intersectionObserver = new IntersectionObserver((entries) => {
            if (this.isScrolling) return;

            let visibleSections: Array<{id: string, top: number}> = [];

            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const rect = entry.target.getBoundingClientRect();
                    visibleSections.push({
                        id: entry.target.id,
                        top: rect.top
                    });
                }
            });

            if (visibleSections.length > 0) {
                // Sort by distance from top
                visibleSections.sort((a, b) => Math.abs(a.top) - Math.abs(b.top));
                this.setActiveSection(visibleSections[0].id);
            }
        }, options);

        // Observe all headings
        this.tocItems.forEach(item => {
            this.intersectionObserver!.observe(item.element);
        });
    }

    private setupFallbackScrollHandler(): void {
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.highlightActiveSection();
                    this.updateTocVisibility();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    private setupResizeHandler(): void {
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(() => {
                const wasMobile = this.isMobile;
                this.detectMobile();
                if (wasMobile !== this.isMobile) {
                    console.log(`[DevlogNavigation] Screen size changed: mobile=${this.isMobile}`);
                    this.handleResponsiveChange();
                }
            });
            this.resizeObserver.observe(document.documentElement);
            return;
        }
        
        // Fallback for browsers without ResizeObserver
        const handleResize = () => {
            const wasMobile = this.isMobile;
            this.detectMobile();
            if (wasMobile !== this.isMobile) {
                this.handleResponsiveChange();
            }
        };
        (window as Window).addEventListener('resize', handleResize);
    }

    private handleResponsiveChange(): void {
        // Handle responsive breakpoint changes
        if (this.isMobile && this.mobileElements?.drawer?.classList.contains('show')) {
            this.closeMobileDrawer();
        }
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

    private updateTocVisibility(): void {
        if (!this.tocContainer || this.isMobile) return;

        const contentSection = document.querySelector('.devlog-post-content') as HTMLElement;
        if (!contentSection) return;

        // Get the position where the content starts
        const contentRect = contentSection.getBoundingClientRect();
        const contentTop = contentRect.top + window.scrollY;
        const currentScroll = window.scrollY;
        
        // Show TOC when we've scrolled past the header to the content
        // Add some buffer (50px) so it doesn't flicker
        const showThreshold = contentTop - 50;
        const shouldShow = currentScroll >= showThreshold;

        const isCurrentlyVisible = this.tocContainer.classList.contains('toc-visible');
        
        if (shouldShow && !isCurrentlyVisible) {
            this.tocContainer.classList.add('toc-visible');
            console.log('[DevlogNavigation] TOC shown');
        } else if (!shouldShow && isCurrentlyVisible) {
            this.tocContainer.classList.remove('toc-visible');
            console.log('[DevlogNavigation] TOC hidden');
        }
    }

    private highlightActiveSection(): void {
        if (this.isScrolling) return;

        let currentActive = '';
        const scrollPosition = window.scrollY + 120; // Increased offset for better UX

        // Find the current section
        for (let i = this.tocItems.length - 1; i >= 0; i--) {
            const item = this.tocItems[i];
            const elementTop = item.element.getBoundingClientRect().top + window.scrollY;
            
            if (scrollPosition >= elementTop) {
                currentActive = item.id;
                break;
            }
        }

        this.setActiveSection(currentActive);
    }

    private setActiveSection(sectionId: string): void {
        if (sectionId === this.activeSection) return;

        this.activeSection = sectionId;
        
        // Update desktop TOC
        this.updateTocActiveState(this.tocContainer, sectionId);
        
        // Update mobile TOC if it exists
        if (this.mobileElements?.drawer) {
            this.updateTocActiveState(this.mobileElements.drawer, sectionId);
        }
        
        console.log(`[DevlogNavigation] Active section: ${sectionId}`);
    }

    private updateTocActiveState(container: HTMLElement | null, activeId: string): void {
        if (!container) return;

        // Remove previous active states
        container.querySelectorAll('.toc-link').forEach(link => {
            link.classList.remove('active');
        });

        // Add active state to current section
        if (activeId) {
            const activeLink = container.querySelector(`[data-target="${activeId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
                // Scroll the TOC to show the active item
                this.scrollTocToActiveItem(activeLink as HTMLElement, container);
            }
        }
    }

    private scrollTocToActiveItem(activeLink: HTMLElement, container: HTMLElement): void {
        const tocContent = container.querySelector('.toc-content') as HTMLElement;
        if (!tocContent) return;

        const containerRect = tocContent.getBoundingClientRect();
        const linkRect = activeLink.getBoundingClientRect();
        
        // Check if the active link is outside the visible area
        if (linkRect.top < containerRect.top || linkRect.bottom > containerRect.bottom) {
            const scrollTop = activeLink.offsetTop - tocContent.offsetTop - (tocContent.clientHeight / 2);
            tocContent.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
            });
        }
    }

    private scrollToSection(targetId: string): void {
        console.log(`[DevlogNavigation] Scrolling to section: ${targetId}`);
        
        const target = document.getElementById(targetId);
        if (!target) {
            console.warn(`[DevlogNavigation] Target element not found: ${targetId}`);
            return;
        }

        this.isScrolling = true;
        
        const headerHeight = 100; // Account for fixed header and spacing
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;

        // Use the native scrollTo with smooth behavior for the best user experience
        window.scrollTo({
            top: Math.max(0, targetPosition),
            behavior: 'smooth'
        });

        // Reset scrolling flag after animation
        setTimeout(() => {
            this.isScrolling = false;
            console.log(`[DevlogNavigation] Scrolled to: ${targetId}`);
        }, 800);
    }

    private setupMobileNavigation(): void {
        if (!this.isMobile && this.tocItems.length === 0) return;

        this.createMobileElements();
        this.setupMobileEventHandlers();
    }

    private createMobileElements(): void {
        // Create mobile trigger button
        const trigger = document.createElement('button');
        trigger.className = 'toc-mobile-trigger';
        trigger.setAttribute('aria-label', 'Open table of contents');
        trigger.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        `;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'toc-mobile-overlay';

        // Create drawer
        const drawer = document.createElement('div');
        drawer.className = 'toc-mobile-drawer';
        drawer.innerHTML = `
            <div class="toc-mobile-header">
                <h3 class="toc-title">Contents</h3>
                <button class="toc-mobile-close" aria-label="Close table of contents">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="toc-content">
                <ul class="toc-list">
                    ${this.generateTocHTML()}
                </ul>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(trigger);
        document.body.appendChild(overlay);
        document.body.appendChild(drawer);

        // Store references
        this.mobileElements = {
            trigger,
            overlay,
            drawer,
            close: drawer.querySelector('.toc-mobile-close') as HTMLElement
        };

        // Add click handlers for mobile TOC
        this.setupTocClickHandlers(drawer);
    }

    private setupMobileEventHandlers(): void {
        if (!this.mobileElements) return;

        // Trigger button
        this.mobileElements.trigger.addEventListener('click', () => {
            this.openMobileDrawer();
        });

        // Close button
        this.mobileElements.close.addEventListener('click', () => {
            this.closeMobileDrawer();
        });

        // Overlay click
        this.mobileElements.overlay.addEventListener('click', () => {
            this.closeMobileDrawer();
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.mobileElements.drawer.classList.contains('show')) {
                this.closeMobileDrawer();
            }
        });
    }

    private openMobileDrawer(): void {
        if (!this.mobileElements) return;

        this.mobileElements.overlay.classList.add('show');
        this.mobileElements.drawer.classList.add('show');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        console.log('[DevlogNavigation] Mobile drawer opened');
    }

    private closeMobileDrawer(): void {
        if (!this.mobileElements) return;

        this.mobileElements.overlay.classList.remove('show');
        this.mobileElements.drawer.classList.remove('show');
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        console.log('[DevlogNavigation] Mobile drawer closed');
    }

    // Public method to jump to specific section (can be called externally)
    public jumpToSection(sectionId: string): void {
        this.scrollToSection(sectionId);
    }

    // Cleanup method
    public destroy(): void {
        this.intersectionObserver?.disconnect();
        this.resizeObserver?.disconnect();
        
        // Remove mobile elements
        if (this.mobileElements) {
            this.mobileElements.trigger.remove();
            this.mobileElements.overlay.remove();
            this.mobileElements.drawer.remove();
        }
        
        console.log('[DevlogNavigation] Navigation destroyed');
    }
}

export { DevlogNavigation }; 