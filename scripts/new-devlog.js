#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function createDevlogEntry() {
  console.log('🚀 Creating a new devlog entry...\n');

  const title = await ask('📝 Post title: ');
  const date = await ask(`📅 Date (YYYY-MM-DD) [${formatDate(new Date())}]: `);
  const tags = await ask('🏷️  Tags (comma-separated): ');
  const excerpt = await ask('📄 Brief excerpt: ');
  const image = await ask('🖼️  Featured image path (optional): ');
  const featured = await ask('⭐ Featured post? (y/n) [n]: ');

  const postDate = date || formatDate(new Date());
  const postTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  const isFeatured = featured.toLowerCase() === 'y' || featured.toLowerCase() === 'yes';

  const slug = slugify(title);
  const filename = `${postDate}-${slug}.md`;
  const filepath = path.join(__dirname, '..', 'src', 'devlogs', filename);

  const template = `---
title: "${title}"
date: "${postDate}"
tags: [${postTags.map(tag => `"${tag}"`).join(', ')}]
featured: ${isFeatured}${image ? `\nimage: "${image}"` : ''}
excerpt: "${excerpt}"
---

# ${title}

${excerpt}

## What I Accomplished This Month

- 
- 
- 

## Technical Highlights

### 

## Visual Progress

<!-- Add your screenshots, GIFs, or diagrams here -->

## Challenges & Solutions

### Challenge: 

**Problem**: 

**Solution**: 

**Result**: 

## Next Month's Goals

- 
- 
- 

## Resources & References

- 

---

*Thanks for reading! Feel free to reach out with questions or feedback about the development process.*
`;

  try {
    fs.writeFileSync(filepath, template);
    console.log(`\n✅ Successfully created devlog entry: ${filename}`);
    console.log(`📁 File location: ${filepath}`);
    console.log(`🌐 Will be available at: /devlog/${postDate}-${slug}`);
    console.log(`\n📝 You can now edit the file and add your content!`);
  } catch (error) {
    console.error('❌ Error creating devlog entry:', error.message);
  }

  rl.close();
}

createDevlogEntry(); 