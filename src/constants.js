export const questions_schema = {
  title: "Questions",
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          A: { type: "string" },
          B: { type: "string" },
          C: { type: "string" },
          D: { type: "string" },
          correct_option: { type: "string", enum: ["A", "B", "C", "D"] },
        },
        required: ["question", "A", "B", "C", "D", "correct_option"],
      },
      minItems: 5,
      maxItems: 5,
    },
  },
  required: ["questions"],
};
