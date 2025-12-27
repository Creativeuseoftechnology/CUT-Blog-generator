import { GeneratedBlog, ElementorTemplate, ElementorSection, ElementorColumn, ElementorWidget } from "../types";

const generateId = (): string => Math.random().toString(36).substring(2, 9);

export const createElementorTemplate = (blogData: GeneratedBlog): ElementorTemplate => {
  
  const sections: ElementorSection[] = [];

  // --- SECTION 1: HEADER & INTRO ---
  // Contains Alert (temporary), Schema, Title, and Intro text (usually first section)
  const headerWidgets: ElementorWidget[] = [
      createAlertWidget(),
      createSchemaWidget(blogData),
      createHeadingWidget(blogData.title, 'h1'),
  ];
  
  // Add first paragraph text to header section usually
  if (blogData.sections.length > 0) {
      // Intro usually doesn't have a heading in the AI output, or it's the first one
      if (blogData.sections[0].heading) headerWidgets.push(createHeadingWidget(blogData.sections[0].heading, 'h2'));
      headerWidgets.push(createTextWidget(blogData.sections[0].content));
  }

  sections.push(createSingleColumnSection(headerWidgets));


  // --- SECTION 2+: DYNAMIC CONTENT LOOP ---
  // Start from index 1 (since 0 is intro)
  for (let i = 1; i < blogData.sections.length; i++) {
      const sectionData = blogData.sections[i];
      const imageKey = i.toString();
      const hasImage = blogData.imageAltMap && blogData.imageAltMap[imageKey];
      
      // -- CONTENT LOGIC --
      if (hasImage) {
          // CREATE 2-COLUMN LAYOUT (Text | Image)
          // Alternate direction based on index (Even = Text Left, Odd = Text Right) for visual interest
          const isEven = i % 2 === 0;
          const altText = blogData.imageAltMap[imageKey];
          const placeholderUrl = `https://placehold.co/800x600/ec7b5d/ffffff.png?text=Afbeelding+${i+1}`;
          
          const textWidgets = [];
          if (sectionData.heading) textWidgets.push(createHeadingWidget(sectionData.heading, 'h2'));
          textWidgets.push(createTextWidget(sectionData.content));

          const imageWidget = createImageWidget(altText, placeholderUrl);

          sections.push(createTwoColumnSection(textWidgets, [imageWidget], isEven));

      } else {
          // CREATE 1-COLUMN LAYOUT (Text Only)
          const widgets = [];
          if (sectionData.heading) widgets.push(createHeadingWidget(sectionData.heading, 'h2'));
          widgets.push(createTextWidget(sectionData.content));
          sections.push(createSingleColumnSection(widgets));
      }
  }

  return {
    version: "0.4",
    title: blogData.title,
    type: "page",
    content: sections
  };
};

// --- SECTION BUILDERS ---

function createSingleColumnSection(widgets: ElementorWidget[]): ElementorSection {
    return {
        id: generateId(),
        elType: "section",
        settings: { margin: { unit: 'px', top: 20, bottom: 20, left: 0, right: 0 } },
        elements: [{
            id: generateId(),
            elType: "column",
            settings: { _column_size: 100 },
            elements: widgets
        }]
    };
}

function createTwoColumnSection(leftWidgets: ElementorWidget[], rightWidgets: ElementorWidget[], reverse: boolean): ElementorSection {
    const col1 = {
        id: generateId(),
        elType: "column",
        settings: { _column_size: 50, widget_space: {unit: 'px', size: 20} },
        elements: leftWidgets
    } as ElementorColumn;

    const col2 = {
        id: generateId(),
        elType: "column",
        settings: { _column_size: 50 },
        elements: rightWidgets
    } as ElementorColumn;

    return {
        id: generateId(),
        elType: "section",
        settings: { margin: { unit: 'px', top: 40, bottom: 40, left: 0, right: 0 } },
        elements: reverse ? [col2, col1] : [col1, col2] // Swap columns for layout variety
    };
}

// --- WIDGET HELPERS ---

function createAlertWidget(): ElementorWidget {
    return {
        id: generateId(),
        elType: "widget",
        widgetType: "alert",
        settings: {
            alert_title: "⚠️ IMPORT INSTRUCTIES",
            alert_description: "1. Upload afbeeldingen uit ZIP naar Media bieb.\n2. Klik op oranje vlakken en vervang foto's.\n3. Verwijder dit blok.",
            alert_type: "warning"
        },
        elements: []
    };
}

function createHeadingWidget(text: string, tag: string = 'h2'): ElementorWidget {
  return {
    id: generateId(),
    elType: "widget",
    widgetType: "heading",
    settings: { title: text, header_size: tag },
    elements: []
  };
}

function createTextWidget(content: string): ElementorWidget {
  return {
    id: generateId(),
    elType: "widget",
    widgetType: "text-editor",
    settings: { editor: content },
    elements: []
  };
}

function createImageWidget(altText: string, placeholderUrl: string): ElementorWidget {
  return {
    id: generateId(),
    elType: "widget",
    widgetType: "image",
    settings: {
      image: { url: placeholderUrl, id: "", alt: altText }
    },
    elements: []
  };
}

function createSchemaWidget(blogData: GeneratedBlog): ElementorWidget {
  const currentDate = new Date().toISOString();
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": blogData.title,
    "description": blogData.metaDescription,
    "datePublished": currentDate,
    "author": { "@type": "Organization", "name": "Creative Use of Technology" }
  };

  return {
    id: generateId(),
    elType: "widget",
    widgetType: "html",
    settings: { html: `<script type="application/ld+json">${JSON.stringify(schema)}</script>` },
    elements: []
  };
}