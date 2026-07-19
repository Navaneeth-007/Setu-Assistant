import { GoogleGenerativeAI } from '@google/generative-ai';
import { stadiumKnowledge } from '../data/stadiumKnowledge';
import type { BroadcastMessage, GateStatus, FanReport, FacilityStatus } from './firebase';

// Helper to get Gemini API key
export const getGeminiApiKey = (): string | null => {
  return localStorage.getItem('setu_gemini_api_key');
};

export const saveGeminiApiKey = (key: string) => {
  localStorage.setItem('setu_gemini_api_key', key);
};

// -------------------------------------------------------------
// MOCK RESPONSES FOR OFFLINE MODE (No API Key)
// -------------------------------------------------------------
const mockChatResponse = (
  message: string,
  language: string,
  gates?: GateStatus[],
  facilities?: FacilityStatus[],
  broadcasts?: BroadcastMessage[]
): string => {
  const msg = message.toLowerCase();
  const lang = language.toLowerCase();

  const isSpanish = lang.includes('es') || lang.includes('span');

  // Public ops announcements are live fan-facing information.
  if ((msg.includes('alert') || msg.includes('announcement') || msg.includes('broadcast') || msg.includes('update')) && broadcasts && broadcasts.length > 0) {
    const latestBroadcast = broadcasts[0];
    return isSpanish
      ? `Aviso activo del estadio: ${latestBroadcast.message}`
      : `Active stadium announcement: ${latestBroadcast.message}`;
  }

  // Real-time crowd, wait time, or congestion queries
  if (msg.includes('crowd') || msg.includes('wait') || msg.includes('line') || msg.includes('busy') || msg.includes('queue') || msg.includes('occupancy') || msg.includes('congestion') || msg.includes('gente') || msg.includes('espera') || msg.includes('fila') || msg.includes('cola')) {
    if (gates && gates.length > 0) {
      // Check if a specific gate is mentioned
      for (const gate of gates) {
        if (msg.includes(gate.name.toLowerCase()) || msg.includes(gate.id.replace('-', ' ').toLowerCase())) {
          return isSpanish
            ? `Estado en tiempo real para ${gate.name}: Ocupación ${gate.occupancy}%, Tiempo de espera: ${gate.waitTime}. Estado: ${gate.status}.`
            : `Real-time status for ${gate.name}: Occupancy is ${gate.occupancy}%, current wait time is ${gate.waitTime} (${gate.status}).`;
        }
      }
    }
    if (facilities && facilities.length > 0) {
      // Check if a specific facility is mentioned
      for (const fac of facilities) {
        const normalizedFacName = fac.name.toLowerCase();
        if (msg.includes(fac.id.toLowerCase()) || msg.includes(normalizedFacName) || (fac.id === 'lone-star-grill' && msg.includes('lone star')) || (fac.id === 'verde-cantina' && msg.includes('verde')) || (fac.id === 'green-bowl' && msg.includes('green bowl')) || (fac.id === 'merch-store' && msg.includes('merch'))) {
          return isSpanish
            ? `Estado en tiempo real para ${fac.name}: Ocupación ${fac.occupancy}%, Tiempo de espera: ${fac.waitTime}. Estado: ${fac.status}.`
            : `Real-time status for ${fac.name}: Occupancy is ${fac.occupancy}%, current wait time is ${fac.waitTime} (${fac.status}).`;
        }
      }
    }

    // Fallback/General crowd query
    if (gates && gates.length > 0) {
      const gateStatusStr = gates.map(g => `${g.name}: ${g.waitTime} wait (${g.occupancy}% full, ${g.status})`).join('\n');
      return isSpanish
        ? `Aquí está el estado actual del flujo de multitudes en las puertas:\n${gateStatusStr.replace(/wait/g, 'de espera').replace(/full/g, 'lleno')}`
        : `Here is the current real-time crowd status at the gates:\n${gateStatusStr}`;
    }
  }
  
  // Specific Restroom Queries
  if (msg.includes('restroom') || msg.includes('bathroom') || msg.includes('toilet') || msg.includes('wc') || msg.includes('baño')) {
    if (msg.includes('105')) {
      return isSpanish
        ? "El baño más cercano para la Sección 105 es el baño familiar/para todos los géneros, ubicado directamente detrás del puesto de comida en la Sección 105."
        : "The nearest restroom for Section 105 is the All-Gender / Family Restroom located directly behind the concession stand in Section 105 on the outer concourse loop.";
    }
    if (msg.includes('114')) {
      return isSpanish
        ? "El baño más cercano para la Sección 114 es el de hombres/mujeres situado junto a la entrada de la Puerta B."
        : "The nearest restroom for Section 114 is the Men's / Women's Restroom located adjacent to the Gate B entrance. Men's is on the right, Women's is on the left.";
    }
    if (msg.includes('203')) {
      return isSpanish
        ? "Para la Sección 203, hay baños para hombres/mujeres en el nivel superior de la explanada, a mitad de camino entre las Secciones 203 y 204 (no es totalmente accesible para sillas de ruedas)."
        : "For Section 203, there is a Men's / Women's Restroom on the upper concourse level, halfway between Section 203 and 204 (note: this facility is not fully wheelchair accessible).";
    }
    if (msg.includes('302')) {
      return isSpanish
        ? "Para la Sección 302, hay baños para hombres/mujeres en el nivel superior, directamente frente al portal de la Sección 302. Cuenta con una cabina accesible para sillas de ruedas."
        : "For Section 302, there is an ADA-compliant Men's / Women's Restroom on the top level, directly opposite the Section 302 seating portal.";
    }
    if (msg.includes('324')) {
      return isSpanish
        ? "Para la Sección 324, el baño más cercano es el familiar/para todos los géneros cerca del área de ascensores E, detrás de la Sección 324 (incluye cambiadores)."
        : "For Section 324, the nearest restroom is the All-Gender / Family Restroom near elevator bay E, behind Section 324. Includes baby changing tables.";
    }

    // General Restroom request
    if (isSpanish) {
      return "Con gusto le ayudaré a encontrar el baño más cercano. Por favor, seleccione su sección de asientos más cercana:\n- [Sección 105](action:nearest_restroom_105)\n- [Sección 114](action:nearest_restroom_114)\n- [Sección 203](action:nearest_restroom_203)\n- [Sección 302](action:nearest_restroom_302)\n- [Sección 324](action:nearest_restroom_324)";
    }
    return "I would be happy to direct you to the nearest restroom. Please select your nearest seating section below:\n- [Section 105](action:nearest_restroom_105)\n- [Section 114](action:nearest_restroom_114)\n- [Section 203](action:nearest_restroom_203)\n- [Section 302](action:nearest_restroom_302)\n- [Section 324](action:nearest_restroom_324)";
  }

  // Specific Exit Queries
  if (msg.includes('exit') || msg.includes('gate') || msg.includes('salida') || msg.includes('puerta')) {
    if (msg.includes('105')) {
      return isSpanish
        ? "Para la Sección 105, la salida más cercana es la Puerta A (Plaza Noreste cerca del Estacionamiento 3). Salga por la explanada principal y siga los letreros verdes de salida."
        : "For Section 105, the nearest exit is **Gate A** (North-East Plaza near Lot 3). It is about a 2-minute walk. Turn left out of the seating portal and follow the Exit signs.";
    }
    if (msg.includes('114')) {
      return isSpanish
        ? "Para la Sección 114, la salida más cercana es la Puerta B (Plaza Este, junto al circuito de Metro Shuttles)."
        : "For Section 114, the nearest exit is **Gate B** (East Plaza adjacent to the Metro Shuttle Loop). Walk straight through the concourse. Level-surface entry is available.";
    }
    if (msg.includes('203')) {
      return isSpanish
        ? "Para la Sección 203, la salida más cercana es la Puerta A (Plaza Noreste) en el nivel inferior. Hay ascensores disponibles en el vestíbulo de la puerta."
        : "For Section 203, the nearest exit is **Gate A** (North-East Plaza near Lot 3) on the lower level. Elevators are available in the gate lobby.";
    }
    if (msg.includes('302')) {
      return isSpanish
        ? "Para la Sección 302, la salida más cercana es la Puerta D (Plaza Oeste cerca de la Fan Zone). Baje las escaleras o use el ascensor hasta la explanada principal."
        : "For Section 302, the nearest exit is **Gate D** (West Plaza near the Fan Zone). Take the stairs or elevator down to the West Plaza exit.";
    }
    if (msg.includes('324')) {
      return isSpanish
        ? "Para la Sección 324, la salida más cercana es la Puerta B (Plaza Este) a través del área de ascensores E."
        : "For Section 324, the nearest exit is **Gate B** (East Plaza) via elevator bay E.";
    }

    // General Exit Request
    if (isSpanish) {
      return "Para indicarle la salida más cercana, por favor seleccione su sección de asientos más cercana:\n- [Sección 105](action:nearest_exit_105)\n- [Sección 114](action:nearest_exit_114)\n- [Sección 203](action:nearest_exit_203)\n- [Sección 302](action:nearest_exit_302)\n- [Sección 324](action:nearest_exit_324)";
    }
    return "To guide you to the nearest exit, please select your nearest seating section below:\n- [Section 105](action:nearest_exit_105)\n- [Section 114](action:nearest_exit_114)\n- [Section 203](action:nearest_exit_203)\n- [Section 302](action:nearest_exit_302)\n- [Section 324](action:nearest_exit_324)";
  }
  
  // Specific Food Queries
  if (msg.includes('food') || msg.includes('eat') || msg.includes('vegan') || msg.includes('burger') || msg.includes('bbq') || msg.includes('comida') || msg.includes('concession') || msg.includes('restaurant') || msg.includes('cantina') || msg.includes('grill') || msg.includes('bowl')) {
    if (msg.includes('lone star') || msg.includes('grill') || msg.includes('bbq') || msg.includes('brisket')) {
      return isSpanish
        ? "Lone Star Grill (Sección 110) ofrece comida clásica tejana como el Sándwich de Brisket Ahumado, Papas con Queso y Chile, y Costillas Glaseadas con Dr Pepper. No cuenta con opciones veganas."
        : "Lone Star Grill at Section 110 serves classic Texas BBQ and burgers. Popular items include the Smoked Brisket Sandwich, Jumbo Chili Cheese Fries, and Dr Pepper Glazed Ribs. There are no vegan options here.";
    }
    if (msg.includes('verde cantina') || msg.includes('cantina') || msg.includes('mex') || msg.includes('taco')) {
      return isSpanish
        ? "Verde Cantina (Sección 122) ofrece comida Tex-Mex y cuenta con opciones veganas. Los platos populares incluyen Quesadillas de Fajita, Tacos de Yaca Veganos, Nachos Grandes y Margaritas Congeladas (21+)."
        : "Verde Cantina at Section 122 serves delicious Tex-Mex. Vegan options are available. Popular items include Fajita Quesadillas, Vegan Jackfruit Tacos, Nachos Grande, and Frozen Margaritas (21+).";
    }
    if (msg.includes('green bowl') || msg.includes('bowl') || msg.includes('salad')) {
      return isSpanish
        ? "The Green Bowl (Sección 144 - Patio de Comidas) ofrece tazones saludables y ensaladas. Es muy apto para veganos. Los platos populares incluyen el Tazón de Proteína de Quinua, Wrap de Aguacate y Garbanzos, y Hamburguesa Vegana."
        : "The Green Bowl at Section 144 (Food Court) serves healthy bowls and salads. It is highly vegan-friendly. Popular items include the Quinoa Protein Bowl, Avocado & Chickpea Wrap, Acai Berry Smoothie, and the signature Vegan Burger.";
    }
    if (msg.includes('merch') || msg.includes('munchies') || msg.includes('snack') || msg.includes('pretzel')) {
      return isSpanish
        ? "Merch & Munchies (Sección 312) ofrece bocadillos clásicos de estadio. Es apto para veganos. Los artículos populares incluyen el Pretzel Gigante, Palomitas de Maíz con Mantequilla, Hot Dogs y Refrescos Rellenables."
        : "Merch & Munchies at Section 312 serves classic stadium snacks. It is vegan-friendly. Popular items include the Giant Soft Pretzel, Buttered Popcorn, Hot Dogs, and Refillable Souvenir Sodas.";
    }

    // General Concessions list
    if (isSpanish) {
      return "Aquí tiene las principales concesiones de comida en el Dallas Stadium:\n- [Lone Star Grill](action:food_lone_star) (Sección 110): Texas BBQ y Hamburguesas.\n- [Verde Cantina](action:food_verde_cantina) (Sección 122): Comida Tex-Mex (Opciones veganas).\n- [The Green Bowl](action:food_the_green_bowl) (Sección 144): Tazones Saludables y Ensaladas (Apto para veganos).\n- [Merch & Munchies](action:food_merch_&_munchies) (Sección 312): Snacks clásicos de estadio.\n\nHaga clic en cualquiera para ver el menú detallado.";
    }
    return "Here are the top food concessions available at Dallas Stadium:\n- [Lone Star Grill](action:food_lone_star) (Section 110): Texas BBQ & Burgers.\n- [Verde Cantina](action:food_verde_cantina) (Section 122): Tex-Mex (Vegan options).\n- [The Green Bowl](action:food_the_green_bowl) (Section 144): Healthy Bowls & Salads (Vegan options).\n- [Merch & Munchies](action:food_merch_&_munchies) (Section 312): Classic Stadium Snacks.\n\nClick on any concession below to view their detailed menu options.";
  }

  // Transit and Parking
  if (msg.includes('transit') || msg.includes('home') || msg.includes('metro') || msg.includes('shuttle') || msg.includes('rideshare') || msg.includes('uber') || msg.includes('parking') || msg.includes('transporte')) {
    if (isSpanish) {
      return "El transporte de enlace gratuito de Metro sale del circuito este junto a la Puerta B. Las zonas de recogida de Uber/Lyft se limitan estrictamente al Lote 15 en el lado noreste (7 min a pie de Puerta A). El tren ATL está a 10 min de la Puerta C.";
    }
    return "Free Metro Shuttles run continuously from the East Shuttle Loop outside Gate B. Rideshare pickup (Uber/Lyft) is strictly designated to Lot 15 on the North-East side (7-minute walk from Gate A). The Arlington Transit Link train is a 10-minute walk from Gate C.";
  }
  
  // Bag Policy
  if (msg.includes('bag') || msg.includes('policy') || msg.includes('rules') || msg.includes('mochila') || msg.includes('regla')) {
    if (isSpanish) {
      return "Se aplica estrictamente una política de bolsas transparentes. Solo se permiten bolsas de plástico transparente que no excedan las 12\" x 6\" x 12\". Los bolsos de mano pequeños de menos de 4.5\" x 6.5\" están permitidos.";
    }
    return "A clear bag policy is strictly enforced. Only clear plastic, vinyl, or PVC bags not exceeding 12\" x 6\" x 12\" are allowed. Small clutches under 4.5\" x 6.5\" are permitted.";
  }

  if (isSpanish) {
    return "Hola. Soy SETU, tu asistente del Dallas Stadium. Puedo ayudarte a encontrar baños, comida, transporte o las reglas de la bolsa. Por favor, especifica tu pregunta o usa uno de los accesos directos.";
  }
  return "Hello. I am SETU, your Dallas Stadium Assistant. I can help you find restrooms, concessions, transit, or bag rules. Please specify your question or use one of the quick shortcut buttons.";
};

