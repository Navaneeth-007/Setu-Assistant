import { GoogleGenerativeAI } from '@google/generative-ai';
import { stadiumKnowledge } from '../data/stadiumKnowledge';
import type { GateStatus, FanReport } from './firebase';

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
const mockChatResponse = (message: string, language: string): string => {
  const msg = message.toLowerCase();
  const lang = language.toLowerCase();
  
  const isSpanish = lang.includes('es') || lang.includes('span');
  
  if (msg.includes('restroom') || msg.includes('bathroom') || msg.includes('toilet') || msg.includes('wc') || msg.includes('baño')) {
    if (isSpanish) {
      return "Hay baños accesibles para todos los géneros en la Sección 105 y Sección 324. Baños separados para hombres y mujeres se encuentran en las Secciones 114, 203 y 302. El baño en la Sección 302 tiene una cabina accesible para sillas de ruedas.";
    }
    return "Accessible family/all-gender restrooms are located behind Section 105 and Section 324. Standard Men/Women restrooms are available at Sections 114, 203, and 302. The restroom at Section 302 includes an ADA-compliant wheelchair stall.";
  }
  
  if (msg.includes('food') || msg.includes('eat') || msg.includes('vegan') || msg.includes('burger') || msg.includes('bbq') || msg.includes('comida')) {
    if (isSpanish) {
      return "Las opciones de comida en el Dallas Stadium incluyen: Lone Star Grill (Sección 110 - BBQ de Texas), Verde Cantina (Sección 122 - Tex-Mex con opciones veganas como tacos de yaca) y The Green Bowl (Sección 144 - Ensaladas y hamburguesas veganas).";
    }
    return "Food options in Dallas Stadium include: Lone Star Grill (Section 110 - Texas BBQ), Verde Cantina (Section 122 - Tex-Mex featuring vegan Jackfruit Tacos), and The Green Bowl (Section 144 - Salads and Vegan Burgers).";
  }
  
  if (msg.includes('transit') || msg.includes('home') || msg.includes('metro') || msg.includes('shuttle') || msg.includes('rideshare') || msg.includes('uber') || msg.includes('parking') || msg.includes('transporte')) {
    if (isSpanish) {
      return "El transporte de enlace gratuito de Metro sale del circuito este junto a la Puerta B. Las zonas de recogida de Uber/Lyft se limitan estrictamente al Lote 15 en el lado noreste (7 min a pie de Puerta A). El tren ATL está a 10 min de la Puerta C.";
    }
    return "Free Metro Shuttles run continuously from the East Shuttle Loop outside Gate B. Rideshare pickup (Uber/Lyft) is strictly designated to Lot 15 on the North-East side (7-minute walk from Gate A). The Arlington Transit Link train is a 10-minute walk from Gate C.";
  }
  
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
const MODEL_NAME = 'gemini-2.5-flash';

export const chatWithAssistant = async (
  message: string, 
  language: string, 
  _history: { role: 'user' | 'model'; parts: string[] }[] = []
): Promise<string> => {
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    console.log("No Gemini API key found. Using offline response simulation.");
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockChatResponse(message, language)), 1200);
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

Guidelines:
1. ONLY answer using the facts listed above.
2. If the user asks about something NOT in the database (e.g. current score, ticket purchases, specific player names), state clearly: "I apologize, but as a stadium infrastructure assistant, I do not have access to that real-time game information."
3. Keep response under 3-4 sentences maximum.
`;

    // Construct full system prompt + history
    const chat = model.startChat({
      systemInstruction: contextPrompt,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.2
      }
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (error) {
    console.error("Error in Gemini chat API call:", error);
    return `Connection error. Please verify your Gemini API key in settings. Details: ${(error as Error).message}`;
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
