import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface SkillGapAnalysis {
  currentSkills: string[];
  targetRole: string;
  requiredSkills: { name: string; level: number; importance: string; category: string }[];
  gaps: string[];
  recommendations: { 
    title: string; 
    type: string; 
    description: string; 
    url?: string; 
    targetedSkills: { skillName: string; masteryGain: number }[]; 
    order: number;
    weight: number; 
  }[];
}

export const analyzeSkillGap = async (currentSkills: string[], targetRole: string): Promise<SkillGapAnalysis> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Provide a comprehensive analysis for a user who wants to become a ${targetRole}. 
    1. List exactly 7 to 10 of the most essential skills required for this role (including Programming Languages, Frameworks, Cloud, Soft Skills, Tools, etc.), prioritizing the most critical ones, even if the user might already have some of them.
    2. For each skill, provide a target proficiency level (1-10) and a category.
    3. Based on the user's current skills: ${currentSkills.join(", ")}, identify the specific gaps where they need improvement or lack the skill entirely.
    4. Suggest a COMPLETE learning path consisting of 6 to 12 courses/topics that covers ALL gaps identified. 
       The path MUST be structured such that completing all items results in reaching the target level for all required skills.
       For each recommendation, provide:
       - 'title': Descriptive title.
       - 'type': e.g., 'Course', 'Project', 'Documentation'.
       - 'url': a high-quality learning resource if available.
       - 'targetedSkills': an array of objects specifying WHICH skills from the 'requiredSkills' list this recommendation addresses and the 'masteryGain' (number, usually 1-3) for each. A single course can target multiple skills.
       - 'order': an integer (1, 2, 3...) representing the sequence/priority.
       - 'weight': a number (1-5) representing the relative importance/effort of this item for overall progress.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          currentSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          targetRole: { type: Type.STRING },
          requiredSkills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                level: { type: Type.NUMBER },
                importance: { type: Type.STRING },
                category: { type: Type.STRING }
              },
              required: ["name", "level", "importance", "category"]
            }
          },
          gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                url: { type: Type.STRING },
                targetedSkills: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      skillName: { type: Type.STRING },
                      masteryGain: { type: Type.NUMBER }
                    },
                    required: ["skillName", "masteryGain"]
                  }
                },
                order: { type: Type.NUMBER },
                weight: { type: Type.NUMBER }
              },
              required: ["title", "type", "description", "order", "targetedSkills", "weight"]
            }
          }
        },
        required: ["currentSkills", "targetRole", "requiredSkills", "gaps", "recommendations"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const aiChat = async (messages: { role: 'user' | 'model', content: string }[], userContext?: any) => {
  const chat = ai.chats.create({
    model: "gemini-3.1-pro-preview",
    config: {
      systemInstruction: `You are an expert career coach and technical mentor named SkillGap AI Advisor. 
      Your goal is to help the user achieve their target role: ${userContext?.target_role || 'N/A'}. 
      User's current skills: ${userContext?.skills?.join(', ') || 'None'}.
      Career stage: ${userContext?.career_stage || 'Basic'}.
      Be encouraging, provide specific technical advice, and suggest resources. 
      Keep responses concise but insightful.`
    },
    // Convert messages to history format
    history: messages.slice(0, -1).map(m => ({ 
      role: m.role, 
      parts: [{ text: m.content }] 
    }))
  });

  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage({ 
    message: lastMessage.content 
  });
  
  return result.text;
};
