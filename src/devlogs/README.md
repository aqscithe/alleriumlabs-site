# Devlog System

This directory contains markdown files for your monthly devlog entries. Each markdown file represents a devlog post that will be automatically displayed on your devlog page.

## How to Add a New Devlog Entry

1. Create a new markdown file in this directory with the naming convention: `YYYY-MM-title.md`
   - Example: `2025-02-audio-system.md`

2. Add frontmatter at the top of your markdown file:

```markdown
---
title: "Your Post Title"
date: "2025-02-15"
tags: ["Tag1", "Tag2", "Tag3"]
featured: true
image: "/img/your-image.png"
excerpt: "A brief description of what this post covers."
---
```

3. Write your content using standard markdown syntax

## Frontmatter Fields

- `title` (required): The title of your devlog entry
- `date` (required): Publication date in YYYY-MM-DD format
- `tags` (required): Array of tags to categorize your post
- `featured` (optional): Set to `true` to highlight this post
- `image` (optional): Path to a featured image for your post
- `excerpt` (required): A brief summary that appears on the devlog index page

## Markdown Features Supported

- Headers (# ## ###)
- Bold and italic text
- Lists (numbered and bullet points)
- Links
- Images
- Code blocks with syntax highlighting
- Tables
- Blockquotes

## File Organization

- Keep images in the `/public/img/` directory
- Reference images using absolute paths: `/img/your-image.png`
- Use descriptive filenames for your markdown files

## Example Post Structure

```markdown
---
title: "February 2025: Audio System Implementation"
date: "2025-02-15"
tags: ["Audio", "3D Sound", "Implementation"]
featured: true
image: "/img/audio-system-demo.png"
excerpt: "This month I focused on implementing the 3D spatial audio system for The Facility."
---

# February 2025: Audio System Implementation

This month was all about bringing The Facility to life with immersive audio...

## What I Accomplished

- Implemented 3D spatial audio
- Added dynamic soundscapes
- Created interactive audio triggers

## Technical Details

The audio system uses WebAudio API for...

```typescript
// Example code block
const audioContext = new AudioContext();
```

## Visual Progress

![Audio System Demo](/img/audio-system-demo.png)

## Next Month's Goals

- Implement reverb zones
- Add ambient sound layers
- Create audio mixing tools
```

## Tips for Great Devlog Posts

1. **Include visuals**: Screenshots, GIFs, diagrams help tell your story
2. **Show your process**: Include both successes and challenges
3. **Be technical when relevant**: Code snippets and technical details are valuable
4. **Document your decisions**: Explain why you chose certain approaches
5. **Keep it personal**: Your devlog should reflect your development journey

## Building and Viewing

After adding a new markdown file, your devlog will automatically appear on:
- `/devlog` - Main devlog index
- `/devlog/your-file-name` - Individual post page

Run `npm run dev` to see your changes locally. 