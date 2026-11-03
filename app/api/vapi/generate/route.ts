export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Imports are loaded inside the handlers (not at the top) so that a package
// crashing on load can't break `next build` at "Collecting page data".
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type = "technical",
      role = "Software Developer",
      level = "Junior",
      techstack = "",
      amount = 5,
      userid,
      userId = userid,
    } = body;

    const { generateText } = await import("ai");
    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    const { db } = await import("@/firebase/admin");
    const { getRandomInterviewCover } = await import("@/lib/utils");

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API key is missing");
    const google = createGoogleGenerativeAI({ apiKey });

    const { text } = await generateText({
      model: google(process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"),
      abortSignal: AbortSignal.timeout(45_000),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted as a valid JSON array of strings:
        ["Question 1", "Question 2", "Question 3"]
    `,
    });

    // Robustly extract JSON array from model output
    let questionsList: string[] = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questionsList = JSON.parse(jsonMatch[0]);
      } else {
        const cleaned = text.replace(/```json|```/g, "").trim();
        questionsList = JSON.parse(cleaned);
      }
    } catch (parseError) {
      console.warn("Falling back to line-based parsing for questions:", parseError);
      questionsList = text
        .split("\n")
        .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
        .filter((line) => line.length > 5);
    }

    const parsedTechstack = Array.isArray(techstack)
      ? techstack
      : typeof techstack === "string"
      ? techstack.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    const interview = {
      role,
      type,
      level,
      techstack: parsedTechstack,
      questions: questionsList,
      userId: userId || userid || "",
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error generating interview questions:", error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
