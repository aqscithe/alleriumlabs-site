import { mat4, vec3 } from 'wgpu-matrix';
import { GUI } from 'dat.gui';

import particleWGSL from '../shaders/particle.wglsl?raw';
import probabilityMapWGSL from '../shaders/probabilityMap.wglsl?raw';

// Logo fade functionality - runs independently of WebGPU
function initLogoFade() {
  function handleLogoFade() {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const fadeStart = windowHeight * 0.7; // Start fading at 70% of viewport height
    const fadeEnd = windowHeight; // Fully faded at 100% of viewport height
    
    let opacity = 1;
    if (scrollY > fadeStart) {
      if (scrollY >= fadeEnd) {
        opacity = 0;
      } else {
        // Linear fade from 1 to 0
        opacity = 1 - (scrollY - fadeStart) / (fadeEnd - fadeStart);
      }
    }
    
    // Apply to WebGPU canvas
    const canvas = document.getElementById('webgpu-canvas') as HTMLCanvasElement;
    if (canvas) {
      canvas.style.opacity = opacity.toString();
    }
    
    // Apply to fallback logo
    const fallbackLogo = document.getElementById('fallback-logo');
    if (fallbackLogo) {
      (fallbackLogo as HTMLElement).style.opacity = opacity.toString();
    }
  }

  // Add scroll listener
  window.addEventListener('scroll', handleLogoFade);
  
  // Initial call to set correct opacity
  handleLogoFade();
}

// WebGPU support detection and fallback
async function checkWebGPUSupport(): Promise<boolean> {
  if (!navigator.gpu) {
    return false;
  }
  
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return false;
    }
    
    const device = await adapter.requestDevice();
    return !!device;
  } catch (error) {
    console.warn('WebGPU not supported:', error);
    return false;
  }
}

function createFallbackLogo() {
  console.log('Using fallback logo');
  
  // Find the hero content div to place the logo
  const heroContent = document.querySelector('.hero-content');
  if (!heroContent) {
    console.error('Hero content section not found');
    return;
  }
  
  // Create fallback logo container
  const fallbackContainer = document.createElement('div');
  fallbackContainer.id = 'fallback-logo';
  fallbackContainer.style.cssText = `
    text-align: center;
  `;
  
  // Create logo image
  const logoImg = document.createElement('img');
  logoImg.src = '/img/Logo_High_White_text.png';
  logoImg.alt = 'Allerium Labs Logo';
  logoImg.style.cssText = `
    max-width: 400px;
    max-height: 300px;
    width: auto;
    height: auto;
    filter: drop-shadow(0 0 20px rgba(70, 179, 230, 0.6));
    animation: logoFloat 3s ease-in-out infinite;
  `;
  
  // Create subtle animation with CSS keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes logoFloat {
      0%, 100% { 
        transform: translateY(0px) scale(1);
        filter: drop-shadow(0 0 20px rgba(70, 179, 230, 0.6));
      }
      50% { 
        transform: translateY(-10px) scale(1.02);
        filter: drop-shadow(0 0 30px rgba(70, 179, 230, 0.8));
      }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }
    
    #fallback-logo {
      animation: fadeIn 1s ease-out;
    }
  `;
  
  document.head.appendChild(style);
  fallbackContainer.appendChild(logoImg);
  heroContent.appendChild(fallbackContainer);
}

// Simple WebGPU availability check
function quitIfWebGPUNotAvailable(adapter: GPUAdapter | null, device: GPUDevice | undefined): asserts device is GPUDevice {
    if (!adapter || !device) {
      throw new Error('WebGPU not available');
    }
}

async function init() {
    // Always use fallback logo for now
    createFallbackLogo();
}

// Initialize logo fade functionality first
initLogoFade();

// Then initialize WebGPU or fallback
init().catch(console.error);
