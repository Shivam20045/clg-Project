"use server";

import { db } from "@/firebase/admin";

export async function createFeedback(params: CreateFeedbackParams) {
  let stage = "validation";

  try {
    const { interviewId, userId, transcript, feedbackId } = params;

    if (!interviewId || !userId) {
      throw new Error("Missing interviewId or userId");
    }

    if (!transcript?.length) {
      throw new Error("No transcript received from the interview");
    }

    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Gemini API key is missing");
    }

    const formattedTranscript = transcript
      .map(({ role, content }) => `${role}: ${content}`)
      .join("\n");

    if (!transcript.some(
      ({ role, content }) => role === "user" && content.trim()
    )) {
      throw new Error("Transcript contains no user answers");
    }

    console.log("Feedback input validated", {
      interviewId,
      userId,
      transcriptEntries: transcript.length,
    });

    stage = "Gemini generation";

    // Load generation dependencies only when evaluating a completed interview.
    // Reading saved feedback must not initialize the AI SDK during page collection.
    const { generateObject } = await import("ai");
    const { feedbackSchema } = await import("@/constants");
    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    const provider = createGoogleGenerativeAI({ apiKey });

    const { object } = await generateObject({
      model: provider(
        process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        { structuredOutputs: false }
      ),
      schema: feedbackSchema,
      abortSignal: AbortSignal.timeout(45_000),
      system: "You are a professional mock interview evaluator.",
      prompt: `
Evaluate the candidate's answers in this interview transcript:
${formattedTranscript}

Score each category from 0 to 100. Use these exact category names in this order:
- Communication Skills
- Technical Knowledge
- Problem Solving
- Cultural Fit
- Confidence and Clarity

Provide category comments, an overall score, strengths,
areas for improvement, and a final assessment.
`,
    });

    stage = "Firestore save";

    const feedbackRef = feedbackId
      ? db.collection("feedback").doc(feedbackId)
      : db.collection("feedback").doc();

    await feedbackRef.set({
      interviewId,
      userId,
      ...object,
      createdAt: new Date().toISOString(),
    });

    console.log("Feedback saved:", feedbackRef.id);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    console.error(`Feedback failed during ${stage}:`, error);

    return {
      success: false,
      error: `Feedback failed during ${stage}: ${message}`,
    };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  // Never pass missing IDs to Firestore query constraints.
  if (!interviewId || !userId) return null;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .limit(limit)
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}
