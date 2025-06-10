import { mat4, vec3 } from 'wgpu-matrix';
import { GUI } from 'dat.gui';

import particleWGSL from '../shaders/particle.wglsl?raw';
import probabilityMapWGSL from '../shaders/probabilityMap.wglsl?raw';

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
  console.log('WebGPU not supported, using fallback logo');
  
  // Hide the WebGPU canvas
  const canvas = document.getElementById('webgpu-canvas') as HTMLCanvasElement;
  if (canvas) {
    canvas.style.display = 'none';
  }
  
  // Create fallback logo container
  const fallbackContainer = document.createElement('div');
  fallbackContainer.id = 'fallback-logo';
  fallbackContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
    text-align: center;
  `;
  
  // Create logo image
  const logoImg = document.createElement('img');
  logoImg.src = '/img/Logo_Norm_res.png';
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
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    
    #fallback-logo {
      animation: fadeIn 1s ease-out;
    }
  `;
  
  document.head.appendChild(style);
  fallbackContainer.appendChild(logoImg);
  document.body.appendChild(fallbackContainer);
  
  // Add a subtle message about WebGPU
  const message = document.createElement('div');
  message.style.cssText = `
    margin-top: 20px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    font-family: 'Gilroy-Medium', sans-serif;
  `;
  message.textContent = 'For the best experience, try a WebGPU-enabled browser';
  fallbackContainer.appendChild(message);
}

// Simple WebGPU availability check
function quitIfWebGPUNotAvailable(adapter: GPUAdapter | null, device: GPUDevice | undefined): asserts device is GPUDevice {
    if (!adapter || !device) {
      throw new Error('WebGPU not available');
    }
}

