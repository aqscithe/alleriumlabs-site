// Starbursts Effect for Hero Section
interface Starburst {
  x: number;
  y: number;
  size: number;
  maxSize: number;
  age: number;
  maxAge: number;
  opacity: number;
  color: string;
  colorPhase: number;
  particles: Particle[];
  expanding: boolean;
  palette: string[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

class StarburstEffect {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private starbursts: Starburst[] = [];
  private animationId: number | null = null;
  private heroSection: HTMLElement | null = null;
  
  // Color palettes for different starburst types
  private colorPalettes = [
    // Blue to white to cyan
    ['#46b3e6', '#87ceeb', '#ffffff', '#00ffff', '#4169e1'],
    // Purple to pink to white
    ['#6e5da8', '#9370db', '#dda0dd', '#ffffff', '#ff69b4'],
    // Gold to orange to white
    ['#ffd700', '#ffa500', '#ffffff', '#ffff00', '#ff8c00'],
    // Green to lime to white
    ['#00ff00', '#32cd32', '#ffffff', '#90ee90', '#00fa9a'],
    // Red to orange to white
    ['#ff4500', '#ff6347', '#ffffff', '#ffff00', '#ff1493']
  ];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'starbursts-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
      pointer-events: none;
    `;
    
    this.ctx = this.canvas.getContext('2d')!;
    this.init();
  }

  private init() {
    this.heroSection = document.querySelector('.hero-section');
    if (!this.heroSection) {
      console.error('Hero section not found');
      return;
    }

    // Add canvas to body so it renders behind everything
    document.body.appendChild(this.canvas);
    
    this.resizeCanvas();
    this.setupEventListeners();
    this.startAnimation();
    
    // Create initial random starbursts
    this.scheduleRandomStarburst();
    
    // Create a test starburst immediately to verify canvas is working
    setTimeout(() => {
      const rect = this.heroSection!.getBoundingClientRect();
      this.createStarburst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }, 1000);
  }

  private resizeCanvas() {
    // Set canvas size for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    

  }

  private setupEventListeners() {
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Mouse click handler - only in hero section
    document.addEventListener('click', (e) => {
      if (!this.heroSection) return;
      
      const rect = this.heroSection.getBoundingClientRect();
      
      // Check if click is within hero section (using viewport coordinates)
      if (e.clientY >= rect.top && e.clientY <= rect.bottom && 
          e.clientX >= rect.left && e.clientX <= rect.right) {
        this.createStarburst(e.clientX, e.clientY);
      }
    });
  }

  private createStarburst(x: number, y: number) {
    const palette = this.colorPalettes[Math.floor(Math.random() * this.colorPalettes.length)];
    const maxSize = 50 + Math.random() * 100;
    const maxAge = 120 + Math.random() * 60;
    
    const starburst: Starburst = {
      x,
      y,
      size: 0,
      maxSize,
      age: 0,
      maxAge,
      opacity: 1,
      color: palette[0],
      colorPhase: 0,
      particles: [],
      expanding: true,
      palette: palette
    };

    // Create particles for the starburst
    const particleCount = 20 + Math.random() * 30;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      const particle: Particle = {
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1 + Math.random() * 3,
        opacity: 1,
        color: palette[0]
      };
      starburst.particles.push(particle);
    }

    this.starbursts.push(starburst);
  }

  private scheduleRandomStarburst() {
    if (!this.heroSection) return;
    
    const delay = 3000 + Math.random() * 7000; // Random delay between 3-10 seconds
    
    setTimeout(() => {
      const rect = this.heroSection!.getBoundingClientRect();
      
      // Only create if hero section is visible in viewport
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        const x = rect.left + Math.random() * rect.width;
        const y = rect.top + Math.random() * rect.height;
        this.createStarburst(x, y);
      }
      
      this.scheduleRandomStarburst(); // Schedule next one
    }, delay);
  }

  private updateStarburst(starburst: Starburst) {
    starburst.age++;
    
    // Color transition based on age using the starburst's own palette
    const colorIndex = Math.floor((starburst.age / starburst.maxAge) * (starburst.palette.length - 1));
    starburst.color = starburst.palette[Math.min(colorIndex, starburst.palette.length - 1)];
    
    // Size expansion and contraction
    const ageRatio = starburst.age / starburst.maxAge;
    if (ageRatio < 0.3) {
      // Expanding phase
      starburst.size = starburst.maxSize * (ageRatio / 0.3);
    } else if (ageRatio < 0.7) {
      // Stable phase
      starburst.size = starburst.maxSize;
    } else {
      // Contracting phase
      const contractRatio = (ageRatio - 0.7) / 0.3;
      starburst.size = Math.max(0, starburst.maxSize * (1 - contractRatio));
    }
    
    // Opacity fade
    if (ageRatio > 0.8) {
      starburst.opacity = 1 - ((ageRatio - 0.8) / 0.2);
    }
    
    // Update particles
    starburst.particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.98; // Slow down
      particle.vy *= 0.98;
      particle.opacity = starburst.opacity;
      particle.color = starburst.color;
    });
  }

  private drawStarburst(starburst: Starburst) {
    // Skip drawing if size is too small or invalid
    if (starburst.size <= 0 || starburst.opacity <= 0) {
      return;
    }
    

    
    this.ctx.save();
    this.ctx.globalAlpha = starburst.opacity;
    
    // Draw main starburst core
    const gradient = this.ctx.createRadialGradient(
      starburst.x, starburst.y, 0,
      starburst.x, starburst.y, starburst.size
    );
    gradient.addColorStop(0, starburst.color);
    gradient.addColorStop(0.5, starburst.color + '80');
    gradient.addColorStop(1, starburst.color + '00');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(starburst.x, starburst.y, starburst.size, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw particles
    starburst.particles.forEach(particle => {
      // Skip drawing if particle is too small or transparent
      if (particle.size <= 0 || particle.opacity <= 0) {
        return;
      }
      
      this.ctx.save();
      this.ctx.globalAlpha = particle.opacity * 0.8;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
    
    this.ctx.restore();
  }

  private animate() {
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    
    // Update and draw starbursts
    this.starbursts = this.starbursts.filter(starburst => {
      if (starburst.age >= starburst.maxAge) {
        return false;
      }
      
      this.updateStarburst(starburst);
      this.drawStarburst(starburst);
      return true;
    });
    


    
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private startAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    

    
    this.animate();
  }

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// Initialize starbursts effect when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    new StarburstEffect();
  } catch (error) {
    console.error('Error initializing starbursts:', error);
  }
});

// Fallback initialization in case DOM is already loaded
if (document.readyState !== 'loading') {
  try {
    new StarburstEffect();
  } catch (error) {
    console.error('Error initializing starbursts:', error);
  }
} 