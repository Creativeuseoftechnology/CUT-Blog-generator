import React, { useState, useMemo, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { RichTextEditor } from './components/RichTextEditor';
import { SeoScorecard } from './components/SeoScorecard';
import { analyzeImageContent, generateBlogContent, modifyBlogContent, getKeywordSuggestions, getIntentSuggestions, generateSocialMediaStrategy } from './services/geminiService';
import { analyzeContent } from './utils/seoAnalyzer';
import { fetchSiteProducts, fetchPageContent } from './utils/sitemapService';
import { AppStatus, GeneratedBlog, ImageData, KeywordSuggestion, ProductEntry, ContentFramework, SocialMediaStrategy, SocialPost, SeoAnalysis } from './types';
import { Sparkles, Target, Search, FileText, Lightbulb, ArrowRight, Bot, ShoppingBag, MessageSquarePlus, RefreshCw, Plus, Tag, X, Copy, ClipboardCheck, Globe, SearchCheck, Database, PenTool, Video, Download, Image as ImageIcon, LayoutTemplate, Share2, Linkedin, Instagram, Facebook, Check, Compass, Sliders, ChevronDown, PanelRightOpen, PanelRightClose, Gauge } from 'lucide-react';

// --- STYLE CONSTANT (Moved outside component for global access) ---
const BLOG_CSS = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;700&family=Open+Sans:wght@400;600&display=swap');
      
      #cuot-blog-wrapper {
        font-family: 'Open Sans', sans-serif;
        color: #575756; /* PMS 425 C (Body text grey) */
        line-height: 1.6;
        max-width: 1000px;
        margin: 0 auto;
      }
      /* Headings */
      #cuot-blog-wrapper h2, 
      #cuot-blog-wrapper h3 {
        font-family: 'Comfortaa', cursive;
        color: #ec7b5d; /* PMS 2434 C (Orange) */
        font-weight: 700;
        margin-bottom: 0.5em;
      }
      #cuot-blog-wrapper h2 { font-size: 1.8rem; margin-top: 1.5em; scroll-margin-top: 100px; }
      #cuot-blog-wrapper h3 { font-size: 1.4rem; margin-top: 1.2em; }
      
      #cuot-blog-wrapper p { margin-bottom: 1em; }
      
      /* Keyword Highlighting */
      .cuot-keyword { color: #ec7b5d; font-weight: 700; }
      
      #cuot-blog-wrapper strong { color: #ec7b5d; font-weight: 600; }
      #cuot-blog-wrapper ul { margin-bottom: 1em; padding-left: 1.5em; list-style-type: disc; }
      #cuot-blog-wrapper li { margin-bottom: 0.5em; }

      /* Zero-Click Snippet (Featured Snippet Bait) */
      .cuot-snippet {
          background-color: #fdf6f4;
          border-left: 5px solid #ec7b5d;
          padding: 1rem 1.5rem;
          margin-bottom: 1.5rem;
          font-weight: 600;
          color: #575756;
          border-radius: 0 8px 8px 0;
      }

      /* Semantic Entity List (Knowledge Graph) */
      .cuot-entity-list dl {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 1rem 2rem;
          background: #fff;
          border: 1px solid #eee;
          padding: 2rem;
          border-radius: 12px;
          margin: 2rem 0;
      }
      .cuot-entity-list dt {
          font-family: 'Comfortaa', cursive;
          font-weight: 700;
          color: #ec7b5d;
      }
      .cuot-entity-list dd {
          margin: 0;
          color: #666;
          font-size: 0.95rem;
      }

      /* Layout Utilities */
      .cuot-section { margin-bottom: 2.5rem; clear: both; }
      .cuot-grid { display: flex; flex-wrap: wrap; gap: 3rem; align-items: center; }
      .cuot-col { flex: 1 1 300px; }
      
      /* Images */
      /* Content images are restricted in size so they don't compete with header */
      .cuot-img-responsive { 
          width: 100%; 
          max-width: 100%; 
          height: auto; 
          border-radius: 12px; /* Smooth rounded corners as per screenshot */
          box-shadow: 0 4px 12px rgba(0,0,0,0.08); 
          display: block;
          transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease; /* Hover animation */
      }
      
      .cuot-img-responsive:hover {
          transform: scale(1.015); /* Subtle zoom */
          box-shadow: 0 12px 24px rgba(0,0,0,0.12); /* Deeper shadow */
      }
      
      /* Header image is the ONLY one allowed to be massive/heroic */
      .cuot-header-image { 
          width: 100%; 
          height: auto; 
          max-height: 500px;
          object-fit: cover;
          border-radius: 12px; 
          box-shadow: 0 6px 16px rgba(0,0,0,0.12); 
          display: block; 
          margin-bottom: 2rem;
          transition: transform 0.5s ease, box-shadow 0.5s ease;
      }
      
      .cuot-header-image:hover {
          transform: translateY(-2px); /* Slight lift */
          box-shadow: 0 15px 30px rgba(0,0,0,0.15);
      }
      
      /* FAQ Section - Improved Design for SEO & GEO (Details/Summary) */
      .cuot-faq-container { 
          background: #fdf6f4; /* Brand Light */
          border-radius: 16px; 
          padding: 3rem; 
          margin-top: 4rem; 
      }
      
      details.cuot-faq-item {
          background: white;
          margin-bottom: 1rem; 
          border-radius: 8px;
          padding: 1rem 1.5rem;
          box-shadow: 0 2px 5px rgba(0,0,0,0.03);
          border-left: 4px solid #ec7b5d; /* Orange accent */
          transition: all 0.3s ease;
      }
      
      details.cuot-faq-item[open] {
          box-shadow: 0 6px 12px rgba(236, 123, 93, 0.1);
          padding-bottom: 1.5rem;
      }

      summary.cuot-faq-question {
          font-family: 'Comfortaa', cursive; 
          color: #ec7b5d; 
          font-weight: 700; 
          font-size: 1.1rem; 
          cursor: pointer;
          list-style: none; /* Hide default triangle */
          display: flex;
          justify-content: space-between;
          align-items: center;
          outline: none;
      }
      
      /* Chrome/Safari marker hide */
      summary.cuot-faq-question::-webkit-details-marker {
          display: none;
      }

      /* Custom Plus Icon using CSS */
      summary.cuot-faq-question::after {
          content: '+';
          font-size: 1.5rem;
          font-weight: 300;
          color: #ec7b5d;
          transition: transform 0.3s ease;
      }
      
      details[open] summary.cuot-faq-question::after {
          transform: rotate(45deg);
      }

      .cuot-faq-answer { 
          font-size: 0.95rem; 
          color: #666; 
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px dashed #eee;
          line-height: 1.7;
      }

      /* Responsive Video Container */
      .cuot-video-container {
        position: relative;
        padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
        height: 0;
        overflow: hidden;
        max-width: 100%;
        background: #000;
        border-radius: 12px;
        margin: 2rem auto;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .cuot-video-container iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 0;
      }

      /* Buttons / CTA - Exact Match to Screenshot + Wrapper for spacing */
      .cuot-btn-wrapper {
        margin-top: 3rem; /* Generous space above button */
        margin-bottom: 2rem;
        clear: both; /* Ensures it drops below floats */
      }
      
      .cuot-btn {
        display: inline-block; 
        background-color: #ec7b5d; /* Brand Orange */
        color: #ffffff !important;
        font-family: 'Comfortaa', cursive; /* Match font in screenshot */
        font-weight: 700;
        font-size: 1rem;
        padding: 12px 32px; 
        border-radius: 8px; /* Slightly rounded */
        text-decoration: none;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        box-shadow: 0 4px 10px rgba(236, 123, 93, 0.25);
        text-align: center;
        border: 2px solid transparent;
      }
      .cuot-btn:hover { 
        background-color: #d66a4d; 
        transform: translateY(-2px) scale(1.02); 
        box-shadow: 0 8px 20px rgba(236, 123, 93, 0.4); 
      }
      
      /* Table of Contents */
      .cuot-toc {
          background-color: #fff;
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          display: inline-block;
          min-width: 250px;
          transition: box-shadow 0.3s ease;
      }
      .cuot-toc:hover {
          box-shadow: 0 6px 12px rgba(0,0,0,0.05);
      }
      .cuot-toc-title {
          font-family: 'Comfortaa', cursive;
          color: #ec7b5d;
          font-weight: 700;
          margin-bottom: 0.5rem;
          display: block;
      }
      .cuot-toc-list {
          list-style: none !important;
          padding-left: 0 !important;
          margin-bottom: 0 !important;
      }
      .cuot-toc-list li {
          margin-bottom: 0.25rem !important;
      }
      .cuot-toc-list a {
          text-decoration: none;
          color: #575756;
          font-size: 0.95rem;
          border-bottom: 1px dotted transparent;
          transition: all 0.2s;
      }
      .cuot-toc-list a:hover {
          color: #ec7b5d;
          border-bottom-color: #ec7b5d;
          padding-left: 4px; /* Small nudge right */
      }

      /* Feature Highlight Box */
      .cuot-feature-highlight {
          background-color: #fdf6f4;
          border-left: 6px solid #ec7b5d;
          padding: 2rem;
          border-radius: 0 12px 12px 0;
          margin: 2rem 0;
      }
      
      /* Quote Block */
      .cuot-quote-block {
          text-align: center;
          margin: 3rem 0;
          padding: 2rem;
      }
      .cuot-quote-text {
          font-family: 'Comfortaa', cursive;
          font-size: 1.4rem;
          font-weight: 700;
          color: #ec7b5d;
          line-height: 1.4;
          margin-bottom: 1rem;
      }
      .cuot-quote-author {
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #888;
      }

      /* Specific Section Styles */
      .cuot-cta-block {
        background-color: #fdf6f4; /* Light Brand BG */
        padding: 3rem;
        border-radius: 16px;
        text-align: center;
        border: 2px solid #fff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        transition: transform 0.3s ease;
      }
      .cuot-cta-block:hover {
         transform: translateY(-2px);
         box-shadow: 0 8px 20px rgba(0,0,0,0.08);
      }
      
      @media (max-width: 768px) {
        .cuot-grid { flex-direction: column; }
        .cuot-entity-list dl { grid-template-columns: 1fr; gap: 0.5rem; }
        .cuot-btn { width: 100%; box-sizing: border-box; } /* Full width on mobile */
      }
    </style>
  `;

export default function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [activeTab, setActiveTab] = useState<'editor' | 'social' | 'seo'>('editor');
  
  const [keywords, setKeywords] = useState('');
  const [userIntent, setUserIntent] = useState('');
  const [framework, setFramework] = useState<ContentFramework>('auto');
  const [extraInstructions, setExtraInstructions] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  
  // AI Settings
  const [aiTemperature, setAiTemperature] = useState(0.3);
  const [aiTopP, setAiTopP] = useState(0.95);
  
  // New: Auto generate social posts option
  const [autoGenerateSocial, setAutoGenerateSocial] = useState(false);
  
  // Product & Sitemap State
  const [sitemapUrl, setSitemapUrl] = useState('https://creativeuseoftechnology.com/sitemap_index.xml');
  const [availableProducts, setAvailableProducts] = useState<ProductEntry[]>([]);
  const [isLoadingSitemap, setIsLoadingSitemap] = useState(false);
  const [sitemapError, setSitemapError] = useState('');
  
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<ProductEntry[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  // Image State
  const [headerImage, setHeaderImage] = useState<ImageData[]>([]); // Array of 1 for reusability
  const [contentImages, setContentImages] = useState<ImageData[]>([]);
  
  // Editor State
  const [editorContent, setEditorContent] = useState('');
  const [generatedBlogData, setGeneratedBlogData] = useState<GeneratedBlog | null>(null);
  const [seoAnalysis, setSeoAnalysis] = useState<SeoAnalysis | null>(null);
  
  // Social Media State
  const [socialStrategy, setSocialStrategy] = useState<SocialMediaStrategy | null>(null);
  
  const [progressMessage, setProgressMessage] = useState('');
  const [modificationPrompt, setModificationPrompt] = useState('');
  
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const [intentSuggestions, setIntentSuggestions] = useState<string[]>([]);
  const [isLoadingIntents, setIsLoadingIntents] = useState(false);

  const [copiedHtml, setCopiedHtml] = useState(false);

  // --- EFFECT: Real-time SEO Analysis ---
  useEffect(() => {
    // Simple debounce via timeout
    const timer = setTimeout(() => {
        if (editorContent) {
            const analysis = analyzeContent(editorContent, keywords);
            setSeoAnalysis(analysis);
        } else {
            setSeoAnalysis(null);
        }
    }, 800); // Wait 800ms after last typing

    return () => clearTimeout(timer);
  }, [editorContent, keywords]);

  const handleFetchSitemap = async () => {
    setIsLoadingSitemap(true);
    setSitemapError('');
    try {
        const products = await fetchSiteProducts(sitemapUrl);
        if (products.length === 0) {
            setSitemapError('Geen items gevonden. Controleer de URL.');
        } else {
            setAvailableProducts(products);
        }
    } catch (e) {
        setSitemapError('Kon sitemap niet laden. Mogelijk blokkeert de server de proxy.');
    } finally {
        setIsLoadingSitemap(false);
    }
  };

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    const term = productSearch.toLowerCase();
    return availableProducts.filter(p => 
      (p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)) && 
      !selectedProducts.find(sp => sp.url === p.url)
    ).slice(0, 10);
  }, [productSearch, selectedProducts, availableProducts]);

  const handleAddProduct = (product: ProductEntry) => {
    setSelectedProducts([...selectedProducts, product]);
    setProductSearch('');
    setShowProductSuggestions(false);
  };

  const handleRemoveProduct = (url: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.url !== url));
  };

  // --- VIDEO PARSER ---
  const parseVideo = (url: string): { type: 'youtube' | 'vimeo', id: string, thumb?: string, link?: string } | null => {
    if (!url) return null;
    // YouTube
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (ytMatch && ytMatch[1]) {
      return { 
          type: 'youtube', 
          id: ytMatch[1],
          thumb: `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`, // Try maxres first for better quality
          link: `https://www.youtube.com/watch?v=${ytMatch[1]}`
      };
    }
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return { 
          type: 'vimeo', 
          id: vimeoMatch[1],
          // Vimeo thumb requires API, skipping for basic implementation or using generic
          link: `https://vimeo.com/${vimeoMatch[1]}`
      };
    }
    return null;
  };

  // --- HELPER: Highlight Keywords ---
  const highlightKeywords = (text: string, keywordsStr: string | undefined) => {
      if (!text) return "";
      
      // Step 1: Clean Markdown bolding (**) from the AI output completely
      // This prevents the issue where the AI writes "**keyword**" and we wrap it again
      let cleanText = text.replace(/\*\*/g, '');

      if (!keywordsStr) return cleanText;
      
      // Split keywords by comma, trim, and sort by length desc to match longest phrases first
      const keys = keywordsStr.split(',').map(k => k.trim()).filter(k => k.length > 2).sort((a, b) => b.length - a.length);
      
      let highlightedText = cleanText;
      
      // Use a placeholder strategy to avoid re-replacing inside HTML tags or already replaced tags
      keys.forEach((key) => {
          const regex = new RegExp(`(${key})`, 'gi');
          highlightedText = highlightedText.replace(regex, '<strong class="cuot-keyword">$1</strong>');
      });
      return highlightedText;
  };

  // --- PROFESSIONAL HTML GENERATOR ENGINE ---
  const convertToHtmlString = (blog: GeneratedBlog, currentContentImages: ImageData[], currentHeaderImage: ImageData | null, videoInputUrl: string, inputKeywords: string) => {
      let html = BLOG_CSS;

      // 1. BRAND STYLE WRAPPER START
      html += `<div id="cuot-blog-wrapper">`;

      // 2. META DATA
      html += `<!-- 
         POST TITLE: ${blog.title} 
         META DESC: ${blog.metaDescription}
         KEYWORDS: ${blog.keywordsUsed?.join(', ')}
         STRATEGY: ${blog.geoStrategy}
      -->`;

      // 3. HEADER SECTION WITH HERO IMAGE
      html += `<header class="cuot-section">`;
      html += `<p style="font-style: italic; color: #888; margin-bottom: 1.5rem;">${blog.metaDescription}</p>`;
      
      // Header Image Injection
      if (currentHeaderImage) {
          const src = `data:${currentHeaderImage.mimeType};base64,${currentHeaderImage.base64}`;
          const alt = blog.headerImageAlt || blog.title || "Creative Use of Technology Header";
          html += `<img src="${src}" alt="${alt}" title="${alt}" class="cuot-header-image" width="1200" height="600" />`;
      }
      
      html += `</header>`;

      // Prepare Video Embed (Responsive Iframe)
      const videoInfo = parseVideo(videoInputUrl);
      let videoHtml = '';
      
      if (videoInfo) {
          // --- SEO RICH RESULTS VIDEO OBJECT ---
          // This ensures Google understands the video context, separate from the iframe
          const videoSchema = {
             "@context": "https://schema.org",
             "@type": "VideoObject",
             "name": `Video: ${blog.title}`, // Fallback title based on blog
             "description": `Video over ${blog.keywordsUsed?.join(', ') || blog.title}. ${blog.metaDescription}`,
             "thumbnailUrl": videoInfo.thumb || "https://creativeuseoftechnology.com/wp-content/uploads/placeholder-video.jpg",
             "uploadDate": new Date().toISOString(), // Required field. Using current date as 'content generated' date.
             "embedUrl": videoInfo.type === 'youtube' ? `https://www.youtube.com/embed/${videoInfo.id}` : `https://player.vimeo.com/video/${videoInfo.id}`,
             "contentUrl": videoInfo.link
          };
          
          // Inject Schema
          html += `<script type="application/ld+json">${JSON.stringify(videoSchema)}</script>`;

          if (videoInfo.type === 'youtube') {
              // Use srcdoc for YouTube to force thumbnail loading (Lite Embed Pattern)
              const thumb = videoInfo.thumb || `https://img.youtube.com/vi/${videoInfo.id}/hqdefault.jpg`;
              videoHtml = `
              <div class="cuot-video-container">
                 <iframe 
                    src="https://www.youtube.com/embed/${videoInfo.id}" 
                    srcdoc="<style>*{padding:0;margin:0;overflow:hidden}html,body{height:100%}img,span{position:absolute;width:100%;top:0;bottom:0;margin:auto}span{height:1.5em;text-align:center;font:48px/1.5 sans-serif;color:white;text-shadow:0 0 0.5em black}</style><a href=https://www.youtube.com/embed/${videoInfo.id}?autoplay=1><img src=${thumb} alt='Video'><span>▶</span></a>"
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    loading="lazy"
                 ></iframe>
              </div>`;
          } else if (videoInfo.type === 'vimeo') {
               videoHtml = `
               <div class="cuot-video-container">
                  <iframe 
                    src="https://player.vimeo.com/video/${videoInfo.id}" 
                    title="Vimeo video player" 
                    frameborder="0" 
                    allow="autoplay; fullscreen" 
                    allowfullscreen
                    loading="lazy"
                  ></iframe>
               </div>`;
          }
      }

      // --- NEW: TABLE OF CONTENTS GENERATOR ---
      // We collect headings from sections to build a TOC
      // Only include headings that actually exist
      const sections = blog.sections || [];
      const tocItems = sections
          .map((s, idx) => ({ heading: s.heading, id: `section-${idx}` }))
          .filter(item => item.heading && item.heading.length > 0);

      // 4. DYNAMIC SECTIONS
      sections.forEach((section, idx) => {
          const imageKey = idx.toString();
          const imgData = currentContentImages[idx];
          const hasImage = blog.imageAltMap && blog.imageAltMap[imageKey] && imgData;
          const sectionId = `section-${idx}`;
          
          let imageHtml = '';
          if (hasImage) {
             const src = `data:${imgData.mimeType};base64,${imgData.base64}`;
             const alt = blog.imageAltMap[imageKey] || "Creative Use of Technology";
             imageHtml = `<img src="${src}" alt="${alt}" title="${alt}" class="cuot-img-responsive" width="600" height="400" loading="lazy" />`;
          }

          let ctaHtml = '';
          if (section.ctaText && section.ctaUrl) {
              // Wrapped in div for safe spacing
              ctaHtml = `<div class="cuot-btn-wrapper"><a href="${section.ctaUrl}" class="cuot-btn">${section.ctaText}</a></div>`;
          }

          // Apply Keyword Highlighting
          const processedContent = highlightKeywords(section.content, inputKeywords);
          
          // Zero-Click Snippet
          let snippetHtml = '';
          if (section.snippet) {
              snippetHtml = `<div class="cuot-snippet">${section.snippet}</div>`;
          }

          html += `<section class="cuot-section" id="${sectionId}">`;

          // Inject TOC after the FIRST text block (Hero/Intro) but before the rest
          if (idx === 0 && tocItems.length > 1) {
              html += `${section.heading ? `<h2>${section.heading}</h2>` : ''}`;
              
              // If hero has image, float it
              if (hasImage && section.layout === 'hero') {
                 html += `<div style="margin-bottom: 1.5rem; float: right; margin-left: 2rem; max-width: 40%;">${imageHtml}</div>`;
              }
              
              html += snippetHtml;
              html += `${processedContent}`;
              
              // TOC INJECTION
              html += `
              <div class="cuot-toc">
                 <span class="cuot-toc-title">Inhoudsopgave</span>
                 <ul class="cuot-toc-list">
                    ${tocItems.slice(1).map(item => `<li><a href="#${item.id}">${item.heading}</a></li>`).join('')}
                    <li><a href="#entity-section">Kernbegrippen</a></li>
                    <li><a href="#faq-section">Veelgestelde Vragen</a></li>
                 </ul>
              </div>
              `;
              
              html += `${ctaHtml}`;
          } else {
              // Inject video after the first section (standard logic)
              if (idx === 1 && videoHtml) {
                 html += videoHtml;
              }

              switch (section.layout) {
                  case 'feature_highlight':
                      html += `
                      <div class="cuot-feature-highlight">
                         ${section.heading ? `<h3>${section.heading}</h3>` : ''}
                         ${snippetHtml}
                         ${processedContent}
                      </div>`;
                      break;

                  case 'quote_block':
                      html += `
                      <div class="cuot-quote-block">
                          <div class="cuot-quote-text">“${processedContent.replace(/"/g, '')}”</div>
                          ${section.heading ? `<div class="cuot-quote-author">- ${section.heading}</div>` : ''}
                      </div>`;
                      break;

                  case 'two_column_image_right':
                      if (hasImage) {
                          html += `
                          <div class="cuot-grid">
                            <div class="cuot-col">
                               ${section.heading ? `<h2>${section.heading}</h2>` : ''}
                               ${snippetHtml}
                               ${processedContent}
                               ${ctaHtml}
                            </div>
                            <div class="cuot-col">
                               ${imageHtml}
                            </div>
                          </div>`;
                      } else {
                          html += `${section.heading ? `<h2>${section.heading}</h2>` : ''}${snippetHtml}${processedContent}${ctaHtml}`;
                      }
                      break;

                  case 'two_column_image_left':
                      if (hasImage) {
                          html += `
                          <div class="cuot-grid">
                            <div class="cuot-col">
                               ${imageHtml}
                            </div>
                            <div class="cuot-col">
                               ${section.heading ? `<h2>${section.heading}</h2>` : ''}
                               ${snippetHtml}
                               ${processedContent}
                               ${ctaHtml}
                            </div>
                          </div>`;
                      } else {
                           html += `${section.heading ? `<h2>${section.heading}</h2>` : ''}${snippetHtml}${processedContent}${ctaHtml}`;
                      }
                      break;

                  case 'cta_block':
                      html += `
                      <div class="cuot-cta-block">
                         ${section.heading ? `<h2>${section.heading}</h2>` : ''}
                         ${snippetHtml}
                         ${processedContent}
                         ${ctaHtml}
                      </div>`;
                      break;

                  case 'full_width':
                  case 'hero':
                  default:
                      html += `${section.heading ? `<h2>${section.heading}</h2>` : ''}`;
                      if (hasImage) {
                           html += `<div style="margin-bottom: 1.5rem; float: right; margin-left: 2rem; max-width: 40%;">${imageHtml}</div>`;
                      }
                      html += snippetHtml;
                      html += `${processedContent} ${ctaHtml}`;
                      break;
              }
          }

          html += `</section>`;
      });

      // 4.5 NEW: SEMANTIC ENTITY SECTION (Knowledge Graph Optimization)
      if (blog.semanticEntities && blog.semanticEntities.length > 0) {
          html += `
          <section class="cuot-section cuot-entity-list" id="entity-section">
             <h2 style="margin-bottom: 1rem;">Kernbegrippen & Definities</h2>
             <dl>
                ${blog.semanticEntities.map(e => `
                   <dt>${e.concept}</dt>
                   <dd>${e.definition}</dd>
                `).join('')}
             </dl>
          </section>
          `;
      }

      // 5. FAQ SECTION + SCHEMA
      if (blog.faq && blog.faq.length > 0) {
          // --- UPDATED FOR GEO & SEO: Semantic HTML5 Details/Summary Tags ---
          // Using <details> and <summary> is standard for FAQs and understood by Google.
          // We also add inline Schema Microdata (itemscope/itemprop) as a fallback/reinforcement to JSON-LD.
          html += `
          <section class="cuot-section cuot-faq-container" id="faq-section" itemscope itemtype="https://schema.org/FAQPage">
             <h2 style="margin-bottom: 2rem; text-align: center;">Veelgestelde Vragen</h2>
             ${blog.faq.map(item => `
               <details class="cuot-faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                 <summary class="cuot-faq-question" itemprop="name">${item.question}</summary>
                 <div class="cuot-faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                    <div itemprop="text">
                        ${highlightKeywords(item.answer, inputKeywords)}
                    </div>
                 </div>
               </details>
             `).join('')}
          </section>
          `;

          // Keep JSON-LD for maximum compatibility (Google prefers JSON-LD, but semantic HTML helps accessibility)
          const faqSchema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": blog.faq.map(item => ({
              "@type": "Question",
              "name": item.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer
              }
            }))
          };
          html += `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`;
      }
      
      // --- NEW: SCHEMA MARKUP (Article / Product / Review) ---
      // This is the AI generated schema string
      if (blog.schemaMarkup) {
          html += `<script type="application/ld+json">${blog.schemaMarkup}</script>`;
      }
      
      // --- NEW: BREADCRUMB SCHEMA (SEO OPTIMIZATION) ---
      // Adds invisible structure data for Google
      const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [{
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://creativeuseoftechnology.com/"
        },{
          "@type": "ListItem",
          "position": 2,
          "name": "Blog",
          "item": "https://creativeuseoftechnology.com/blog/"
        },{
          "@type": "ListItem",
          "position": 3,
          "name": blog.title
        }]
      };
      html += `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`;

      html += `</div>`; // Close wrapper
      return html;
  };

  const handleGenerate = async () => {
    if (!keywords || !userIntent) {
      alert("Vul alstublieft zoekwoorden en de hoofdvraag/intentie in.");
      return;
    }

    try {
      // 1. Analyze Images
      setStatus(AppStatus.ANALYZING_IMAGES);
      
      // Analyze Header Image
      let headerImageAnalysis = "Geen header foto.";
      if (headerImage.length > 0) {
          setProgressMessage("Header foto analyseren...");
          headerImageAnalysis = await analyzeImageContent(headerImage[0].base64, headerImage[0].mimeType);
      }

      // Analyze Content Images
      setProgressMessage("Content foto's analyseren...");
      const analyzedImageContexts: string[] = [];
      for (const img of contentImages) {
        const description = await analyzeImageContent(img.base64, img.mimeType);
        analyzedImageContexts.push(description);
      }

      // 2. Fetch Product Details (Scraping)
      let productDetails: string[] = [];
      if (selectedProducts.length > 0) {
        setStatus(AppStatus.ANALYZING_IMAGES); 
        setProgressMessage(`Details ophalen van ${selectedProducts.length} items van de website...`);
        try {
           const promises = selectedProducts.map(p => fetchPageContent(p.url));
           productDetails = await Promise.all(promises);
        } catch (err) {
           console.error("Failed scraping product details", err);
        }
      }

      // 3. Generate Blog
      setStatus(AppStatus.GENERATING_TEXT);
      setProgressMessage("Professionele HTML blog layout opbouwen...");

      const blogData = await generateBlogContent(
        keywords, 
        userIntent, 
        selectedProducts,
        analyzedImageContexts,
        headerImageAnalysis,
        productDetails,
        extraInstructions,
        framework,
        { temperature: aiTemperature, topP: aiTopP } // Pass new AI settings
      );
      
      setGeneratedBlogData(blogData);
      
      // Auto Generate Social Logic
      if (autoGenerateSocial) {
         setStatus(AppStatus.GENERATING_SOCIAL);
         setProgressMessage("Blog is klaar! Nu social media posts schrijven...");
         try {
             const strategy = await generateSocialMediaStrategy(blogData);
             setSocialStrategy(strategy);
         } catch(e) {
             console.error("Failed auto social generation", e);
             setSocialStrategy(null);
         }
      } else {
         setSocialStrategy(null);
      }
      
      setActiveTab('editor'); // Always start at editor
      
      // Convert to HTML string for the editor (pass video url)
      const initialHtml = convertToHtmlString(blogData, contentImages, headerImage[0] || null, videoUrl, keywords);
      setEditorContent(initialHtml);

      setStatus(AppStatus.COMPLETED);

    } catch (e) {
      console.error(e);
      setStatus(AppStatus.ERROR);
      setProgressMessage("Er is iets misgegaan. Controleer de console.");
    }
  };

  const handleGenerateSocial = async () => {
    if (!generatedBlogData) return;
    
    try {
      setStatus(AppStatus.GENERATING_SOCIAL);
      setProgressMessage("Social media posts schrijven voor LinkedIn, IG, FB & Pinterest...");
      
      const strategy = await generateSocialMediaStrategy(generatedBlogData);
      setSocialStrategy(strategy);
      
      setStatus(AppStatus.COMPLETED);
    } catch (e) {
      console.error(e);
      setStatus(AppStatus.ERROR);
      setProgressMessage("Kon social posts niet genereren.");
    }
  };

  const handleModification = async () => {
    if (!generatedBlogData || !modificationPrompt.trim()) return;

    try {
      setStatus(AppStatus.MODIFYING_TEXT);
      setProgressMessage("AI past de tekststructuur aan...");
      const updatedBlog = await modifyBlogContent(generatedBlogData, modificationPrompt);
      setGeneratedBlogData(updatedBlog);
      
      // Re-render HTML with new text but KEEP existing images and video
      const newHtml = convertToHtmlString(updatedBlog, contentImages, headerImage[0] || null, videoUrl, keywords);
      setEditorContent(newHtml);
      
      setModificationPrompt('');
      setStatus(AppStatus.COMPLETED);
    } catch (e) {
      console.error(e);
      setStatus(AppStatus.ERROR);
      setProgressMessage("Fout bij aanpassen. Probeer het opnieuw.");
    }
  };

  const handleGetSuggestions = async () => {
    if (!keywords.trim()) {
      alert("Vul eerst een basis onderwerp in.");
      return;
    }
    setIsLoadingSuggestions(true);
    setSuggestions([]);
    try {
      // Pass the current keywords to filter them out
      const sugs = await getKeywordSuggestions(keywords);
      setSuggestions(sugs);
    } catch (e) { console.error(e); } 
    finally { setIsLoadingSuggestions(false); }
  };

  const handleGetIntentSuggestions = async () => {
      if (!keywords.trim()) {
        alert("Vul eerst een onderwerp/zoekwoord in om vragen te genereren.");
        return;
      }
      setIsLoadingIntents(true);
      setIntentSuggestions([]);
      try {
        const intents = await getIntentSuggestions(keywords);
        setIntentSuggestions(intents);
      } catch (e) { console.error(e); }
      finally { setIsLoadingIntents(false); }
  };

  const addSuggestion = (suggestion: string) => {
    const newKeywords = keywords ? `${keywords}, ${suggestion}` : suggestion;
    setKeywords(newKeywords);
    setSuggestions(suggestions.filter(s => s.keyword !== suggestion));
  };

  const prepareCompleteHtml = () => {
     if (!editorContent) return "";
     
     const title = generatedBlogData?.title || "Blog Post";
     const description = generatedBlogData?.metaDescription || "";
     const keywordsStr = generatedBlogData?.keywordsUsed?.join(', ') || "";
     const canonicalUrl = generatedBlogData?.canonicalUrl || "https://creativeuseoftechnology.com/blog/";

     // Remove existing style block from content to place it in head
     const bodyContent = editorContent.replace(BLOG_CSS, '');

     return `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${keywordsStr}">
    <link rel="canonical" href="${canonicalUrl}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    ${BLOG_CSS}
</head>
<body>
    ${bodyContent}
</body>
</html>`;
  };

  const handleCopyHtml = () => {
    // For copy to clipboard, we just copy the body fragment + styles because users likely paste into a CMS body field
    // But we check if style is missing
    let htmlToCopy = editorContent;
    if (!htmlToCopy.includes('<style>')) {
         htmlToCopy = BLOG_CSS + htmlToCopy;
    }

    if (!htmlToCopy) return;

    navigator.clipboard.writeText(htmlToCopy);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleDownloadHtml = () => {
    // For download, we provide the FULL VALID DOC
    const htmlToSave = prepareCompleteHtml();
    if (!htmlToSave) return;
    
    // Create a Blob from the HTML String
    const blob = new Blob([htmlToSave], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Create link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuot-blog-${keywords.replace(/\s+/g, '-').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderSocialCard = (platform: string, content: SocialPost | undefined, Icon: any, colorClass: string) => {
    if (!content) return null;

    return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className={`p-4 border-b border-slate-100 flex items-center justify-between ${colorClass} bg-opacity-10`}>
             <div className="flex items-center gap-2 font-display font-bold text-slate-700">
                 <Icon className={colorClass.replace('bg-', 'text-')} size={20} />
                 <span className="capitalize">{platform}</span>
             </div>
             <button 
                onClick={() => navigator.clipboard.writeText(`${content.caption || ''}\n\n${(content.hashtags || []).join(' ')}`)}
                className="text-xs bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
             >
                 <Copy size={12} /> Kopieer
             </button>
        </div>
        <div className="p-4 space-y-4">
            <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Caption</label>
                <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1 leading-relaxed">{content.caption || 'Geen tekst gegenereerd.'}</p>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Hashtags</label>
                <div className="flex flex-wrap gap-1 mt-1">
                    {(content.hashtags || []).map((tag: string, i: number) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">#{tag.replace('#','')}</span>
                    ))}
                </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex gap-2 items-start">
                 <ImageIcon size={16} className="text-brand-orange mt-0.5" />
                 <div>
                    <span className="text-xs font-bold text-brand-grey block">Visuele Suggestie:</span>
                    <span className="text-xs text-slate-500 italic">{content.visualSuggestion || 'Geen suggestie.'}</span>
                 </div>
            </div>
        </div>
    </div>
  )};

  return (
    <div className="min-h-screen bg-slate-50 text-brand-grey font-body pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <div className="relative w-8 h-8">
                    <div className="absolute inset-0 bg-brand-grey rounded-full opacity-20"></div>
                    <div className="absolute inset-0 m-1 bg-brand-orange rounded-full"></div>
                </div>
                <div className="leading-tight">
                    <h1 className="text-xl font-display font-bold text-brand-grey">Creative <span className="text-sm font-normal">use of</span></h1>
                    <h1 className="text-xl font-display font-bold text-brand-grey -mt-1">Technology</h1>
                </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1 bg-brand-light text-brand-orange rounded-full border border-brand-orange/20">
            <Bot size={14} />
            <span>AI Blog Editor</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2 text-brand-grey">
              <FileText className="text-brand-orange" size={20} />
              Configuratie
            </h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-bold text-brand-grey">
                    Onderwerp / Zoekwoorden
                  </label>
                  <button 
                    onClick={handleGetSuggestions}
                    disabled={isLoadingSuggestions}
                    className="text-xs text-brand-orange hover:text-[#d66a4d] font-bold flex items-center gap-1 bg-brand-light px-2 py-1 rounded-full transition-colors"
                  >
                    {isLoadingSuggestions ? <RefreshCw className="animate-spin" size={10} /> : <Sparkles size={10} />}
                    Nieuwe AI Suggesties
                  </button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all"
                    placeholder="bijv. lasersnijden hout"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                  />
                </div>
                 {/* Suggestions Panel */}
                {suggestions.length > 0 && (
                  <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Aanbevolen (Hoog Volume):</p>
                    <div className="flex flex-col gap-2">
                      {suggestions.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 p-2 rounded hover:border-brand-orange/30 transition-colors group cursor-pointer" onClick={() => addSuggestion(s.keyword)}>
                          <span className="text-sm text-brand-grey">{s.keyword}</span>
                          <Plus size={14} className="text-slate-300" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-bold text-brand-grey">
                    Klantvraag (User Intent)
                  </label>
                  <button 
                    onClick={handleGetIntentSuggestions}
                    disabled={isLoadingIntents}
                    className="text-xs text-brand-orange hover:text-[#d66a4d] font-bold flex items-center gap-1 bg-brand-light px-2 py-1 rounded-full transition-colors"
                  >
                    {isLoadingIntents ? <RefreshCw className="animate-spin" size={10} /> : <Compass size={10} />}
                    GEO Suggesties
                  </button>
                </div>
                <div className="relative">
                  <Target className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all"
                    placeholder="bijv. Waarom hout graveren?"
                    value={userIntent}
                    onChange={(e) => setUserIntent(e.target.value)}
                  />
                </div>
                
                {/* Intent Suggestions Panel */}
                {intentSuggestions.length > 0 && (
                  <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">SEO & GEO (AI) Vragen:</p>
                    <div className="flex flex-col gap-2">
                      {intentSuggestions.map((intent, idx) => (
                        <div 
                           key={idx} 
                           className="flex items-center justify-between bg-white border border-slate-100 p-2 rounded hover:border-brand-orange/30 transition-colors group cursor-pointer" 
                           onClick={() => { setUserIntent(intent); setIntentSuggestions([]); }}
                        >
                          <span className="text-sm text-brand-grey">{intent}</span>
                          <ArrowRight size={14} className="text-slate-300 group-hover:text-brand-orange" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

               {/* FRAMEWORK SELECTOR */}
               <div>
                <label className="block text-sm font-bold text-brand-grey mb-1">
                  Blog Strategie / Framework
                </label>
                <div className="relative">
                  <LayoutTemplate className="absolute left-3 top-3 text-slate-400" size={16} />
                  <select 
                    value={framework}
                    onChange={(e) => setFramework(e.target.value as ContentFramework)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all appearance-none bg-white text-sm cursor-pointer"
                  >
                      <option value="auto">🤖 AI kiest automatisch (Aanbevolen)</option>
                      <option value="inspiration">✨ Inspiratie Gids (Lijstjes & Ideeën)</option>
                      <option value="expert">🛠️ Techniek & Expert (Deep Dive)</option>
                      <option value="business">🏢 Zakelijke Markt (B2B/Relatiegeschenk)</option>
                      <option value="comparison">⚖️ Vergelijking / Keuzehulp</option>
                      <option value="process">⚙️ Achter de Schermen (Productie)</option>
                  </select>
                </div>
              </div>

               {/* AI SETTINGS (New) */}
               <details className="group border border-slate-200 rounded-lg bg-white overflow-hidden transition-all duration-300">
                  <summary className="flex items-center justify-between p-3 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-2 text-sm font-bold text-brand-grey">
                          <Sliders size={16} className="text-slate-500" />
                          <span>AI Instellingen (Geavanceerd)</span>
                      </div>
                      <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="p-4 space-y-5 bg-white border-t border-slate-100">
                      <div>
                          <div className="flex justify-between items-center mb-2">
                             <label className="text-xs font-bold text-brand-grey uppercase tracking-wide">
                                Creativiteit (Temperature)
                             </label>
                             <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-brand-orange">{aiTemperature}</span>
                          </div>
                          <input 
                             type="range" 
                             min="0" 
                             max="1.5" 
                             step="0.1" 
                             value={aiTemperature} 
                             onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                             className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                              <span>Strikt (Feitelijk)</span>
                              <span>Creatief (Vrij)</span>
                          </div>
                      </div>

                      <div>
                          <div className="flex justify-between items-center mb-2">
                             <label className="text-xs font-bold text-brand-grey uppercase tracking-wide">
                                Variatie (Top-P)
                             </label>
                             <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-brand-orange">{aiTopP}</span>
                          </div>
                          <input 
                             type="range" 
                             min="0" 
                             max="1.0" 
                             step="0.05" 
                             value={aiTopP} 
                             onChange={(e) => setAiTopP(parseFloat(e.target.value))}
                             className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                              Hogere waarde zorgt voor meer diverse woordkeuze.
                          </p>
                      </div>
                  </div>
               </details>

              {/* Sitemap & Product Selector */}
              <div className="relative border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center mb-1">
                     <label className="block text-sm font-bold text-brand-grey">
                        Focus Pagina's / Producten
                     </label>
                     <button 
                        onClick={handleFetchSitemap}
                        disabled={isLoadingSitemap}
                        className="text-xs flex items-center gap-1 text-slate-400 hover:text-brand-orange transition-colors bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm"
                     >
                        <RefreshCw size={10} className={isLoadingSitemap ? "animate-spin" : ""} />
                        Data Inladen
                     </button>
                </div>

                {sitemapError && (
                    <div className="text-xs text-red-500 mb-2 font-bold">{sitemapError}</div>
                )}
                
                {availableProducts.length === 0 && !isLoadingSitemap && !sitemapError && (
                    <div className="text-xs text-slate-400 mb-2 italic flex items-center gap-1">
                        <Database size={10} />
                        Klik op "Data Inladen" om te beginnen
                    </div>
                )}

                {/* Selected Products Chips */}
                {selectedProducts.length > 0 && (
                   <div className="flex flex-wrap gap-2 mb-2">
                      {selectedProducts.map((p, idx) => (
                         <div key={idx} className="flex items-center gap-1 bg-brand-light text-brand-orange border border-brand-orange/20 px-2 py-1 rounded text-xs font-bold">
                            <SearchCheck size={10} />
                            <span className="truncate max-w-[150px]">{p.name}</span>
                            <button onClick={() => handleRemoveProduct(p.url)} className="hover:text-red-500 ml-1"><X size={12}/></button>
                         </div>
                      ))}
                   </div>
                )}

                <div className="relative">
                  <Tag className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all"
                    placeholder={availableProducts.length > 0 ? "Zoek in catalogus..." : "Eerst data inladen..."}
                    value={productSearch}
                    disabled={availableProducts.length === 0}
                    onChange={(e) => {
                       setProductSearch(e.target.value);
                       setShowProductSuggestions(true);
                    }}
                    onFocus={() => setShowProductSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)}
                  />
                  
                  {/* Suggestions Dropdown */}
                  {showProductSuggestions && productSearch && filteredProducts.length > 0 && (
                     <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {filteredProducts.map((p, idx) => (
                           <div 
                              key={idx} 
                              className="px-4 py-2 hover:bg-brand-light cursor-pointer border-b border-slate-50 last:border-0"
                              onClick={() => handleAddProduct(p)}
                           >
                              <div className="text-sm font-bold text-brand-grey">{p.name}</div>
                              <span className="text-[9px] uppercase font-bold text-slate-300 bg-slate-50 px-1 rounded">{p.category}</span>
                           </div>
                        ))}
                     </div>
                  )}
                </div>
              </div>

              {/* Header Image Uploader (Single) */}
              <div className="border-t border-slate-100 pt-4">
                  <ImageUploader 
                    images={headerImage} 
                    onImagesChange={setHeaderImage} 
                    label="Hoofd Foto (Header/Hero)"
                    maxFiles={1}
                  />
              </div>

              {/* Content Images Uploader (Multiple) */}
              <div className="border-t border-slate-100 pt-4">
                  <ImageUploader 
                    images={contentImages} 
                    onImagesChange={setContentImages} 
                    label="Content Foto's (Voor in de tekst)"
                  />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-bold text-brand-grey mb-1">
                  Extra Instructies / Ideeën
                </label>
                <div className="relative">
                  <PenTool className="absolute left-3 top-3 text-slate-400" size={16} />
                  <textarea
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all h-20 text-sm resize-none"
                    placeholder="Bijv. 'Gebruik humor', 'Focus op duurzaamheid'..."
                    value={extraInstructions}
                    onChange={(e) => setExtraInstructions(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 pb-2">
                <label className="block text-sm font-bold text-brand-grey mb-1">
                  Video URL (Optioneel)
                </label>
                <div className="relative">
                  <Video className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all text-sm"
                    placeholder="YouTube URL..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Social Option */}
              <div className="border-t border-slate-100 pt-4 pb-2">
                 <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${autoGenerateSocial ? 'bg-brand-orange border-brand-orange' : 'border-slate-300 bg-white group-hover:border-brand-orange'}`}>
                        {autoGenerateSocial && <Check size={14} className="text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={autoGenerateSocial} onChange={(e) => setAutoGenerateSocial(e.target.checked)} />
                    <span className="text-sm font-bold text-brand-grey group-hover:text-brand-orange transition-colors">Direct Social Media posts genereren</span>
                 </label>
              </div>

              <button
                onClick={handleGenerate}
                disabled={status === AppStatus.ANALYZING_IMAGES || status === AppStatus.GENERATING_TEXT || status === AppStatus.MODIFYING_TEXT || status === AppStatus.GENERATING_SOCIAL}
                className={`w-full py-3 px-4 rounded-lg font-display font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md
                  ${(status === AppStatus.ANALYZING_IMAGES || status === AppStatus.GENERATING_TEXT || status === AppStatus.MODIFYING_TEXT || status === AppStatus.GENERATING_SOCIAL)
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-brand-orange hover:bg-[#d66a4d] hover:shadow-lg active:scale-[0.98]'
                  }`}
              >
                {status === AppStatus.IDLE && (
                  <>Genereer HTML <ArrowRight size={18} /></>
                )}
                {(status === AppStatus.ANALYZING_IMAGES || status === AppStatus.GENERATING_TEXT || status === AppStatus.MODIFYING_TEXT || status === AppStatus.GENERATING_SOCIAL) && (
                   <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"/> {progressMessage}</>
                )}
                {status === AppStatus.COMPLETED && (
                  <>Opnieuw Genereren <Sparkles size={18} /></>
                )}
              </button>
            </div>
          </div>
          
        </div>

        {/* Right Column: Editor & Social */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Tab Navigation - ALWAYS VISIBLE NOW */}
          <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1 mb-2">
              <button 
                 onClick={() => setActiveTab('editor')}
                 className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'editor' ? 'bg-brand-orange text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                 <FileText size={16} /> Blog Editor
              </button>
              <button 
                 onClick={() => setActiveTab('seo')}
                 className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'seo' ? 'bg-brand-orange text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                 <Gauge size={16} /> SEO Analyse
              </button>
              <button 
                 onClick={() => setActiveTab('social')}
                 disabled={!generatedBlogData} 
                 className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all 
                    ${activeTab === 'social' ? 'bg-brand-orange text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}
                    ${!generatedBlogData ? 'opacity-50 cursor-not-allowed' : ''}
                 `}
              >
                 <Share2 size={16} /> Social Media {!generatedBlogData && <span className="text-[10px] bg-slate-100 px-1 rounded ml-1">(Eerst blog genereren)</span>}
              </button>
          </div>

          {/* EDITOR VIEW */}
          <div className={activeTab === 'editor' ? 'block' : 'hidden'}>
              {/* Modification Bar */}
              {editorContent && (
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
                     <label className="flex items-center gap-2 text-sm font-bold text-brand-grey mb-2">
                        <MessageSquarePlus size={18} className="text-brand-orange"/>
                        Vraag AI om aanpassingen
                     </label>
                     <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={modificationPrompt}
                          onChange={(e) => setModificationPrompt(e.target.value)}
                          placeholder="Bijv: 'Maak de toon enthousiaster' of 'Voeg een alinea toe over duurzaamheid'"
                          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none"
                          onKeyDown={(e) => e.key === 'Enter' && handleModification()}
                        />
                        <button 
                           onClick={handleModification}
                           disabled={!modificationPrompt.trim() || status === AppStatus.MODIFYING_TEXT}
                           className="bg-brand-grey text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                           <Sparkles size={16} /> Update
                        </button>
                     </div>
                  </div>
              )}

              {/* Copy Bar */}
              {editorContent && (
                  <div className="flex justify-end gap-2 mb-4">
                       <button 
                          onClick={handleDownloadHtml}
                          className="bg-slate-600 text-white hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                          title="Download als .html bestand (Aanbevolen voor grote bestanden)"
                        >
                          <Download size={18} />
                          Download HTML
                       </button>
                       <button 
                          onClick={handleCopyHtml}
                          className="bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                        >
                          {copiedHtml ? <ClipboardCheck size={18} /> : <Copy size={18} />}
                          {copiedHtml ? 'Gekopieerd!' : 'Kopieer HTML'}
                        </button>
                  </div>
              )}

              {/* Editor Area */}
              <div className="flex gap-4 min-h-[600px] relative">
                 {status === AppStatus.MODIFYING_TEXT && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-xl">
                        <div className="bg-white p-4 rounded-lg shadow-xl border border-slate-200 flex flex-col items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-orange border-t-transparent mb-2"/>
                            <p className="text-brand-grey font-bold font-display">Aanpassingen verwerken...</p>
                        </div>
                    </div>
                 )}
                 
                 {editorContent ? (
                    <div className="flex-1">
                         <RichTextEditor 
                            initialContent={editorContent} 
                            onChange={setEditorContent} 
                         />
                    </div>
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-400 p-12">
                       <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <FileText size={32} className="text-slate-300" />
                       </div>
                       <p className="font-display text-center">Genereer eerst een blog om de editor te openen.</p>
                    </div>
                 )}
              </div>
          </div>

          {/* SEO ANALYSE VIEW */}
          <div className={activeTab === 'seo' ? 'block' : 'hidden'}>
               {seoAnalysis ? (
                   <SeoScorecard analysis={seoAnalysis} />
               ) : (
                    <div className="w-full h-64 flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-400 p-12">
                       <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <Gauge size={32} className="text-slate-300" />
                       </div>
                       <p className="font-display text-center">Genereer content en begin met typen om een SEO score te zien.</p>
                    </div>
               )}
          </div>

          {/* SOCIAL MEDIA VIEW */}
          <div className={activeTab === 'social' ? 'block' : 'hidden'}>
              {status === AppStatus.GENERATING_SOCIAL && (
                   <div className="flex flex-col items-center justify-center h-64">
                       <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-orange border-t-transparent mb-4"/>
                       <p className="text-brand-grey font-bold">Social Media Strategie uitwerken...</p>
                       <p className="text-sm text-slate-400">Posts voor LinkedIn, Instagram, Facebook & Pinterest</p>
                   </div>
              )}

              {!socialStrategy && status !== AppStatus.GENERATING_SOCIAL && (
                  <div className="flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-400 p-12 h-[500px]">
                       <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <Share2 size={32} className="text-slate-300" />
                       </div>
                       <h3 className="text-lg font-bold text-brand-grey mb-2">Genereer Social Media Posts</h3>
                       <p className="text-center mb-6 max-w-md">Laat de AI automatisch captions, hashtags en visuele suggesties bedenken voor 4 platforms op basis van je blog.</p>
                       <button 
                          onClick={handleGenerateSocial}
                          className="bg-brand-orange hover:bg-[#d66a4d] text-white px-6 py-3 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all"
                       >
                          <Sparkles size={18} /> Start Generator
                       </button>
                  </div>
              )}

              {socialStrategy && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {renderSocialCard('LinkedIn', socialStrategy.linkedin, Linkedin, 'bg-blue-600')}
                      {renderSocialCard('Instagram', socialStrategy.instagram, Instagram, 'bg-pink-600')}
                      {renderSocialCard('Facebook', socialStrategy.facebook, Facebook, 'bg-blue-800')}
                      {renderSocialCard('Pinterest', socialStrategy.pinterest, Tag, 'bg-red-600')}
                  </div>
              )}
          </div>

        </div>
      </main>
    </div>
  );
}