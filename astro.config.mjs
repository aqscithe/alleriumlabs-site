// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
    output: 'static',
    integrations: [mdx()],
    markdown: {
        shikiConfig: {
            theme: 'material-theme-darker',
            wrap: true,
        },
    },
});
