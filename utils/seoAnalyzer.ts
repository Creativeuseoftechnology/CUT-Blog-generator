
import { SeoAnalysis } from "../types";

export const analyzeContent = (htmlContent: string, targetKeywords: string): SeoAnalysis => {
  // 1. Setup default response
  const result: SeoAnalysis = {
    score: 100,
    wordCount: 0,
    readingTime: 0,
    keywordDensity: 0,
    keywordCount: 0,
    issues: {
      critical: [],
      warning: [],
      good: []
    }
  };

  if (!htmlContent) return result;

  // 2. Parse HTML safely
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Remove Style tags to avoid counting CSS as words
  const styles = doc.querySelectorAll('style');
  styles.forEach(style => style.remove());
  
  // Remove Script tags
  const scripts = doc.querySelectorAll('script');
  scripts.forEach(script => script.remove());

  // Get Clean Text
  const plainText = doc.body.textContent || "";
  const words = plainText.trim().split(/\s+/).filter(w => w.length > 0);
  result.wordCount = words.length;
  result.readingTime = Math.ceil(result.wordCount / 200); // Average reading speed

  // 3. Keyword Analysis
  // Take the first keyword if multiple are comma-separated
  const primaryKeyword = targetKeywords.split(',')[0].trim().toLowerCase();
  
  if (primaryKeyword) {
    const regex = new RegExp(primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = plainText.match(regex);
    result.keywordCount = matches ? matches.length : 0;
    
    if (result.wordCount > 0) {
      result.keywordDensity = parseFloat(((result.keywordCount / result.wordCount) * 100).toFixed(2));
    }

    // Keyword Logic
    if (result.keywordCount === 0) {
      result.issues.critical.push(`Zoekwoord "${primaryKeyword}" niet gevonden in tekst.`);
      result.score -= 20;
    } else if (result.keywordDensity > 3.5) {
      result.issues.warning.push(`Keyword density is hoog (${result.keywordDensity}%). Pas op voor keyword stuffing.`);
      result.score -= 5;
    } else {
      result.issues.good.push(`Zoekwoord komt ${result.keywordCount} keer voor (${result.keywordDensity}%).`);
    }

    // Check Title (H1) for Keyword
    // Note: The generator often wraps content in a div, so we look for h1 or h2 if h1 is missing
    const h1 = doc.querySelector('h1') || doc.querySelector('h2'); // Fallback if H1 is missing in editor view
    if (h1) {
      if (!h1.textContent?.toLowerCase().includes(primaryKeyword)) {
         result.issues.warning.push("Zoekwoord niet gevonden in de hoofd titel (H1/H2).");
         result.score -= 10;
      } else {
         result.issues.good.push("Zoekwoord aanwezig in de titel.");
      }
    }
  } else {
    result.issues.warning.push("Geen zoekwoord opgegeven voor analyse.");
  }

  // 4. Structure & Length Analysis
  
  // Word Count
  if (result.wordCount < 300) {
    result.issues.critical.push("Tekst is te kort (< 300 woorden) voor goede ranking.");
    result.score -= 20;
  } else if (result.wordCount < 600) {
    result.issues.warning.push("Tekst is aan de korte kant (< 600 woorden).");
    result.score -= 5;
  } else {
    result.issues.good.push(`Goede lengte (${result.wordCount} woorden).`);
  }

  // Headings
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length < 2) {
    result.issues.warning.push("Gebruik meer tussenkoppen (H2/H3) voor structuur.");
    result.score -= 10;
  } else {
    result.issues.good.push("Goede structuur met tussenkoppen.");
  }

  // Paragraph length (Readability)
  const paragraphs = doc.querySelectorAll('p');
  let longParagraphs = 0;
  paragraphs.forEach(p => {
    const pWords = (p.textContent || "").split(/\s+/).length;
    if (pWords > 150) longParagraphs++; // > 150 words is very long for web
  });

  if (longParagraphs > 0) {
    result.issues.warning.push(`${longParagraphs} alinea's zijn te lang (>150 woorden).`);
    result.score -= 5;
  }

  // Images with Alt Text
  const images = doc.querySelectorAll('img');
  let missingAlt = 0;
  images.forEach(img => {
    if (!img.getAttribute('alt')) missingAlt++;
  });

  if (missingAlt > 0) {
    result.issues.warning.push(`${missingAlt} afbeeldingen missen een ALT tekst.`);
    result.score -= 5;
  } else if (images.length > 0) {
    result.issues.good.push("Alle afbeeldingen hebben ALT teksten.");
  }

  // Links
  const links = doc.querySelectorAll('a');
  if (links.length === 0) {
     result.issues.warning.push("Geen interne of externe links gevonden.");
     result.score -= 5;
  } else {
    result.issues.good.push(`${links.length} links gevonden.`);
  }

  // CRITICAL: Check for accidental noindex tags in content
  // Sometimes people copy-paste metadata into the body
  const metaRobots = doc.querySelector('meta[name="robots"]');
  if (metaRobots) {
      const content = metaRobots.getAttribute('content')?.toLowerCase() || "";
      if (content.includes('noindex')) {
          result.issues.critical.push("LET OP: Er staat een 'noindex' tag in je code. Google zal dit NIET indexeren.");
          result.score -= 50;
      }
  }

  // Cap Score
  result.score = Math.max(0, Math.min(100, result.score));

  return result;
};
