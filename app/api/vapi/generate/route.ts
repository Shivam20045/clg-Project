export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Imports are loaded inside the handlers (not at the top) so that a package
// crashing on load can't break `next build` at "Collecting page data".
export async function POST(request: Request) {
  try {
    const { type, role, level, techstack, amount, userid } =
      await request.json();

    const { generateText } = await import("ai");
    const { google } = await import("@ai-sdk/google");
    const { db } = await import("@/firebase/admin");
    const { getRandomInterviewCover } = await import("@/lib/utils");

    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
    `,
    });

    // Gemini sometimes wraps JSON in ```json fences
    const cleaned = text.replace(/```json|```/g, "").trim();

    const interview = {
      role,
      type,
      level,
      techstack: String(techstack).split(","),
      questions: JSON.parse(cleaned),
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
