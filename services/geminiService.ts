
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Exercise, VocabWord, WordDetails } from "../types";

// Helper to get key from storage or env
const getApiKey = () => {
  return localStorage.getItem('mandarin_app_api_key') || process.env.API_KEY || '';
};

// Helper for exponential backoff retry
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check for 429 (Resource Exhausted) or similar quota errors
    const isRateLimit = 
      error?.status === 429 || 
      error?.code === 429 || 
      (error?.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')));

    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
      await sleep(delay);
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Helper to clean JSON string from LLM response
const cleanJsonString = (text: string) => {
  if (!text) return "{}";
  let clean = text.trim();
  
  // Remove markdown code blocks
  clean = clean.replace(/```json/g, '').replace(/```/g, '');
  
  // Attempt to find the outermost JSON object or array
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  
  let start = -1;
  if (firstBrace === -1 && firstBracket === -1) {
    // No JSON structure found
    return text; 
  }
  
  if (firstBrace !== -1 && firstBracket === -1) start = firstBrace;
  else if (firstBrace === -1 && firstBracket !== -1) start = firstBracket;
  else start = Math.min(firstBrace, firstBracket);
  
  let end = -1;
  // If it starts with {, look for last }. If [, look for last ].
  if (clean[start] === '{') {
      end = clean.lastIndexOf('}');
  } else {
      end = clean.lastIndexOf(']');
  }
  
  if (end !== -1 && end > start) {
      clean = clean.substring(start, end + 1);
  }

  // Remove JS-style comments (//...)
  clean = clean.replace(/\/\/.*$/gm, '');

  // Remove trailing commas in arrays/objects: [ "a", ] -> [ "a" ]
  clean = clean.replace(/,(\s*[\]}])/g, '$1');
  
  return clean;
}

const safeJsonParse = <T>(text: string, fallback: T): T => {
    try {
        const cleaned = cleanJsonString(text);
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Parse failed", e);
        console.debug("Original text:", text);
        // Try one more aggressive cleanup: regex out everything that isn't JSON-like chars? No, too risky.
        return fallback;
    }
}

export const generateLearningMaterial = async (
  stage: string,
  topic: string,
  point: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are an expert IGCSE Mandarin tutor. 
    Create a learning module for a student at **${stage}**.
    The specific topic is "**${topic}**".
    The specific learning point is "**${point}**".

    Structure the content into **multiple distinct sections/slides** using the separator "---".
    
    Required Structure:
    1. **Introduction**: Briefly introduce the main concept in English.
    2. **Detailed Breakdown**: Split the concept into smaller, digestible sub-points. 
       - For example, if teaching "Tones", create separate sections for "First Tone", "Second Tone", etc.
       - If teaching "Numbers", group them logically (e.g., 1-10, then 11-20).
       - Ensure each section focuses on ONE specific aspect.
    3. **Summary**: A brief conclusion or wrap-up.

    Content Style:
    - **Language Requirement**: All instructional text should be in clear English.
    - **Bilingual Examples**: EVERY time you use Chinese text (characters), you **MUST** provide the **Pinyin** and **English translation** immediately.
    - **Format**: Use the format: **Chinese Characters (Pinyin)** - *English Meaning*.
      - Example: **你好 (nǐ hǎo)** - *Hello*
    - Use Markdown formatting (Headers, bolding) to make it readable.
    - KEEP IT ENGAGING but CONCISE.
    
    IMPORTANT: You MUST use "---" on a new line to separate every section.
    Do NOT generate exercises yet.
  `;

  try {
    const result = await callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          maxOutputTokens: 4000, 
        }
      });
      return response.text;
    });

    return result || "## Error\nNo content generated.";
  } catch (error) {
    console.error("Gemini API Error (Material):", error);
    throw error; // Propagate error so UI can handle it
  }
};

export const generateExercises = async (
  stage: string,
  topic: string,
  point: string,
  learningMaterialContext: string
): Promise<Exercise[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return [];
  
  const ai = new GoogleGenAI({ apiKey });

  // Robust check for Vocabulary mode
  const isVocabularyMode = 
    (stage.includes('Stage 1') || stage.includes('Foundations')) && 
    (topic.toLowerCase().includes('vocabulary') || point.toLowerCase().includes('vocabulary'));

  const prompt = `
    You are an expert IGCSE Mandarin tutor.
    Context:
    - Stage: ${stage}
    - Topic: ${topic}
    - Learning Point: ${point}
    - Learning Material (Context):
    ${learningMaterialContext.substring(0, 5000)}

    **Task**: Generate a set of practice exercises based on the provided Learning Material.

    **Generation Rules**:
    ${isVocabularyMode ? `
    **SPECIAL VOCABULARY MODE**:
    The user wants to strictly focus on **READING** (identifying characters) and **WRITING** (copying/typing characters).
    
    IMPORTANT: **SELECT ONLY THE TOP 4 MOST IMPORTANT WORDS** from the material.
    
    For EACH of the 4 selected words, generate EXACTLY these 3 exercises (Total ~12 exercises):
    
    1. **Reading (Meaning)**: 
       - Type: 'quiz'
       - Question: Show the **Chinese Character(s)**. (e.g. "What is the meaning of: [Chinese]")
       - Options: 4 choices. One correct English meaning, 3 distractors.
       
    2. **Reading (Pinyin)**: 
       - Type: 'quiz'
       - Question: Show the **Chinese Character(s)**. (e.g. "Select the correct Pinyin for: [Chinese]")
       - Options: 4 choices. One correct Pinyin, 3 distractor Pinyin (similar tones/sounds).
       
    3. **Writing (Copy/Recall)**: 
       - Type: 'translation'
       - Question: Show the **English and Pinyin**. (e.g. "Write the character for: [English] ([Pinyin])")
       - Answer: The correct Chinese character(s).
    ` : `
    1. **Per Sub-point**: Identify key sub-points (max 5). For EACH, generate **3 Exercises**:
       - **Exercise A (Easy)**: Multiple choice quiz.
       - **Exercise B (Medium)**: Translation or Fill-in-the-blank.
       - **Exercise C (Hard)**: Composition or complex translation.
    2. **Mixed Practice**: Generate **3 Extra Exercises** that mix concepts.
    `}

    3. **Language Requirements**: 
       - The 'question' field should be in **Simplified Chinese** where appropriate (e.g., "请选择" for Select), but ensure the student understands what to do.
       - You MUST provide an **English translation** of the question in the 'questionTranslation' field.

    **Output Format**:
    Return a single valid JSON object. Do not include markdown formatting like \`\`\`json.
    
    {
      "exercises": [
        {
          "type": "quiz",
          "question": "请选择...",
          "questionTranslation": "Select the...",
          "answer": "Answer",
          "options": ["Option A", "Option B", "Option C", "Option D"]
        },
        {
          "type": "translation",
          "question": "请写出...",
          "questionTranslation": "Write the...",
          "answer": "Model Answer"
        }
      ]
    }
  `;

  try {
    const result = await callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 8192,
        }
      });
      return response.text;
    });

    let text = result || "";
    const parsed = safeJsonParse(text, { exercises: [] });
    
    if (parsed.exercises && Array.isArray(parsed.exercises)) return parsed.exercises;
    if (Array.isArray(parsed)) return parsed;
    
    return [];

  } catch (error) {
    console.error("Gemini API Error (Exercises):", error);
    return [];
  }
};