const mockTriage = (category: string, location: string, description: string) => {
  const cat = category.toLowerCase();
  const desc = description.toLowerCase();
  
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let summary = `New report in ${location} regarding ${category}`;
  
  if (cat.includes('medical') || desc.includes('heart') || desc.includes('bleed') || desc.includes('unconscious') || desc.includes('collapse') || desc.includes('injur')) {
    severity = 'critical';
    summary = `Medical emergency at ${location}: ${description.substring(0, 40)}...`;
  } else if (cat.includes('safety') || cat.includes('security') || desc.includes('fight') || desc.includes('steal') || desc.includes('weapon') || desc.includes('threat')) {
    severity = 'high';
    summary = `Security threat near ${location}: ${description.substring(0, 40)}...`;
  } else if (cat.includes('crowd') || desc.includes('crush') || desc.includes('stampede') || desc.includes('jammed') || desc.includes('overcrowd')) {
    severity = 'medium';
    summary = `Crowd density concern at ${location}`;
  } else if (cat.includes('access') || desc.includes('wheelchair') || desc.includes('barrier') || desc.includes('ramp')) {
    severity = 'medium';
    summary = `Accessibility barrier reported at ${location}`;
  } else if (cat.includes('lost') || desc.includes('child') || desc.includes('missing')) {
    severity = 'high';
    summary = `Lost person report near ${location}`;
  } else if (desc.includes('spill') || desc.includes('water') || desc.includes('leak') || desc.includes('trash')) {
    severity = 'low';
    summary = `Clean-up request at ${location}`;
  }
  
  return { severity, summary };
};

