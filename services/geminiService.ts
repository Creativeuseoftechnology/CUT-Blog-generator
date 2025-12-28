import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedBlog, ImageData, KeywordSuggestion, ProductEntry } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SITEMAP_CONTEXT = `
KNOWLEDGE BASE - SITE STRUCTUUR:
1. **Algemeen:** /shop/, /diensten/, /over-ons/, /contact/, /portfolio/
2. **Categorieën:** /product-categorie/wereldkaarten/, /product-categorie/verlichting/, /product-categorie/relatiegeschenken/
`;

const BRAND_VOICE = `
MERK IDENTITEIT (Creative Use of Technology):
- Kleuren: Oranje (#ec7b5d), Grijs (#575756).
- Sfeer: Innovatief, warm, persoonlijk, technisch vakmanschap maar toegankelijk.
- Doelgroep: Bedrijven (B2B) op zoek naar unieke relatiegeschenken en consumenten (B2C) voor custom interieur.
- Toon: Professionele marketeer. Overtuigend, SEO-sterk, activerend. Gebruik 'je' en 'jij'.
`;

const BLOG_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { 
      type: Type.STRING,
      description: "H1 titel (max 12 woorden). Geen herhaling." 
    },
    metaDescription: { 
      type: Type.STRING,
      description: "Meta omschrijving (max 160 karakters)."
    },
    geoStrategy: { type: Type.STRING },
    headerImageAlt: { type: Type.STRING, description: "SEO ALT tekst." },
    keywordsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
    internalLinksUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
    faq: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { 
            type: Type.STRING, 
            description: "De vraag. KORT (1 zin). GEEN enters/newlines." 
          },
          answer: { 
            type: Type.STRING, 
            description: "Het antwoord. Beknopt. GEEN enters/newlines." 
          }
        }
      }
    },
    imageAltMap: {
      type: Type.OBJECT,
      properties: {
        "0": { type: Type.STRING, description: "SEO ALT sectie 1." },
        "1": { type: Type.STRING, description: "SEO ALT sectie 2." },
        "2": { type: Type.STRING, description: "SEO ALT sectie 3." },
        "3": { type: Type.STRING, description: "SEO ALT sectie 4." },
        "4": { type: Type.STRING, description: "SEO ALT sectie 5." }
      }
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          layout: { type: Type.STRING, enum: ['hero', 'full_width', 'two_column_image_left', 'two_column_image_right', 'cta_block'] },
          heading: { type: Type.STRING },
          content: { type: Type.STRING },
          ctaText: { type: Type.STRING, description: "Beschrijvende knop tekst (bijv: 'Bekijk wereldkaarten')." },
          ctaUrl: { type: Type.STRING }
        }
      }
    }
  }
};

const cleanJson = (text: string): string => {
  if (!text) return "{}";
  // Remove markdown code blocks if present
  let cleaned = text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
  return cleaned.trim();
};

export const analyzeImageContent = async (base64: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType: mimeType } },
          { text: "Beschrijf deze afbeelding voor Creative Use of Technology. Focus op materialen, kleuren en techniek." },
        ],
      },
    });
    return response.text || "Geen beschrijving.";
  } catch (error) {
    console.warn("Image analysis failed", error);
    return "Kon afbeelding niet analyseren. Ga uit van een algemene context passend bij het onderwerp.";
  }
};

