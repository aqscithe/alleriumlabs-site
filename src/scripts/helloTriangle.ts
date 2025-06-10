import triangleVertWGSL from '../shaders/triangle.vert.wglsl?raw';
import redFragWGSL from '../shaders/red.frag.wglsl?raw';

// Simple WebGPU availability check
function quitIfWebGPUNotAvailable(adapter: GPUAdapter | null, device: GPUDevice | undefined): asserts device is GPUDevice {
  if (!adapter || !device) {
    throw new Error('WebGPU not available');
  }
}

async function init() {
  const canvas = document.getElementById('webgpu-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found!');
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
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device: validDevice,
    format: presentationFormat,
  });

  const pipeline = validDevice.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: validDevice.createShaderModule({
        code: triangleVertWGSL,
      }),
    },
    fragment: {
      module: validDevice.createShaderModule({
        code: redFragWGSL,
      }),
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  function frame() {
    const commandEncoder = validDevice.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: [0, 0, 0, 0], // Clear to transparent
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.draw(3);
    passEncoder.end();

    validDevice.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

init().catch(console.error);