const mockBrief = (gates: GateStatus[], reports: FanReport[]) => {
  const criticalGates = gates.filter(g => g.occupancy >= 80);
  const unresolvedReports = reports.filter(r => r.status === 'pending');
  const criticalReports = unresolvedReports.filter(r => r.severity === 'critical' || r.severity === 'high');
  
  const actions: { title: string; description: string; type: 'critical' | 'warning' | 'info' }[] = [];
  
  // Gate action
  if (criticalGates.length > 0) {
    const gateNames = criticalGates.map(g => g.name).join(' & ');
    actions.push({
      title: `Reroute Traffic from ${gateNames}`,
      description: `Reroute incoming fans away from ${gateNames} using stadium broadcast and signage. Current occupancy is exceeding safety thresholds.`,
      type: 'critical'
    });
  } else {
    actions.push({
      title: "Monitor Gate Intake Rates",
      description: "Intake rates are steady. Keep automated routing recommendations active at Gate D.",
      type: 'info'
    });
  }
  
  // Report action
  if (criticalReports.length > 0) {
    const firstRep = criticalReports[0];
    actions.push({
      title: `Address ${firstRep.category} Emergency`,
      description: `Respond to ${firstRep.category} incident in ${firstRep.location}. Description: "${firstRep.description.substring(0, 50)}..."`,
      type: 'warning'
    });
  }
  
  // General fallback action
  actions.push({
    title: "Prepare Post-Match Transit Protocol",
    description: "Coordinate shuttle dispatches at East Shuttle Loop. Busiest exit routes expected at Gate A.",
    type: 'info'
  });
  
  return { actions: actions.slice(0, 3) };
};

