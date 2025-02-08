#!/usr/bin/env node

/**
 * build.js
 * 
 * This script processes all Markdown files in the '_posts/' directory,
 * extracts their metadata and content, and generates a static 'index.html'
 * that concatenates all posts in reverse chronological order with embedded
 * JSON‑LD structured data for each post.
 */

import fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { fileURLToPath } from 'url';

// Define __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory containing Markdown posts
const postsDirectory = path.join(__dirname, '_posts');

// Path to the output index.html
const outputPath = path.join(__dirname, 'index.html');

/**
 * Function to read and process all Markdown files
 */
function getAllPosts() {
    console.log('Reading Markdown files from _posts directory...');
    const filenames = fs.readdirSync(postsDirectory);
    console.log(`Found ${filenames.length} Markdown file(s).`);
    const posts = filenames
        .filter(filename => filename.endsWith('.md'))
        .map(filename => {
            const filePath = path.join(postsDirectory, filename);
            console.log(`Processing file: ${filename}`);
            const fileContents = fs.readFileSync(filePath, 'utf8');
            const { data, content } = matter(fileContents);
            
            // Validate front matter
            if (!data.title || !data.author || !data.date || !data.tags) {
                console.error(`Post "${filename}" is missing required metadata.`);
                process.exit(1);
            }
            
            if (!Array.isArray(data.tags)) {
                console.warn(`Post "${data.title}" has invalid tags format. Expected an array. Converting to an empty array.`);
            }

            // Ensure tags are strings and do not exceed five
            const validTags = Array.isArray(data.tags) ? data.tags.slice(0, 5).map(tag => tag.toString()) : [];
            if (Array.isArray(data.tags) && data.tags.length > 5) {
                console.warn(`Post "${data.title}" has more than 5 tags. Only the first 5 will be included.`);
            }

            console.log(`Extracted metadata: Title="${data.title}", Author="${data.author}", Date="${data.date}", Tags=${JSON.stringify(validTags)}`);
            return {
                title: data.title,
                author: data.author,
                date: data.date,
                tags: validTags,
                content: marked.parse(content), // Ensure correct usage
            };
        })
        // Sort posts by date in descending order
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log('All posts have been processed and sorted.');
    return posts;
}

/**
 * Function to generate JSON‑LD structured data for a post
 * @param {Object} post - The post object containing metadata
 * @returns {string} - JSON‑LD script as a string
 */
function generateJSONLD(post) {
    const jsonld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title.replace(/"/g, '\\"'),
        "author": post.author.replace(/"/g, '\\"'),
        "datePublished": post.date,
        "keywords": post.tags.join(',') // Correctly joining tags with commas
    };
    const jsonldString = JSON.stringify(jsonld, null, 2);
    console.log(`Generated JSON-LD for "${post.title}":\n${jsonldString}`);
    return `<script type="application/ld+json">\n${jsonldString}\n</script>`;
}

/**
 * Function to generate the full HTML for all posts
 * @param {Array} posts - Array of post objects
 * @returns {string} - HTML string containing all posts
 */
function generatePostsHTML(posts) {
    console.log('Generating HTML for all posts...');
    const postsHTML = posts.map(post => {
        return `
        <article>
            <header>
                <h2>${post.title}</h2>
                <p>By ${post.author} on ${post.date}</p>
                <p>Tags: ${post.tags.join(', ')}</p>
            </header>
            ${generateJSONLD(post)}
            <section>
                ${post.content}
            </section>
        </article>
        <hr>
        `;
    }).join('\n');
    console.log('All posts have been converted to HTML.');
    return postsHTML;
}

/**
 * Function to generate the complete index.html content
 * @param {string} postsHTML - HTML string containing all posts
 * @returns {string} - Complete HTML for index.html
 */
function generateIndexHTML(postsHTML) {
    console.log('Generating complete index.html...');
    const fullHTML = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My Static Blog</title>
        <link rel="stylesheet" href="styles.css">
    </head>
    <body>
        <header>
            <h1>My Static Blog</h1>
        </header>
        <main>
            <!-- Blog Posts -->
            <!-- Each blog post is inserted here in reverse chronological order -->
            ${postsHTML}
        </main>
        <footer>
            <p>&copy; ${new Date().getFullYear()} My Static Blog</p>
        </footer>
    </body>
    </html>`;
    console.log('index.html has been generated successfully.');
    return fullHTML;
}

/**
 * Main function to build the static site
 */
function buildSite() {
    try {
        const posts = getAllPosts();
        const postsHTML = generatePostsHTML(posts);
        const fullHTML = generateIndexHTML(postsHTML);
        fs.writeFileSync(outputPath, fullHTML, 'utf8');
        console.log('index.html has been written to the filesystem.');
    } catch (error) {
        console.error('Error generating index.html:', error);
        process.exit(1);
    }
}

// Execute the build
buildSite();
