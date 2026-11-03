import Agent from "@/components/Agent";
import InterviewSetupForm from "@/components/InterviewSetupForm";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";

export const maxDuration = 60;

const Page = async () => {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/sign-in");

  return (
    <>
      <h3>Create an interview</h3>
      <p>Choose your role and questions. Once saved, your mock interview will open. Answer the questions there to receive feedback.</p>
      <InterviewSetupForm />

      <details className="mt-8">
        <summary className="cursor-pointer text-lg">Set up questions using a voice call instead</summary>
        <p className="my-5">After setup, return to the dashboard and select View Interview on your interview card.</p>
        <Agent userName={user.name} userId={user.id} type="generate" />
      </details>
    </>
  );
};

export default Page;