// -------------------------------------------------------------
// GENAI GEMINI CALLS
// -------------------------------------------------------------

// Core model configuration
const MODEL_NAME = 'gemini-3.5-flash';

export const chatWithAssistant = async (
  message: string, 
  language: string, 
  gates?: GateStatus[],
  facilities?: FacilityStatus[],
  broadcasts?: BroadcastMessage[],
  _history: { role: 'user' | 'model'; parts: string[] }[] = []
): Promise<string> => {
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    console.log("No Gemini API key found. Using offline response simulation.");
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockChatResponse(message, language, gates, facilities, broadcasts)), 1200);
    });
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: MODEL_NAME });

    // Format knowledge base context
    const contextPrompt = `
You are SETU, a high-performance Generative AI Stadium Assistant for Dallas Stadium at the FIFA World Cup 2026.
You are calm, authoritative, and extremely reliable.
Provide highly structured, direct, and concise answers to help stadium visitors under pressure.
Do not introduce yourself, and avoid conversational filler like "Sure, I can help with that."

Answer in the language: ${language}.

Here is the strict ground truth about Dallas Stadium:
---
Stadium Name: ${stadiumKnowledge.stadiumName} in ${stadiumKnowledge.location}
Bag Policy: ${stadiumKnowledge.generalRules.bagPolicy}
Re-entry Policy: ${stadiumKnowledge.generalRules.reEntry}
Gate Opening Times: ${stadiumKnowledge.generalRules.gateOpeningTimes}
Prohibited Items: ${stadiumKnowledge.generalRules.prohibitedItems.join(', ')}

Available Gates:
${stadiumKnowledge.gates.map(g => `- ${g.name}: ${g.locationDescription}. Recommended for sections: ${g.recommendedForSections.join(', ')}. Accessibility: ${g.accessibilityRoutes}. Wait info: ${g.generalWaitTimeInfo}`).join('\n')}

Restrooms:
${stadiumKnowledge.restrooms.map(r => `- Location: ${r.location}, Accessible: ${r.accessible}, Type: ${r.gender}, Directions: ${r.directions}`).join('\n')}

Food Concessions:
${stadiumKnowledge.foodConcessions.map(f => `- ${f.name} at ${f.location}: Serves ${f.cuisineType}. Vegan Options: ${f.veganOptions}. Popular items: ${f.popularItems.join(', ')}`).join('\n')}

Transit and Parking:
- Metro Shuttles: ${stadiumKnowledge.transitAndParking.shuttles}
- Uber/Lyft rideshare zones: ${stadiumKnowledge.transitAndParking.uberLyftZone}
- Public train station: ${stadiumKnowledge.transitAndParking.publicTransit}
- Parking details: ${stadiumKnowledge.transitAndParking.parkingLots}
---

Real-Time Telemetry and Crowd Data (incorporate this into answers about wait times, crowd level, occupancy, or current facility status):
--- Real-time Gate States ---
${gates && gates.length > 0 ? gates.map(g => `- ${g.name}: Occupancy ${g.occupancy}%, Wait Time: ${g.waitTime}, Status: ${g.status}`).join('\n') : 'No real-time gate telemetry available.'}

--- Real-time Facility States ---
${facilities && facilities.length > 0 ? facilities.map(f => `- ${f.name} (${f.type}): Occupancy ${f.occupancy}%, Wait Time: ${f.waitTime}, Status: ${f.status}`).join('\n') : 'No real-time facility telemetry available.'}

--- Current Public Stadium Announcements ---
${broadcasts && broadcasts.length > 0 ? broadcasts.slice(0, 3).map(b => `- ${b.message}`).join('\n') : 'No active public stadium announcements.'}
---

Guidelines:
- ONLY answer using the facts and real-time telemetry listed above.
- Answer in the language: ${language}.
- Real-Time Data Integration:
  * When asked about lines, crowds, wait times, or how busy/occupied a gate, concession, or restroom is, use the "Real-Time Telemetry and Crowd Data" listed above.
  * Provide the exact occupancy percentage and wait time from the real-time telemetry. Do NOT make up numbers or wait times.
  * When asked about alerts, announcements, or operational updates, use only the Current Public Stadium Announcements above.
- Restroom & Exit requests logic:
  * If a section number is NOT mentioned in the query: Respond with a list of exactly these 5 sections to click: [Section 105](action:nearest_restroom_105), [Section 114](action:nearest_restroom_114), [Section 203](action:nearest_restroom_203), [Section 302](action:nearest_restroom_302), and [Section 324](action:nearest_restroom_324) (use "nearest_exit" instead of "nearest_restroom" for exit requests).
  * If a section number IS mentioned (e.g. "Section 302" or "105"): Do not output the list. Directly answer with the location details of the nearest restroom/exit for that section from the facts.
- Food & Concessions:
  * If asking generally about food or concessions, list all 4 options formatted exactly as:
    - [Lone Star Grill](action:food_lone_star) (Section 110): Texas BBQ & Burgers.
    - [Verde Cantina](action:food_verde_cantina) (Section 122): Tex-Mex.
    - [The Green Bowl](action:food_the_green_bowl) (Section 144): Healthy Bowls & Salads.
    - [Merch & Munchies](action:food_merch_&_munchies) (Section 312): Classic Stadium Snacks.
  * If asking about a specific restaurant, describe its menu, location, and vegan options.
- Tone: Speak in a professional, direct stadium agent tone. Avoid conversational filler. Use as much detail as needed to give a complete, useful answer.
- If the user asks about something NOT in the database or real-time telemetry (e.g. current score, ticket purchases, specific player names), state clearly: "I apologize, but as a stadium infrastructure assistant, I do not have access to that real-time game information."
`;

    // Construct full system prompt + history
    const chat = model.startChat({
      systemInstruction: {
        role: 'system',
        parts: [{ text: contextPrompt }]
      },
      generationConfig: {
        maxOutputTokens: 1600,
        temperature: 0.2
      }
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (error) {
    console.warn("Gemini API error (possibly quota exceeded), falling back to offline simulation:", error);
    // Graceful fallback to mock response so the user can still test all options
    return mockChatResponse(message, language, gates, facilities, broadcasts);
  }
};

export const triageReport = async (
  category: string, 
  location: string, 
  description: string
): Promise<{ severity: 'low' | 'medium' | 'high' | 'critical'; summary: string }> => {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return mockTriage(category, location, description);
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
You are a stadium safety dispatch AI. Analyze this ticket and triage it:
Category: ${category}
Location: ${location}
Description: ${description}

Classify severity into exactly one of: "low", "medium", "high", "critical".
Create a short (max 8 words) plain-English summary of the issue.

Respond STRICTLY in JSON format matching this schema:
{
  "severity": "low" | "medium" | "high" | "critical",
  "summary": "plain english summary"
}
Do not write markdown, code blocks, or explanations. Respond with pure JSON.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Parse json
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini triage failed, falling back to mock rules:", error);
    return mockTriage(category, location, description);
  }
};