export const generateImage = async (context: string): Promise<string | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  
  const ai = new GoogleGenAI({ apiKey });

  // Enhance prompt for style
  const prompt = `Draw a simple, friendly, flat-design illustration (vector art style, solid colors) for a Mandarin Chinese educational app. 
  Context: ${context.substring(0, 150)}. 
  The image should be culturally neutral or positive, suitable for teenagers. No text in the image. White background preferred.`;
  
  try {
    const result = await callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
      });
      return response;
    });

    if (result.candidates?.[0]?.content?.parts) {
      for (const part of result.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    return null;
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  
  const ai = new GoogleGenAI({ apiKey });

  // Clean markdown for speech
  const speechText = text.replace(/[*#_]/g, '').substring(0, 500); // Limit length for TTS

  try {
    const result = await callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: speechText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      return response;
    });

    const base64Audio = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
};

export const getChatResponse = async (
  message: string, 
  contextMaterial: string,
  history: { role: 'user' | 'model', text: string }[]
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "I'm missing my API Key! Please ask your tutor to check their settings.";
  
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are a friendly and helpful Mandarin tutor for a teenager. 
  The student is currently interacting with this content:
  ---
  ${contextMaterial.substring(0, 4000)}
  ---
  Answer their questions about this material or Mandarin in general. Keep answers brief, encouraging, and clear.`;

  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I didn't catch that.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Sorry, I'm having trouble thinking right now.";
  }
};

// --- Vocabulary Specific Functions ---

export const generateVocabularyList = async (category: string): Promise<VocabWord[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error: any = new Error("MISSING_API_KEY");
    error.message = 'MISSING_API_KEY';
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Generate a list of 12 common, essential Mandarin vocabulary words for the category: "${category}".
    Target level: IGCSE / HSK 2-3.
    
    Return ONLY a JSON array with objects containing:
    - character (Simplified Chinese)
    - pinyin (with tone marks)
    - meaning (English)

    Output format: STRICT JSON array. NO markdown. NO trailing commas.
    Example: [{"character": "苹果", "pinyin": "píng guǒ", "meaning": "apple"}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    let text = response.text || "[]";
    const parsed = safeJsonParse(text, []);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Vocab List Error:", error);
    return [];
  }
};

export const generateWordDetails = async (word: string): Promise<WordDetails | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Provide details for the Chinese word: "${word}".
    Return a JSON object with:
    - character
    - pinyin
    - meaning
    - exampleSentenceCh (Simple sentence using the word)
    - exampleSentenceEn (English translation of the sentence)

    Output format: STRICT JSON object. NO markdown. NO trailing commas.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });
    
    let text = response.text || "{}";
    return safeJsonParse(text, null);
  } catch (error) {
    console.error("Word Detail Error:", error);
    return null;
  }
};