async function init() {
    // Check WebGPU support first
    const webgpuSupported = await checkWebGPUSupport();
    if (!webgpuSupported) {
        createFallbackLogo();
        return;
    }

    const numParticles = 50000;
    const particlePositionOffset = 0;
    const particleColorOffset = 4 * 4;
    const particleInstanceByteSize =
      3 * 4 + // position
      1 * 4 + // lifetime
      4 * 4 + // color
      3 * 4 + // velocity
      1 * 4 + // padding
      0;

    const canvas = document.getElementById('webgpu-canvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error('Canvas not found!');
        createFallbackLogo();
        return;
    }
    
    const adapter = await navigator.gpu?.requestAdapter({
      featureLevel: 'compatibility',
    });
    const device = await adapter?.requestDevice();
    quitIfWebGPUNotAvailable(adapter, device);

    // After validation, we know device is not undefined
    const validDevice = device!;
    const context = canvas.getContext('webgpu') as GPUCanvasContext;

    const devicePixelRatio = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const presentationFormat = 'rgba16float';

    const simulationParams = {
      simulate: true,
      deltaTime: 0.04,
      toneMappingMode: 'extended' as GPUCanvasToneMappingMode,
      brightnessFactor: 0.9,
      logoScale: 1.0, // This will be calculated automatically
    };

    // Auto-calculate logoScale based on aspect ratio
    function calculateLogoScale(aspectRatio: number): number {
      // Reference points from user testing:
      // Square screen (aspect ≈ 1.0): logoScale = 2.3
      // Wide screen (aspect ≈ 1.547): logoScale = 3.6
      const squareAspect = 1.0;
      const squareScale = 2.3;
      const wideAspect = 1.547; // 3456/2234 from user's screen
      const wideScale = 3.6;
      
      // Linear interpolation between the reference points
      if (aspectRatio <= squareAspect) {
        return squareScale;
      } else if (aspectRatio >= wideAspect) {
        return wideScale;
      } else {
        // Interpolate between square and wide
        const t = (aspectRatio - squareAspect) / (wideAspect - squareAspect);
        return squareScale + t * (wideScale - squareScale);
      }
    }

    // Auto-calculate camera tilt based on aspect ratio
    function calculateCameraTilt(aspectRatio: number): number {
      // Base tilt for square screens
      const baseTilt = Math.PI * -0.2;
      // Increase tilt for wider screens to maintain perspective effect
      const extraTilt = (aspectRatio - 1.0) * 0.15; // Additional tilt per aspect ratio unit
      return baseTilt - extraTilt; // More negative = more tilt back
    }

    function configureContext() {
      context.configure({
        device: validDevice,
        format: presentationFormat,
        toneMapping: { mode: simulationParams.toneMappingMode },
      });
      hdrFolder.name = getHdrFolderName();
    }

    const particlesBuffer = validDevice.createBuffer({
      size: numParticles * particleInstanceByteSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
    });

    const renderPipeline = validDevice.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: validDevice.createShaderModule({
          code: particleWGSL,
        }),
        buffers: [
          {
            // instanced particles buffer
            arrayStride: particleInstanceByteSize,
            stepMode: 'instance',
            attributes: [
              {
                // position
                shaderLocation: 0,
                offset: particlePositionOffset,
                format: 'float32x3',
              },
              {
                // color
                shaderLocation: 1,
                offset: particleColorOffset,
                format: 'float32x4',
              },
            ],
          },
          {
            // quad vertex buffer
            arrayStride: 2 * 4, // vec2f
            stepMode: 'vertex',
            attributes: [
              {
                // vertex positions
                shaderLocation: 2,
                offset: 0,
                format: 'float32x2',
              },
            ],
          },
        ],
      },
      fragment: {
        module: validDevice.createShaderModule({
          code: particleWGSL,
        }),
        targets: [
          {
            format: presentationFormat,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'zero',
                dstFactor: 'one',
                operation: 'add',
              },
            },
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },

      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    });

    const depthTexture = validDevice.createTexture({
      size: [canvas.width, canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const uniformBufferSize =
      4 * 4 * 4 + // modelViewProjectionMatrix : mat4x4f
      3 * 4 + // right : vec3f
      4 + // padding
      3 * 4 + // up : vec3f
      4 + // padding
      0;
    const uniformBuffer = validDevice.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformBindGroup = validDevice.createBindGroup({
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
      ],
    });

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: null as any, // Assigned later
          clearValue: [0, 0, 0, 1],
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    };

    //////////////////////////////////////////////////////////////////////////////
    // Quad vertex buffer
    //////////////////////////////////////////////////////////////////////////////
    const quadVertexBuffer = validDevice.createBuffer({
      size: 6 * 2 * 4, // 6x vec2f
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    // prettier-ignore
    const vertexData = [
      -1.0, -1.0, +1.0, -1.0, -1.0, +1.0, -1.0, +1.0, +1.0, -1.0, +1.0, +1.0,
    ];
    new Float32Array(quadVertexBuffer.getMappedRange()).set(vertexData);
    quadVertexBuffer.unmap();

    //////////////////////////////////////////////////////////////////////////////
    // Texture
    //////////////////////////////////////////////////////////////////////////////
    const isPowerOf2 = (v: number) => Math.log2(v) % 1 === 0;
    const nextPowerOf2 = (v: number) => Math.pow(2, Math.ceil(Math.log2(v)));
    
    const response = await fetch('/img/Logo_Norm_res.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    
    // Calculate the target size (square, power of 2)
    const maxDimension = Math.max(imageBitmap.width, imageBitmap.height);
    const targetSize = nextPowerOf2(maxDimension);
    
    // Create a canvas to pad the image to square power-of-2 dimensions
    const canvas2d = document.createElement('canvas');
    canvas2d.width = targetSize;
    canvas2d.height = targetSize;
    const ctx = canvas2d.getContext('2d');
    
    if (!ctx) {
        throw new Error('Could not get 2D canvas context');
    }
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, targetSize, targetSize);
    
    // Center the original image in the new square canvas
    const offsetX = (targetSize - imageBitmap.width) / 2;
    const offsetY = (targetSize - imageBitmap.height) / 2;
    ctx.drawImage(imageBitmap, offsetX, offsetY);
    
    // Create a new ImageBitmap from the padded canvas
    const paddedImageBitmap = await createImageBitmap(canvas2d);
    
    console.log(`Original: ${imageBitmap.width}x${imageBitmap.height}, Padded: ${paddedImageBitmap.width}x${paddedImageBitmap.height}`);

    // Calculate number of mip levels required to generate the probability map
    const mipLevelCount =
      (Math.log2(Math.max(paddedImageBitmap.width, paddedImageBitmap.height)) + 1) | 0;
    const texture = validDevice.createTexture({
      size: [paddedImageBitmap.width, paddedImageBitmap.height, 1],
      mipLevelCount,
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    validDevice.queue.copyExternalImageToTexture(
      { source: paddedImageBitmap },
      { texture: texture },
      [paddedImageBitmap.width, paddedImageBitmap.height]
    );

    //////////////////////////////////////////////////////////////////////////////
    // Probability map generation
    // The 0'th mip level of texture holds the color data and spawn-probability in
    // the alpha channel. The mip levels 1..N are generated to hold spawn
    // probabilities up to the top 1x1 mip level.
    //////////////////////////////////////////////////////////////////////////////
    {
      const probabilityMapImportLevelPipeline = validDevice.createComputePipeline({
        layout: 'auto',
        compute: {
          module: validDevice.createShaderModule({ code: probabilityMapWGSL }),
          entryPoint: 'import_level',
        },
      });
      const probabilityMapExportLevelPipeline = validDevice.createComputePipeline({
        layout: 'auto',
        compute: {
          module: validDevice.createShaderModule({ code: probabilityMapWGSL }),
          entryPoint: 'export_level',
        },
      });

      const probabilityMapUBOBufferSize =
        1 * 4 + // stride
        3 * 4 + // padding
        0;
      const probabilityMapUBOBuffer = validDevice.createBuffer({
        size: probabilityMapUBOBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const buffer_a = validDevice.createBuffer({
        size: texture.width * texture.height * 4,
        usage: GPUBufferUsage.STORAGE,
      });
      const buffer_b = validDevice.createBuffer({
        size: buffer_a.size,
        usage: GPUBufferUsage.STORAGE,
      });
      validDevice.queue.writeBuffer(
        probabilityMapUBOBuffer,
        0,
        new Uint32Array([texture.width])
      );
      const commandEncoder = validDevice.createCommandEncoder();
      for (let level = 0; level < texture.mipLevelCount; level++) {
        const levelWidth = Math.max(1, texture.width >> level);
        const levelHeight = Math.max(1, texture.height >> level);
        const pipeline =
          level == 0
            ? probabilityMapImportLevelPipeline.getBindGroupLayout(0)
            : probabilityMapExportLevelPipeline.getBindGroupLayout(0);
        const probabilityMapBindGroup = validDevice.createBindGroup({
          layout: pipeline,
          entries: [
            {
              // ubo
              binding: 0,
              resource: { buffer: probabilityMapUBOBuffer },
            },
            {
              // buf_in
              binding: 1,
              resource: { buffer: level & 1 ? buffer_a : buffer_b },
            },
            {
              // buf_out
              binding: 2,
              resource: { buffer: level & 1 ? buffer_b : buffer_a },
            },
            {
              // tex_in / tex_out
              binding: 3,
              resource: texture.createView({
                format: 'rgba8unorm',
                dimension: '2d',
                baseMipLevel: level,
                mipLevelCount: 1,
              }),
            },
          ],
        });
        if (level == 0) {
          const passEncoder = commandEncoder.beginComputePass();
          passEncoder.setPipeline(probabilityMapImportLevelPipeline);
          passEncoder.setBindGroup(0, probabilityMapBindGroup);
          passEncoder.dispatchWorkgroups(Math.ceil(levelWidth / 64), levelHeight);
          passEncoder.end();
        } else {
          const passEncoder = commandEncoder.beginComputePass();
          passEncoder.setPipeline(probabilityMapExportLevelPipeline);
          passEncoder.setBindGroup(0, probabilityMapBindGroup);
          passEncoder.dispatchWorkgroups(Math.ceil(levelWidth / 64), levelHeight);
          passEncoder.end();
        }
      }
      validDevice.queue.submit([commandEncoder.finish()]);
    }

    //////////////////////////////////////////////////////////////////////////////
    // Simulation compute pipeline
    //////////////////////////////////////////////////////////////////////////////
    const simulationUBOBufferSize =
      1 * 4 + // deltaTime
      1 * 4 + // brightnessFactor
      1 * 4 + // aspectRatio
      1 * 4 + // logoScale
      4 * 4 + // seed
      0;
    const simulationUBOBuffer = validDevice.createBuffer({
      size: simulationUBOBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const gui = new GUI();
    gui.width = 325;
    gui.add(simulationParams, 'simulate');
    gui.add(simulationParams, 'deltaTime');
    const logoScaleController = gui.add(simulationParams, 'logoScale', 0.1, 5.0).listen();
    logoScaleController.domElement.style.pointerEvents = 'none'; // Make read-only
    const hdrFolder = gui.addFolder('');
    hdrFolder
      .add(simulationParams, 'toneMappingMode', ['standard', 'extended'])
      .onChange(configureContext);
    hdrFolder.add(simulationParams, 'brightnessFactor', 0, 4, 0.1);
    gui.close(); // Close the main GUI by default
    const hdrMediaQuery = window.matchMedia('(dynamic-range: high)');
    function getHdrFolderName() {
      if (!hdrMediaQuery.matches) {
        return "HDR settings ⚠️ Display isn't compatible";
      }
      if (!('getConfiguration' in GPUCanvasContext.prototype)) {
        return 'HDR settings';
      }
      const config = context.getConfiguration();
      if (
        simulationParams.toneMappingMode === 'extended' &&
        config && config.toneMapping && config.toneMapping.mode !== 'extended'
      ) {
        return "HDR settings ⚠️ Browser doesn't support HDR canvas";
      }
      return 'HDR settings';
    }
    hdrMediaQuery.onchange = () => {
      hdrFolder.name = getHdrFolderName();
    };

    const computePipeline = validDevice.createComputePipeline({
      layout: 'auto',
      compute: {
        module: validDevice.createShaderModule({
          code: particleWGSL,
        }),
        entryPoint: 'simulate',
      },
    });
    const computeBindGroup = validDevice.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: simulationUBOBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: particlesBuffer,
            offset: 0,
            size: numParticles * particleInstanceByteSize,
          },
        },
        {
          binding: 2,
          resource: texture.createView(),
        },
      ],
    });

    const aspect = canvas.width / canvas.height;
    const projection = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
    const view = mat4.create();
    const mvp = mat4.create();

    // Set initial logoScale based on current aspect ratio
    simulationParams.logoScale = calculateLogoScale(aspect);

    // Handle window resize
    function updateCanvasSize() {
      const devicePixelRatio = window.devicePixelRatio;
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      
      // Update projection matrix with new aspect ratio
      const newAspect = canvas.width / canvas.height;
      mat4.perspective((2 * Math.PI) / 5, newAspect, 1, 100.0, projection);
      
      // Update logoScale for new aspect ratio
      simulationParams.logoScale = calculateLogoScale(newAspect);
      
      // Update depth texture
      const newDepthTexture = validDevice.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      renderPassDescriptor.depthStencilAttachment!.view = newDepthTexture.createView();
    }

    window.addEventListener('resize', updateCanvasSize);

    function frame() {
      const currentAspect = canvas.width / canvas.height;
      validDevice.queue.writeBuffer(
        simulationUBOBuffer,
        0,
        new Float32Array([
          simulationParams.simulate ? simulationParams.deltaTime : 0.0,
          simulationParams.brightnessFactor,
          currentAspect,
          calculateLogoScale(currentAspect),
          Math.random() * 100,
          Math.random() * 100, // seed.xy
          1 + Math.random(),
          1 + Math.random(), // seed.zw
        ])
      );

      mat4.identity(view);
      mat4.translate(view, vec3.fromValues(0, 0, -3), view);
      mat4.rotateX(view, calculateCameraTilt(currentAspect), view);
      mat4.multiply(projection, view, mvp);

      // prettier-ignore
      validDevice.queue.writeBuffer(
        uniformBuffer,
        0,
        new Float32Array([
          // modelViewProjectionMatrix
          mvp[0], mvp[1], mvp[2], mvp[3],
          mvp[4], mvp[5], mvp[6], mvp[7],
          mvp[8], mvp[9], mvp[10], mvp[11],
          mvp[12], mvp[13], mvp[14], mvp[15],

          view[0], view[4], view[8], // right

          0, // padding

          view[1], view[5], view[9], // up

          0, // padding
        ])
      );
      const swapChainTexture = context.getCurrentTexture();
      // prettier-ignore
      (renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[])[0].view = swapChainTexture.createView();

      const commandEncoder = validDevice.createCommandEncoder();
      {
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline);
        passEncoder.setBindGroup(0, computeBindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(numParticles / 64));
        passEncoder.end();
      }
      {
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(renderPipeline);
        passEncoder.setBindGroup(0, uniformBindGroup);
        passEncoder.setVertexBuffer(0, particlesBuffer);
        passEncoder.setVertexBuffer(1, quadVertexBuffer);
        passEncoder.draw(6, numParticles, 0, 0);
        passEncoder.end();
      }

      validDevice.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(frame);
    }
    configureContext();
    requestAnimationFrame(frame);

    function assert(cond: boolean, msg = '') {
      if (!cond) {
        throw new Error(msg);
      }
    }
}

init().catch(console.error);