export const generateSituationBrief = async (
  gates: GateStatus[], 
  reports: FanReport[]
): Promise<{ actions: { title: string; description: string; type: 'critical' | 'warning' | 'info' }[] }> => {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockBrief(gates, reports)), 1500);
    });
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: MODEL_NAME });

    const gateData = gates.map(g => `${g.name}: Occupancy ${g.occupancy}%, Wait: ${g.waitTime}, status: ${g.status}`).join('\n');
    const reportData = reports.length === 0 
      ? "No reports submitted." 
      : reports.map(r => `- [Severity: ${r.severity}, Category: ${r.category}, Loc: ${r.location}]: ${r.description} (${r.status})`).join('\n');

    const prompt = `
You are a stadium Operations Decision-Support AI.
Analyze the following real-time stadium telemetry and reports:

--- Real-time Gate States ---
${gateData}

--- Real-time Fan Reports ---
${reportData}

Identify the top 2-3 most critical operational actions staff need to take.
Actions must address bottlenecks at gates, medical or safety emergencies, or major accessibility issues.

Respond STRICTLY in JSON format matching this schema:
{
  "actions": [
    {
      "title": "Action title (short, uppercase)",
      "description": "Short, clear operational instruction for staff",
      "type": "critical" | "warning" | "info"
    }
  ]
}
Return at most 3 actions. Make them highly contextual based on the gates and reports listed. Do not include markdown code block tags. Output pure JSON.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini situation brief failed, falling back to mock:", error);
    return mockBrief(gates, reports);
  }
};
