import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedBlog, ImageData, KeywordSuggestion, ProductEntry, ContentFramework, SocialMediaStrategy } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SITEMAP_CONTEXT = `
KNOWLEDGE BASE - SITE STRUCTUUR:
1. **Algemeen:** /shop/, /diensten/, /over-ons/, /contact/, /portfolio/
2. **Categorieën:** /product-categorie/wereldkaarten/, /product-categorie/verlichting/, /product-categorie/relatiegeschenken/
`;

const BRAND_VOICE = `
MERK IDENTITEIT (Creative Use of Technology - CUoT):
- Rol: Senior Content Strateeg.
- Kleuren: Oranje (#ec7b5d), Grijs (#575756).
- Sfeer: Innovatief, warm, persoonlijk, technisch vakmanschap maar toegankelijk.
- Doelgroep: Bedrijven (B2B) op zoek naar unieke relatiegeschenken en consumenten (B2C) voor custom interieur.
- Toon: Professionele marketeer. Overtuigend, SEO-sterk, activerend. Gebruik 'je' en 'jij'.
- Autoriteit: Wij hebben 2000+ reviews met een score van 96% (9.6). Gebruik dit als social proof.
- Locatie: Benadruk "Nederlands vakmanschap" en productie in "Breda".
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
      description: "Meta omschrijving (max 155 karakters, CTR focus)."
    },
    geoStrategy: { type: Type.STRING, description: "Korte uitleg over hoe Breda/Lokaal is verwerkt." },
    headerImageAlt: { type: Type.STRING, description: "SEO ALT tekst." },
    keywordsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
    internalLinksUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
    schemaMarkup: { 
      type: Type.STRING, 
      description: "Een valid JSON-LD string. BELANGRIJK: Bij 'AggregateRating' MOET 'bestRating': '10' toegevoegd worden omdat de score > 5 is." 
    },
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
          { text: "Beschrijf deze afbeelding voor Creative Use of Technology. Focus op materialen (hout, acrylaat), kleuren en lastechniek." },
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
  extraInstructions: string,
  framework: ContentFramework,
  aiSettings?: { temperature: number; topP: number }
): Promise<GeneratedBlog> => {
  
  // Default values if not provided
  const temperature = aiSettings?.temperature ?? 0.3;
  const topP = aiSettings?.topP ?? 0.95;

  const productContextList = focusedProducts.map(p => `- LINK TARGET: "${p.name}" -> URL: "${p.url}"`).join('\n');
  
  const detailedProductContext = productDetails.map((detail, index) => 
     `[PRODUCT INFO START: ${focusedProducts[index]?.name}]\n${detail}\n[PRODUCT INFO END]\n`
  ).join('\n');

  const productInstruction = focusedProducts.length > 0
    ? `LINKING RULES (STRICT):
       1. Verwerk interne links naar onderstaande producten OP EEN NATUURLIJKE MANIER in de tekst.
       2. Gebruik exact deze URL's. Verzin geen URL's.
       
       BESCHIKBARE LINKS:
       ${productContextList}`
    : `Gebruik sitemap structuur voor algemene links indien relevant.`;

  // Define logic for framework selection
  let frameworkInstruction = "";
  if (framework === 'auto') {
      frameworkInstruction = `
      Kies dynamisch één van de volgende frameworks en pas de JSON 'sections' hierop aan:
      A. 'Inspiration Guide' (Brede termen): Intro -> 5-7 ideeën -> Waarom personalisatie werkt -> Call to Action.
      B. 'Service Expert' (Specifieke diensten): Intro -> De techniek achter het graveren/snijden -> Materiaalkeuze -> FAQ.
      C. 'Business Gift' (Zakelijk): Focus op duurzaamheid, logo-personalisatie en grote aantallen.
      D. 'Process Behind' (Autoriteit/Techniek): Leg de techniek uit. Benadruk lokaal in Breda.
      `;
  } else {
      // Force specific framework
      const frameworkMapping: Record<string, string> = {
          'inspiration': "'Inspiration Guide': Structureer als Intro -> 5-7 unieke ideeën (als lijst/kopjes) -> Waarom personalisatie werkt -> Call to Action.",
          'expert': "'Service Expert': Structureer als Intro -> De techniek achter de dienst -> Materiaalkeuze (hout/plexiglas) -> Technische FAQ.",
          'business': "'Business Gift': Focus op B2B. Structuur: Intro -> Voordelen van unieke geschenken -> Duurzaamheid & Impact -> Logo personalisatie -> Aanvraag info.",
          'comparison': "'Product Comparison': Vergelijk materialen of opties. Gebruik een structuur die de lezer helpt kiezen (bijv. Eiken vs Walnoot).",
          'process': "'Behind the Scenes': Leg stap voor stap uit hoe het gemaakt wordt in Breda. Focus op vakmanschap en machines."
      };
      frameworkInstruction = `FORCEER FRAMEWORK: ${frameworkMapping[framework] || "Volg de gebruikersinstructie."}`;
  }

  const prompt = `
    ROL: Je bent de Senior Content Strateeg van Creative Use of Technology (CUT). 
    DOEL: Genereer een blog die informatief, technisch geoptimaliseerd (SEO & Geo) en visueel aantrekkelijk is.

    ${BRAND_VOICE}
    ${SITEMAP_CONTEXT}
    
    === STRATEGISCHE INZICHTEN (STRIKTE RICHTLIJNEN) ===
    1. INTENT MATCH: Als intentie = 'kopen', focus op USP's. Als intentie = 'inspiratie', focus op ideeën. Focus op AMBACHT en PROCES (hoe we het doen).
    2. SEARCH GAPS: Schrijf inspirerend voor de oriëntatiefase (bijv. "uniek cadeau", "duurzaam relatiegeschenk").
    3. AUTORITEIT: Gebruik de zin: "Al duizenden klanten gingen je voor met een gemiddelde score van 9.6". Verwerk dit subtiel.
    4. SEO HYGIËNE: Max 1 H1 (is de titel). Gebruik H2/H3. Meta desc max 155 tekens (CTR focus).
    5. GEO-OPTIMALISATIE: Vermeld expliciet "Geproduceerd in Breda" of "Nederlands vakmanschap" in de tekst.
    
    === SECTIE SOCIAL PROOF (VERPLICHT) ===
    In de INPUT DATA staan mogelijk 'KLANT REVIEWS'.
    - Maak EEN SPECIFIEKE SECTIE (H2) genaamd "Wat anderen vinden" (of variatie).
    - Gebruik letterlijke quotes ("...") uit de data om kwaliteit en levering te bewijzen.
    - Als er geen specifieke reviews zijn, gebruik de algemene bedrijfs-score van 9.6/10 op basis van 2000+ reviews.

    === SCHEMA MARKUP (JSON-LD) ===
    Genereer in het veld 'schemaMarkup' een complete JSON-LD string.
    CRITICAAL VOOR GOOGLE:
    1. 'Article' (BlogPosting) is de hoofd-entiteit.
    2. Als er producten zijn: Voeg 'Product' schema toe.
    3. VOOR REVIEW SCORES (AggregateRating):
       - Als je 9.6 gebruikt, MOET je "bestRating": "10" toevoegen.
       - Structuur: {"@type": "AggregateRating", "ratingValue": "9.6", "reviewCount": "2150", "bestRating": "10", "worstRating": "1"}
       - Dit voorkomt "Out of range" errors in Google Search Console.
    Zorg dat dit VALID JSON is (geen script tags).

    === FRAMEWORK SELECTIE ===
    ${frameworkInstruction}

    === INPUT DATA ===
    ONDERWERP/KEYWORDS: ${keywords}
    KLANTVRAAG (USER INTENT): ${userIntent}
    EXTRA INSTRUCTIES: "${extraInstructions}"
    
    HEADER IMAGE CONTEXT: ${headerImageContext}
    CONTENT IMAGES CONTEXT: 
    ${imageContexts.map((ctx, i) => `Afbeelding ${i}: ${ctx}`).join('\n')}
    
    === PRODUCT CONTEXT (BRONMATERIAAL MET REVIEWS) ===
    ${detailedProductContext}
    
    === STRATEGIE INSTRUCTIES ===
    ${productInstruction}

    === WRITING GUIDELINES ===
    1. **Koppen:** Sentence case. Verwerk zoekwoorden natuurlijk.
    2. **Content:** Schrijf converterende tekst. Als een sectie een afbeelding heeft (zie context), refereer hiernaar.
    3. **Opmaak:** GEEN markdown bolding (**) in de JSON strings.
    4. **JSON SYNTAX (CRITICAAL):** 
       - GEEN newlines (\n) in JSON strings.
       - Houd 'question' en 'answer' velden op 1 regel.
    5. **CTA Knoppen:** Gebruik beschrijvende tekst (bijv. "Ontwerp jouw lamp") i.p.v. "Klik hier".

    OUTPUT: JSON ONLY. Volg exact het schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: BLOG_SCHEMA,
        temperature: temperature,
        topP: topP,
        topK: 40,
        maxOutputTokens: 8192
      }
    });

    const text = response.text;
    if (!text) throw new Error("Geen data ontvangen van AI.");
    
    try {
        const parsed = JSON.parse(cleanJson(text)) as GeneratedBlog;
        
        // Safety Checks
        if (!parsed.sections) parsed.sections = [];
        if (!parsed.keywordsUsed) parsed.keywordsUsed = [];
        if (!parsed.internalLinksUsed) parsed.internalLinksUsed = [];
        if (!parsed.faq) parsed.faq = [];
        
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
    Je bent de Senior Content Strateeg van Creative Use of Technology.
    Pas de volgende blog post aan op basis van de instructie. Behoud de exacte JSON structuur.
    
    HUIDIGE BLOG: ${JSON.stringify(currentBlog)}
    INSTRUCTIE: "${modificationRequest}"
    
    REGELS: 
    - Behoud 'Sentence case' in titels.
    - GEEN markdown bolding (**).
    - GEEN newlines in JSON strings.
    - Zorg voor valide JSON output.
    - Behoud de Breda/NL Vakmanschap tone-of-voice.
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
    const existingKeywords = currentTopic.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const topicContext = existingKeywords.length > 0 ? existingKeywords[0] : "duurzaam design";
    
    const exclusionPrompt = existingKeywords.length > 0 
      ? `Vermijd deze reeds gebruikte termen: ${existingKeywords.join(', ')}.` 
      : "";

    const prompt = `
      Rol: SEO Specialist Creative Use of Technology.
      Taak: Geef 5 NIEUWE, relevante long-tail zoekwoord suggesties voor: "${topicContext}".
      Focus: Relatiegeschenken, personalisatie, lasersnijden, interieur.
      ${exclusionPrompt}
      
      Criteria:
      1. Hoog volume, haalbare competitie.
      2. Commerciële of Informationele intentie.
      3. Unieke suggesties.
      
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

export const getIntentSuggestions = async (currentTopic: string): Promise<string[]> => {
    if (!currentTopic) return [];
    
    const prompt = `
      Rol: SEO & GEO (Generative Engine Optimization) Specialist.
      Onderwerp: "${currentTopic}"
      
      Genereer 5 concrete 'User Intents' (Klantvragen) die geoptimaliseerd zijn voor SEO (Google Search) en GEO (AI antwoorden).
      Mix de volgende types:
      1. Informatief (Hoe werkt..., Wat is de beste...)
      2. Commercieel (Houten wereldkaart kopen, Relatiegeschenk graveren prijs)
      3. Lokaal/Specifiek (Lasersnijden Breda, Custom wanddecoratie op maat)
      
      Zorg dat het vragen zijn die een gebruiker letterlijk zou intypen.
      
      Output: Alleen een JSON array met 5 strings.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
              responseMimeType: "application/json", 
              responseSchema: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }
              } 
            }
        });
        
        return JSON.parse(cleanJson(response.text || "[]"));
    } catch { return []; }
};

