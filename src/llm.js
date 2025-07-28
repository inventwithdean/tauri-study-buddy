import { OpenAI } from "openai/client.js";
import { questions_schema } from "./constants";
import { language } from "./study";

export const client = new OpenAI({
  baseURL: "http://localhost:8080/v1",
  apiKey: "nothing",
  dangerouslyAllowBrowser: true,
});
// const model = "gemma-3n-E2B-it-Q4_K_M.gguf";
export const model = "model.gguf";

export async function askLLM(prompt, systemPrompt) {
  const stream = await client.chat.completions.create({
    model: model,
    stream: true,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });
  return stream;
}

export function buildWhatsThisPrompt(selection, pageText) {
  return `Here is a page from a PDF file: ${pageText}\nWhat does ${selection} means here? Reply in ${language} only.`;
}

export function buildDefinePrompt(selection) {
  return `Define "${selection}"`;
}

export function buildTranslatePrompt(selection) {
  return `Translate into ${language}: ${selection}`;
}

export async function summarize(pageText) {
  const stream = await askLLM(
    pageText,
    `You are a ${language} summarizer. Only output in ${language} the summary of the given content in markdown.`
  );
  return stream;
}

export async function generateQuiz(pageText) {
  const userPrompt = `Content: 
  ---
  ${pageText}
  ---
  Reply in format 
  {
  "questions": [
    {
      "question": "First Question",
      "A": "First Option",
      "B": "Second Option",
      "C": "Third Option",
      "D": "Fourth Option",
      "correct_option": "Correct Option alphabet"
    },
    ...
  ]
}
  `;
  const completion = await client.chat.completions.parse({
    model: model,
    messages: [
      {
        role: "system",
        content:
          "You are a Quiz Generator. Generate 5 MCQs from given content with options A, B, C and D with only one correct option with no ambiguity.",
      },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_object",
      schema: questions_schema,
    },
  });
  try {
    const jsonString = completion.choices[0].message["content"];
    if (language != "English") {
      const translatedString = await translateQuiz(jsonString, language);
      return translatedString;
    }
    return jsonString;
  } catch (err) {
    console.error(err);
    return { error: err };
  }
}

export async function translateQuiz(rawQuiz, language) {
  const systemPrompt = `You are a English to ${language} translator. Output only the translation.`;
  const completion = await client.chat.completions.parse({
    model: model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      { role: "user", content: rawQuiz },
    ],
    response_format: {
      type: "json_object",
      schema: questions_schema,
    },
  });
  try {
    const jsonString = completion.choices[0].message["content"];
    return jsonString;
  } catch (err) {
    console.error(err);
    return { error: err };
  }
}
