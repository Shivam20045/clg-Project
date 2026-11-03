"use server";

import { getCurrentUser } from "@/lib/actions/auth.action";

export async function createInterview(params: {
  role: string;
  level: string;
  type: string;
  techstack: string;
  amount: number;
}) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false as const, error: "Please sign in again to create an interview." };
    }

    const { generateInterview } = await import("@/lib/interview-generation");
    const interviewId = await generateInterview({
      role: params.role,
      level: params.level,
      type: params.type,
      techstack: params.techstack,
      amount: params.amount,
      userId: user.id,
    });

    return { success: true as const, interviewId };
  } catch (error) {
    console.error("Interview creation failed:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not create the interview. Please try again.",
    };
  }
}