export const generateSocialMediaStrategy = async (blog: GeneratedBlog): Promise<SocialMediaStrategy> => {
  const prompt = `
    Je bent de Social Media Manager van Creative Use of Technology.
    Schrijf 4 social media posts ter promotie van de volgende blog.
    
    BLOG TITEL: ${blog.title}
    SAMENVATTING: ${blog.metaDescription}
    KEYWORDS: ${blog.keywordsUsed.join(', ')}
    
    DOELGROEPEN & PLATFORMS:
    1. LinkedIn: Zakelijk, focus op relatiegeschenken/ambacht/duurzaamheid. Professioneel maar persoonlijk.
    2. Instagram: Visueel, inspirerend, informeel. Focus op 'Interieur' of 'Cadeau'. Veel emoji's.
    3. Facebook: Community gericht, deelbaar, lokaal (Breda).
    4. Pinterest: SEO-gericht. Titel en beschrijving moeten rijk zijn aan zoekwoorden.
    
    OUTPUT: JSON Object met keys 'linkedin', 'instagram', 'facebook', 'pinterest'.
    Elk object bevat: 'caption' (de tekst), 'hashtags' (array van tags), 'visualSuggestion' (welk type foto past hierbij).
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      linkedin: {
        type: Type.OBJECT,
        properties: {
          platform: { type: Type.STRING, enum: ['linkedin'] },
          caption: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          visualSuggestion: { type: Type.STRING }
        }
      },
      instagram: {
        type: Type.OBJECT,
        properties: {
          platform: { type: Type.STRING, enum: ['instagram'] },
          caption: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          visualSuggestion: { type: Type.STRING }
        }
      },
      facebook: {
        type: Type.OBJECT,
        properties: {
          platform: { type: Type.STRING, enum: ['facebook'] },
          caption: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          visualSuggestion: { type: Type.STRING }
        }
      },
      pinterest: {
        type: Type.OBJECT,
        properties: {
          platform: { type: Type.STRING, enum: ['pinterest'] },
          caption: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          visualSuggestion: { type: Type.STRING }
        }
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.4
      }
    });

    return JSON.parse(cleanJson(response.text || "{}")) as SocialMediaStrategy;
  } catch (error) {
    console.error("Social media generation failed:", error);
    throw error;
  }
};