export const generateBlogContent = async (
  keywords: string,
  userIntent: string,
  focusedProducts: ProductEntry[],
  imageContexts: string[], // Content images
  headerImageContext: string, // Header image specific context
  productDetails: string[], // Scraped content
  extraInstructions: string
): Promise<GeneratedBlog> => {
  
  const productContextList = focusedProducts.map(p => `- LINK TARGET: "${p.name}" -> URL: "${p.url}"`).join('\n');
  
  const detailedProductContext = productDetails.map((detail, index) => 
     `[PRODUCT INFO START: ${focusedProducts[index]?.name}]\n${detail}\n[PRODUCT INFO END]\n`
  ).join('\n');

  const productInstruction = focusedProducts.length > 0
    ? `LINKING RULES (STRICT):
       1. ONLY link to the URLs listed below in the "AVAILABLE LINKS" section.
       2. Do NOT invent new URLs.
       
       AVAILABLE LINKS:
       ${productContextList}`
    : `Use sitemap structure for general linking.`;

  const prompt = `
    ROLE: Senior Content Marketeer for 'Creative Use of Technology'.
    
    ${BRAND_VOICE}
    ${SITEMAP_CONTEXT}
    
    TASK: Write a visually engaging, SEO-optimized blog post in valid JSON format.
    
    === INPUT DATA ===
    TOPIC/KEYWORDS: ${keywords}
    USER INTENT: ${userIntent}
    USER INSTRUCTIONS: "${extraInstructions}"
    
    HEADER IMAGE CONTEXT: ${headerImageContext}
    CONTENT IMAGES CONTEXT: 
    ${imageContexts.map((ctx, i) => `Image ${i}: ${ctx}`).join('\n')}
    
    === PRODUCT CONTEXT (SOURCE MATERIAL) ===
    ${detailedProductContext}
    
    === STRATEGY INSTRUCTIONS ===
    ${productInstruction}

    === WRITING GUIDELINES ===
    1. **Headings:** Use Sentence case. Include keywords naturally. No repetition in H1.
    2. **Content:** Write converting copy. If a section has an image, reference the image content in the text.
    3. **Geo-Targeting:** Subtly mention 'Dutch craftsmanship' or 'Made in Breda' where appropriate.
    4. **Formatting:** NO markdown bolding (**) in the JSON strings.
    5. **JSON SYNTAX (CRITICAL):** 
       - Do NOT use newlines (\n) or carriage returns (\r) inside JSON string values. 
       - Keep "question" and "answer" fields on a single line.
       - Do not add trailing commas.
    6. **CTA Buttons:** Use descriptive anchor text (e.g. "Ontwerp jouw lamp" instead of "Klik hier").

    === LAYOUT TYPES ===
    - hero: Intro section.
    - two_column_image_left/right: Use when content images are available.
    - full_width: Text only.
    - cta_block: Call to action.

    OUTPUT: JSON ONLY. Adhere to the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: BLOG_SCHEMA,
        temperature: 0.2,
        topK: 40, // Limits vocabulary to preventing "looping" on low probability tokens
        maxOutputTokens: 8192
      }
    });

    const text = response.text;
    if (!text) throw new Error("Geen data ontvangen van AI.");
    
    try {
        const parsed = JSON.parse(cleanJson(text)) as GeneratedBlog;
        // Robust Safety Checks for Arrays
        if (!parsed.sections) parsed.sections = [];
        if (!parsed.keywordsUsed) parsed.keywordsUsed = [];
        if (!parsed.internalLinksUsed) parsed.internalLinksUsed = [];
        if (!parsed.faq) parsed.faq = [];
        
        // Additional safety: Ensure section content is string
        parsed.sections.forEach(s => {
            if (!s.content) s.content = "";
            if (!s.heading) s.heading = "";
        });
        
        return parsed;
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError, "Raw Text:", text);
        throw new Error("Fout bij verwerken van AI antwoord. Probeer het opnieuw (Data was incompleet).");
    }
  } catch (error) {
    console.error("Fout bij blog generatie:", error);
    throw error;
  }
};

export const modifyBlogContent = async (
  currentBlog: GeneratedBlog,
  modificationRequest: string
): Promise<GeneratedBlog> => {
  const prompt = `
    Modify the following blog post based on the instruction. Keep exact JSON structure.
    
    CURRENT BLOG: ${JSON.stringify(currentBlog)}
    INSTRUCTION: "${modificationRequest}"
    
    RULES: 
    - Keep 'Sentence case' in titles.
    - NO markdown bolding (**).
    - NO newlines inside JSON strings.
    - Ensure valid JSON output.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: BLOG_SCHEMA,
        temperature: 0.2
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("Geen data.");
    
    const parsed = JSON.parse(cleanJson(text)) as GeneratedBlog;
    
    // Robust Safety Checks for Arrays
    if (!parsed.sections) parsed.sections = [];
    if (!parsed.keywordsUsed) parsed.keywordsUsed = [];
    if (!parsed.internalLinksUsed) parsed.internalLinksUsed = [];
    if (!parsed.faq) parsed.faq = [];

    return parsed;
  } catch (error) {
    console.error("Modificatie error:", error);
    throw error;
  }
};

export const getKeywordSuggestions = async (currentTopic: string): Promise<KeywordSuggestion[]> => {
    // Check if the user has already entered keywords (comma separated)
    const existingKeywords = currentTopic.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const topicContext = existingKeywords.length > 0 ? existingKeywords[0] : "duurzaam design";
    
    const exclusionPrompt = existingKeywords.length > 0 
      ? `Avoid these used keywords: ${existingKeywords.join(', ')}.` 
      : "";

    const prompt = `
      Role: SEO Specialist.
      Task: Provide 5 NEW, relevant long-tail keyword suggestions for: "${topicContext}".
      ${exclusionPrompt}
      
      Criteria:
      1. High search volume, reasonable competition.
      2. Commercial or Informational intent.
      3. Unique suggestions.
      
      Output JSON array: keyword, volume, competition, rationale.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
              responseMimeType: "application/json", 
              responseSchema: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { 
                    keyword: {type:Type.STRING}, 
                    volume:{type:Type.STRING}, 
                    competition:{type:Type.STRING}, 
                    rationale:{type:Type.STRING}
                  }
                }
              } 
            }
        });
        
        return JSON.parse(cleanJson(response.text || "[]"));
    } catch { return []; }
};