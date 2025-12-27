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
    title: { type: Type.STRING },
    metaDescription: { type: Type.STRING },
    geoStrategy: { type: Type.STRING },
    keywordsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
    internalLinksUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
    imageAltMap: {
      type: Type.OBJECT,
      properties: {
        "0": { type: Type.STRING },
        "1": { type: Type.STRING },
        "2": { type: Type.STRING },
        "3": { type: Type.STRING },
        "4": { type: Type.STRING }
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
          ctaText: { type: Type.STRING },
          ctaUrl: { type: Type.STRING }
        }
      }
    }
  }
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
    return "Kon afbeelding niet analyseren.";
  }
};

export const generateBlogContent = async (
  keywords: string,
  userIntent: string,
  focusedProducts: ProductEntry[],
  imageContexts: string[],
  productDetails: string[], // Scraped content
  extraInstructions: string
): Promise<GeneratedBlog> => {
  
  const productContextList = focusedProducts.map(p => `- TARGET ITEM: "${p.name}" -> URL: "${p.url}"`).join('\n');
  
  const detailedProductContext = productDetails.map((detail, index) => 
     `--- START INFO VOOR TARGET ITEM: ${focusedProducts[index]?.name} ---\n${detail}\n--- EINDE INFO ---\n`
  ).join('\n');

  const productInstruction = focusedProducts.length > 0
    ? `FOCUS & LINKING STRATEGIE (STRIKTE REGELS):
       1. Je mag voor Knoppen (CTA) en Interne Links in de tekst ALLEEN linken naar de URL's in de onderstaande lijst.
       2. Verzin GEEN andere URL's. Als het niet in de lijst staat, link er niet naar.
       
       BESCHIKBARE LINKS (Gebruik deze voor buttons en tekst links):
       ${productContextList}
       
       CONTEXT INFORMATIE (Gebruik dit voor de inhoud):
       ${detailedProductContext}`
    : `Gebruik sitemap structuur voor algemene links.`;

  const prompt = `
    Je bent een Senior Content Marketeer voor Creative Use of Technology.
    
    ${BRAND_VOICE}
    ${SITEMAP_CONTEXT}
    
    DOEL: Schrijf een visueel aantrekkelijke, SEO-geoptimaliseerde blogpost in JSON formaat.
    
    INPUT:
    - Keywords: ${keywords}
    - Intent: ${userIntent}
    - Afbeeldingen Context: ${imageContexts.join('\n')}
    - SPECIFIEKE GEBRUIKERSINSTRUCTIES: "${extraInstructions}"
    
    ${productInstruction}

    BELANGRIJKE EISEN:
    1. **Titel & Koppen (Sentence case):** Gebruik strikt 'Sentence case'. NIET: "Elk Woord Een Hoofdletter".
       - FOUT: "Houten Wereldkaarten Voor Aan De Muur"
       - GOED: "Houten wereldkaarten voor aan de muur"
    2. **SEO Structuur (H1, H2, H3):**
       - De 'title' van de blog is de H1.
       - Elke 'section' met een 'heading' is automatisch een H2.
       - Gebruik binnen de 'content' van de secties HTML <h3> tags voor sub-onderwerpen. Dit is cruciaal voor de SEO-structuur. Zorg voor een logische hiërarchie.
    3. **Afbeeldingen SEO:** Genereer SEO-geoptimaliseerde ALT teksten.
    4. **Links & Knoppen:** Link alleen naar de opgegeven URL's.
    5. **Geen Shortcodes:** Genereer GEEN WooCommerce shortcodes.

    LAYOUT TYPES:
    - **hero**: Pakkende titel (H1), introductie.
    - **two_column_image_left/right**: Tekst naast beeld (H2 koppen).
    - **full_width**: Voor tekst zonder direct plaatje. Gebruik hierin <h3> tags als dat de leesbaarheid verbetert.
    - **cta_block**: Een duidelijke call-to-action blok.

    OUTPUT: JSON volgens schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: BLOG_SCHEMA
      }
    });

    if (!response.text) throw new Error("Geen data.");
    return JSON.parse(response.text) as GeneratedBlog;
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
    Pas de blog aan. Behoud de JSON structuur exact.
    Huidige Blog JSON: ${JSON.stringify(currentBlog)}
    Instructie: "${modificationRequest}"
    
    BELANGRIJK: 
    - Behoud de 'Sentence case' in titels.
    - Zorg dat de H1, H2, H3 structuur logisch blijft voor SEO.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: BLOG_SCHEMA
      }
    });
    if (!response.text) throw new Error("Fout.");
    return JSON.parse(response.text) as GeneratedBlog;
  } catch (error) {
    throw error;
  }
};

export const getKeywordSuggestions = async (topic: string): Promise<KeywordSuggestion[]> => {
    const prompt = `SEO suggesties voor: "${topic}". JSON array: keyword, volume, competition, rationale.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { keyword: {type:Type.STRING}, volume:{type:Type.STRING}, competition:{type:Type.STRING}, rationale:{type:Type.STRING}}}} }
        });
        return JSON.parse(response.text || "[]");
    } catch { return []; }
};