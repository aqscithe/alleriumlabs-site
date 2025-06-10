/// <reference types="astro/client" />
/// <reference types="@webgpu/types" />

declare module '*.wglsl' {
  const content: string;
  export default content;
}

declare module '*.wglsl?raw' {
  const content: string;
  export default content;
} 