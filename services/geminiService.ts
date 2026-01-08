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
      description: "H1 titel: Kort, krachtig en bevat het hoofdzoekwoord (max 60 tekens)." 
    },
    metaDescription: { 
      type: Type.STRING,
      description: "Meta omschrijving (max 155 karakters, CTR focus)."
    },
    canonicalUrl: {
      type: Type.STRING,
      description: "De volledige, absolute URL waar deze blog komt te staan. Gebruik format: 'https://creativeuseoftechnology.com/blog/[slug-van-titel]'"
    },
    geoStrategy: { type: Type.STRING, description: "Korte uitleg over hoe Breda/Lokaal is verwerkt." },
    headerImageAlt: { type: Type.STRING, description: "SEO ALT tekst." },
    keywordsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
    internalLinksUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
    schemaMarkup: { 
      type: Type.STRING, 
      description: "Een valid JSON-LD string. BELANGRIJK: Bij 'AggregateRating' MOET 'bestRating': '10' toegevoegd worden omdat de score > 5 is." 
    },
    semanticEntities: {
      type: Type.ARRAY,
      description: "Lijst van 3-5 technische kernbegrippen voor Knowledge Graph mapping.",
      items: {
        type: Type.OBJECT,
        properties: {
          concept: { type: Type.STRING, description: "Het begrip (bijv. 'Vectorbestand')." },
          definition: { type: Type.STRING, description: "De wikipedia-style definitie (1 zin)." }
        }
      }
    },
    faq: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { 
            type: Type.STRING, 
            description: "De vraag. KORT en DIRECT (bijv: 'Is acrylaat duurzaam?')." 
          },
          answer: { 
            type: Type.STRING, 
            description: "Het antwoord. Geoptimaliseerd voor VOICE SEARCH: Direct, beknopt (max 2 zinnen) en feitelijk. GEEN enters/newlines." 
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
          layout: { 
            type: Type.STRING, 
            enum: ['hero', 'full_width', 'two_column_image_left', 'two_column_image_right', 'cta_block', 'feature_highlight', 'quote_block'],
            description: "Kies 'feature_highlight' voor technische specs/materials. Kies 'quote_block' voor reviews/quotes."
          },
          heading: { type: Type.STRING, description: "H2/H3 Titel: Bondig (max 8 woorden), SEO-rijk, Sentence case." },
          snippet: {
            type: Type.STRING,
            description: "ZERO-CLICK HEADER: Een dikgedrukte samenvatting (max 20 woorden) die DIRECT het antwoord geeft op de kop. Dit is voor Featured Snippets."
          },
          content: { type: Type.STRING },
          ctaText: { type: Type.STRING, description: "Actiegericht en specifiek voor de URL (bijv: 'Bekijk [ProductNaam]'). Geen 'Klik hier'." },
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

  // Define logic for framework selection
  let frameworkInstruction = "";
  if (framework === 'auto') {
      frameworkInstruction = `
      Kies dynamisch één van de volgende frameworks en pas de JSON 'sections' hierop aan:
      A. 'Inspiration Guide' (Brede termen): Intro (Lead-in Summary) -> 5-7 ideeën -> Waarom personalisatie werkt -> Call to Action.
      B. 'Service Expert' (Specifieke diensten): Intro (Lead-in Summary) -> De techniek achter het graveren/snijden -> Materiaalkeuze -> FAQ.
      C. 'Business Gift' (Zakelijk): Focus op duurzaamheid, logo-personalisatie en grote aantallen.
      D. 'Process Behind' (Autoriteit/Techniek): Leg de techniek uit. Benadruk lokaal in Breda.
      `;
  } else {
      // Force specific framework
      const frameworkMapping: Record<string, string> = {
          'inspiration': "'Inspiration Guide': Structureer als Intro (Lead-in Summary) -> 5-7 unieke ideeën (als lijst/kopjes) -> Waarom personalisatie werkt -> Call to Action.",
          'expert': "'Service Expert': Structureer als Intro (Lead-in Summary) -> De techniek achter de dienst -> Materiaalkeuze (hout/plexiglas) -> Technische FAQ.",
          'business': "'Business Gift': Focus op B2B. Structuur: Intro (Lead-in Summary) -> Voordelen van unieke geschenken -> Duurzaamheid & Impact -> Logo personalisatie -> Aanvraag info.",
          'comparison': "'Product Comparison': Vergelijk materialen of opties. Gebruik een structuur die de lezer helpt kiezen (bijv. Eiken vs Walnoot).",
          'process': "'Behind the Scenes': Leg stap voor stap uit hoe het gemaakt wordt in Breda. Focus op vakmanschap en machines."
      };
      frameworkInstruction = `FORCEER FRAMEWORK: ${frameworkMapping[framework] || "Volg de gebruikersinstructie."}`;
  }

  const prompt = `
    ROL: Je bent de Senior Content Strateeg van Creative Use of Technology (CUT). 
    DOEL: Genereer een blog die informatief, technisch geoptimaliseerd (GEO) en visueel aantrekkelijk is.

    ${BRAND_VOICE}
    
    === GEO (GENERATIVE ENGINE OPTIMIZATION) STRATEGIE (CRUCIAAL) ===
    
    1. **ENTITY DEFINITION (LEAD-IN SUMMARY):**
       Identificeer de belangrijkste 'entiteit' van de blog (het onderwerp). 
       Definieer deze entiteit DIRECT in de eerste alinea (Intro) op een manier die een kennismodel (LLM) direct kan categoriseren.
       - Structuur: "[Onderwerp] is een [Categorie] die [Belangrijkste Functie/Kenmerk]."
       - Dit moet dienen als de 'Lead-in Summary' snippet voor Google/AI.

    2. **DATA-FIRST WRITING (Bewijs):**
       Vermijd lege bijvoeglijke naamwoorden zoals "prachtig", "uniek" of "leuk" als ze niet worden ondersteund door bewijs.
       Vervang ze door feitelijke eigenschappen uit de INPUT DATA (afmetingen, materialen, certificering).
       - FOUT: "Een prachtige houten kaart."
       - GOED: "Een houten kaart van 6mm dik FSC-gecertificeerd eikenfineer."

    3. **SEMANTIC TRIPLET STRUCTURE & LINKING (RELATIES):**
       Bouw koppen en kernzinnen op rondom relaties: [Onderwerp] -> [Eigenschap] -> [Voordeel].
       - Voorbeeld: "Eikenhout (Entiteit) is van nature hard (Eigenschap), wat zorgt voor een krasvast oppervlak (Voordeel)."
       - **KOPPELING:** Zorg dat paragrafen logisch in elkaar overlopen door concepten expliciet aan elkaar te linken. Als je het over "Duurzaamheid" hebt, verwijs dan terug naar het "Materiaal" dat eerder is genoemd.

    4. **CITATION-READY STYLE (Toon):**
       Schrijf in een objectieve, deskundige toon.
       - VERBODEN CLICHÉS: "In de wereld van vandaag", "Laten we dieper duiken", "Conclusie", "Ontdek de magie".
       - DOEL: Schrijf alsof je de brontekst bent voor een Wikipedia-artikel.

    5. **ZERO-CLICK HEADER STRATEGIE:**
       Voor ELKE H2 kop, genereer je een 'snippet'. Dit is één krachtige, dikgedrukte zin die DIRECT onder de kop komt te staan.
       Deze zin beantwoordt de vraag van de kop direct.
       - Kop: "Is lasergraveren duurzaam?"
       - Snippet: "Ja, lasergraveren is een duurzaam proces omdat er geen inkt of chemicaliën worden gebruikt en het afval minimaal is."

    6. **ENTITY MAPPING & CANONICAL:**
       - Identificeer de 3-5 belangrijkste technische entiteiten in de tekst.
       - Genereer de **'canonicalUrl'**. Dit is cruciaal voor distributie. Maak een slug van de titel en plak deze achter 'https://creativeuseoftechnology.com/blog/'.

    === INTENT-FIRST & VALIDATIE ===
    - **H1:** Het focus-keyword MOET in de titel staan.
    - **Header 1:** De allereerste sectie moet het zoekwoord in de eerste 100 woorden bevatten (Entity Definition).
    - **Actie-Werkwoorden:** Als de intentie 'graveren' of 'maken' is, gebruik dan koppen die dit proces uitleggen (bijv. "Hoe het laserproces werkt").
    - **FAQ:** Voeg onderaan een 'Q&A Blok' toe met de 3 meest gestelde vragen, geformuleerd voor 'People Also Ask'.

    ${SITEMAP_CONTEXT}
    
    === LINKING STRATEGIE (CRUCIAAL & STRIKT) ===
    1. **ALLEEN GESELECTEERDE LINKS:** Gebruik UITSLUITEND de URL's die hieronder staan bij 'BESCHIKBARE LINKS'.
    2. **GEEN FANTASIE:** Verzin NOOIT zelf een URL. Als er geen passende productlink is in de lijst, plaats dan GEEN link.
    3. **CTA MATCH:** De tekst op de knop (ctaText) moet direct slaan op de pagina waarheen gelinkt wordt.
    4. **NATUURLIJK:** Verwerk interne links in de lopende tekst waar mogelijk.

    BESCHIKBARE LINKS (Kies hieruit):
    ${productContextList}

    === DIEPGAANDE PRODUCT INTEGRATIE ===
    De gebruiker heeft productinformatie aangeleverd. GEBRUIK DEZE INFORMATIE ACTIEF!
    - Benoem specifieke materialen (bijv. FSC hout, gerecycled acrylaat) die in de input staan.
    - Benoem specifieke afmetingen of technische details als ze relevant zijn.
    - Haal unieke eigenschappen uit de "KORTE OMSCHRIJVING" en "DETAILS" van de input.

    === VISUELE LAYOUT & CREATIVITEIT ===
    Maak gebruik van de beschikbare layouts om "Walls of text" te voorkomen:
    - Gebruik 'feature_highlight' voor het uitlichten van materialen, specificaties of unieke voordelen.
    - Gebruik 'quote_block' voor het tonen van een klantreview (uit de input data) of een krachtig statement.
    - Wissel af: Hero -> Text -> Highlight -> Image Left -> Quote -> Image Right -> CTA.

    === SCHEMA MARKUP (JSON-LD) ===
    Genereer in het veld 'schemaMarkup' een complete JSON-LD string.
    CRITICAAL VOOR GOOGLE:
    1. 'Article' (BlogPosting) is de hoofd-entiteit.
    2. Als er producten zijn: Voeg 'Product' schema toe.
    3. VOOR REVIEW SCORES (AggregateRating):
       - Als je 9.6 gebruikt, MOET je "bestRating": "10" toevoegen.
       - Structuur: {"@type": "AggregateRating", "ratingValue": "9.6", "reviewCount": "2150", "bestRating": "10", "worstRating": "1"}

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

    === WRITING GUIDELINES ===
    1. **Content:** Schrijf converterende tekst. Als een sectie een afbeelding heeft, refereer hiernaar.
    2. **Opmaak:** GEEN markdown bolding (**) in de JSON strings.
    3. **JSON SYNTAX (CRITICAAL):** 
       - GEEN newlines (\n) in JSON strings.
       - Houd 'question' en 'answer' velden op 1 regel.

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
        if (!parsed.semanticEntities) parsed.semanticEntities = [];
        if (!parsed.canonicalUrl) {
            // Fallback generation if AI misses it
            const slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            parsed.canonicalUrl = `https://creativeuseoftechnology.com/blog/${slug}`;
        }
        
        parsed.sections.forEach(s => {
            if (!s.content) s.content = "";
            if (!s.heading) s.heading = "";
            if (!s.snippet) s.snippet = "";
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
    
    STRIKTE LINK REGELS BIJ AANPASSINGEN:
    - Verander de bestaande 'ctaUrl' waarden NIET, tenzij expliciet gevraagd in de instructie.
    - Verzin NOOIT nieuwe URL's die niet in de originele data stonden.
    
    REGELS: 
    - Behoud 'Sentence case' in titels.
    - Houd titels kort en bondig.
    - GEEN markdown bolding (**).
    - GEEN newlines in JSON strings.
    - Zorg voor valide JSON output.
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
    if (!parsed.semanticEntities) parsed.semanticEntities = [];
    if (!parsed.canonicalUrl) parsed.canonicalUrl = currentBlog.canonicalUrl;

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