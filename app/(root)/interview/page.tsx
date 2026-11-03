import Agent from "@/components/Agent";
import { getCurrentUser } from "@/lib/actions/auth.action";

const Page = async () => {
  const user = await getCurrentUser();

  return (
    <>
      <h3>Create interview questions</h3>
      <p>
        This call sets up your interview questions. To get feedback, return to
        the dashboard, choose View Interview on an interview card, and answer
        the questions in that interview.
      </p>

      <Agent
        userName={user?.name!}
        userId={user?.id}
        profileImage={user?.profileURL}
        type="generate"
      />
    </>
  );
};

export default Page;
