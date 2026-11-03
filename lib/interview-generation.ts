import { z } from "zod";

const setupSchema = z.object({
  role: z.string().trim().min(2).max(120),
  level: z.string().trim().min(1).max(60),
  type: z.string().trim().min(1).max(60),
  techstack: z.union([z.string().max(1000), z.array(z.string().max(100)).max(30)]),
  amount: z.coerce.number().int().min(1).max(20),
  userId: z.string().trim().min(1),
});

export async function generateInterview(input: unknown) {
  const setup = setupSchema.parse(input);
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is missing.");

  const { generateObject } = await import("ai");
  const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
  const google = createGoogleGenerativeAI({ apiKey });
  const techstack = (Array.isArray(setup.techstack)
    ? setup.techstack
    : setup.techstack.split(","))
    .map((tech) => tech.trim())
    .filter(Boolean);

  const { object } = await generateObject({
    model: google(process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", {
      structuredOutputs: false,
    }),
    schema: z.object({
      questions: z.array(z.string().trim().min(1)).length(setup.amount),
    }),
    abortSignal: AbortSignal.timeout(45_000),
    prompt: `Create exactly ${setup.amount} interview questions for a ${setup.level} ${setup.role}.
Focus: ${setup.type}. Tech stack: ${techstack.join(", ") || "general role knowledge"}.
Return questions suitable for reading aloud, without markdown formatting.`,
  });

  const { db } = await import("@/firebase/admin");
  const { getRandomInterviewCover } = await import("@/lib/utils");
  const interview = await db.collection("interviews").add({
    role: setup.role,
    level: setup.level,
    type: setup.type,
    techstack,
    questions: object.questions,
    userId: setup.userId,
    finalized: true,
    coverImage: getRandomInterviewCover(),
    createdAt: new Date().toISOString(),
  });

  return interview.id;
}
