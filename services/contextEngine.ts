
import { AppState } from "../types";

/**
 * CONTEXT BUILDER SERVICE
 * Structures all available data into a readable format for the AI.
 * Includes safety limits to prevent token overflow.
 */
export const buildContext = (state: AppState): string => {
  const { profile, messages, files } = state;

  // Maximum characters allowed in context to stay well within 1M token limit
  // 400,000 chars is roughly 100,000 tokens, which is safe and performant.
  const MAX_TOTAL_CHARS = 400000;
  const MAX_FILE_CHARS = 100000;

  let context = `--- USER IDENTITY ---
Name: ${profile.name}
Role: ${profile.role}
Instruction: ${profile.preferences}

--- CONVERSATION STATE ---
History Summary: ${messages.slice(-5).map(m => `[${m.role}: ${m.content.slice(0, 100)}...]`).join(' -> ')}

--- PRIVATE KNOWLEDGE BASE ---
`;

  let currentLength = context.length;

  if (files.length > 0) {
    files.forEach((file, index) => {
      if (currentLength > MAX_TOTAL_CHARS) return;

      const fileLabel = `\nFILE [${index + 1}]: ${file.name}\nTYPE: ${file.type}\nCONTENT:\n`;
      let contentToInclude = file.content;

      if (contentToInclude.length > MAX_FILE_CHARS) {
        contentToInclude = contentToInclude.slice(0, MAX_FILE_CHARS) + "\n[... Content truncated due to size ...]";
      }

      const fileEntry = fileLabel + contentToInclude + "\n--- END FILE ---\n";
      
      if (currentLength + fileEntry.length < MAX_TOTAL_CHARS) {
        context += fileEntry;
        currentLength += fileEntry.length;
      } else {
        const remainingSpace = MAX_TOTAL_CHARS - currentLength - fileLabel.length - 50;
        if (remainingSpace > 100) {
          context += fileLabel + contentToInclude.slice(0, remainingSpace) + "\n[... Global context limit reached, file truncated ...]\n--- END FILE ---\n";
          currentLength = MAX_TOTAL_CHARS;
        }
      }
    });
  } else {
    context += "No private files currently uploaded.\n";
  }

  return context;
};
