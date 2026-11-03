export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { generateInterview } = await import("@/lib/interview-generation");
    const interviewId = await generateInterview({
      type: body.type || "Technical",
      role: body.role || "Software Developer",
      level: body.level || "Junior",
      techstack: body.techstack || "",
      amount: body.amount ?? 5,
      userId: body.userId || body.userid,
    });

    return Response.json({ success: true, interviewId }, { status: 200 });
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
