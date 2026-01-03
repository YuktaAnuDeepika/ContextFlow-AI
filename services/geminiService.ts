
import { GoogleGenAI } from "@google/genai";
import { AIResponse } from "../types";

// Always use process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const queryAI = async (
  prompt: string, 
  context: string,
  history: { role: string, content: string }[]
): Promise<AIResponse> => {
  try {
    const relevantHistory = history.slice(-10);

    const systemInstruction = `
      You are ContextFlow AI Assistant, a high-performance RAG (Retrieval-Augmented Generation) engine.
      
      CORE MISSION: 
      You possess a PRIVATE KNOWLEDGE BASE (found in the CONTEXT section). 
      Your priority is to answer using information from these files.
      
      CRITICAL RULES:
      1. If the information is in the PRIVATE DATA section, you MUST use it.
      2. If you use information from a file, you MUST set "sourceUsed" to the filename.
      3. If the user asks about data not in the files, use your general knowledge but clarify it's not from their private data.
      4. Always return valid JSON matching this structure:
         {
           "text": "Your markdown response here",
           "detectedAction": "create_task" | "generate_report" | null,
           "actionData": { "title": "...", "description": "...", "dueDate": "ISO timestamp" },
           "visualization": { 
              "type": "bar" | "line" | "pie", 
              "title": "Clear Chart Title", 
              "data": [{"name": "A", "value": 10}, ...],
              "xAxisKey": "name",
              "yAxisKey": "value"
           },
           "sourceUsed": "filename.csv"
         }

      DATA VISUALIZATION:
      - If the user asks for a summary of a CSV or numerical data, you MUST include a "visualization" object.
      - Keep chart data simple (max 10-15 points).
      - For "pie" charts, ensure values are percentages or parts of a whole.

      AUTOMATION:
      - detectedAction: "generate_report" if user wants a summary/table.
      - detectedAction: "create_task" if user wants to schedule or remember something.

      CURRENT CONTEXT (USER DATA & FILES):
      ${context}
    `;

    const contents = relevantHistory.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    // Use gemini-3-pro-preview for complex reasoning and data analysis tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: contents as any,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    // Extract text directly from response.text property (not a method)
    const rawText = response.text || "{}";
    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseError) {
      console.error("JSON Parse Error. Raw text:", rawText);
      return {
        text: rawText.length > 50 ? rawText : "The AI returned an invalid response format.",
      };
    }

    return {
      text: result.text || "Analysis complete.",
      detectedAction: result.detectedAction,
      actionData: result.actionData,
      sourceUsed: result.sourceUsed,
      visualization: result.visualization
    };
  } catch (error: any) {
    console.error("AI Query Error:", error);
    if (error.message?.includes("token count exceeds")) {
      return {
        text: "The dataset is too large. Truncating context further.",
      };
    }
    return {
      text: "Error communicating with Context Engine.",
    };
  }
};
