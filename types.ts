
export interface ImageData {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
  description?: string; // AI generated context
  optimizedBlob?: Blob; // Compressed WebP blob
}

export type SectionLayout = 'hero' | 'full_width' | 'two_column_image_left' | 'two_column_image_right' | 'cta_block' | 'feature_highlight' | 'quote_block';
export type ContentFramework = 'auto' | 'inspiration' | 'expert' | 'business' | 'comparison' | 'process';

export interface BlogSection {
  layout: SectionLayout;
  heading: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface KeywordSuggestion {
  keyword: string;
  volume: string;      // e.g., "Hoog", "Gemiddeld", "Laag" or range "100-1000"
  competition: string; // e.g., "Hoog", "Laag"
  rationale: string;   // Short reason why this is good
}

export interface ProductEntry {
  name: string;
  url: string;
  category: string;
}

export interface GeneratedBlog {
  title: string;
  metaDescription: string;
  sections: BlogSection[];
  keywordsUsed: string[];
  geoStrategy: string;
  headerImageAlt: string; // Specific ALT for the hero image
  imageAltMap: Record<string, string>;
  
  // New fields for Creative Use of Technology specific features
  internalLinksUsed: string[]; // List of links inserted
  faq?: { question: string; answer: string; }[]; // Optional FAQ section
  schemaMarkup?: string; // JSON-LD string provided by AI
}

export interface SocialPost {
  platform: 'linkedin' | 'instagram' | 'facebook' | 'pinterest';
  caption: string;
  hashtags: string[];
  visualSuggestion: string; // Suggestion on which image to use (e.g. "Header image" or "Close up of material")
}

export interface SocialMediaStrategy {
  linkedin: SocialPost;
  instagram: SocialPost;
  facebook: SocialPost;
  pinterest: SocialPost;
}

export interface SeoAnalysis {
  score: number; // 0-100
  wordCount: number;
  readingTime: number; // in minutes
  keywordDensity: number; // percentage
  keywordCount: number;
  issues: {
    critical: string[];
    warning: string[];
    good: string[];
  };
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING_IMAGES = 'ANALYZING_IMAGES',
  GENERATING_TEXT = 'GENERATING_TEXT',
  MODIFYING_TEXT = 'MODIFYING_TEXT',
  GENERATING_SOCIAL = 'GENERATING_SOCIAL',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

// Elementor specific types for JSON generation
export interface ElementorWidget {
  id: string;
  elType: 'widget';
  settings: Record<string, any>;
  elements: any[];
  widgetType: string;
}

export interface ElementorColumn {
  id: string;
  elType: 'column';
  settings: Record<string, any>;
  elements: ElementorWidget[];
}

export interface ElementorSection {
  id: string;
  elType: 'section';
  settings: Record<string, any>;
  elements: ElementorColumn[];
}

export interface ElementorTemplate {
  version: string;
  title: string;
  type: string;
  content: ElementorSection[];
}
