"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();

  const [callStatus, setCallStatus] = useState<CallStatus>(
    CallStatus.INACTIVE
  );
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [error, setError] = useState("");

  const messagesRef = useRef<SavedMessage[]>([]);
  const feedbackStartedRef = useRef(false);
  const feedbackInProgressRef = useRef(false);
  const mountedRef = useRef(false);

  const lastMessage = messages[messages.length - 1]?.content ?? "";

  useEffect(() => {
    mountedRef.current = true;

    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
      setError("");
    };

    const onCallEnd = () => {
      setIsSpeaking(false);
      setIsEnding(false);
      setCallStatus(CallStatus.FINISHED);
    };

    const onMessage = (message: Message) => {
      if (
        message.type !== "transcript" ||
        message.transcriptType !== "final"
      ) {
        return;
      }

      const content = message.transcript?.trim();

      if (
        !content ||
        !["user", "assistant", "system"].includes(message.role)
      ) {
        return;
      }

      const newMessage: SavedMessage = {
        role: message.role as SavedMessage["role"],
        content,
      };

      // Keep the latest transcript available to the feedback request.
      messagesRef.current = [...messagesRef.current, newMessage];
      setMessages(messagesRef.current);
    };

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);

    const onError = (event: unknown) => {
      console.error("Vapi error:", event);

      setError(
        "Voice call mein error aaya. Browser Console mein details check karo."
      );
      setIsEnding(false);

      setCallStatus((current) =>
        current === CallStatus.CONNECTING
          ? CallStatus.INACTIVE
          : current
      );
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      mountedRef.current = false;

      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);

  const handleGenerateFeedback = async () => {
    if (feedbackInProgressRef.current) return;

    setError("");

    if (!interviewId || !userId) {
      setError(
        "Interview ID ya user ID missing hai. Dashboard se interview dobara kholo."
      );
      return;
    }

    const transcript = [...messagesRef.current];

    if (!transcript.some((message) => message.role === "user")) {
      setError(
        "Tumhare answers ka transcript nahi mila. Microphone permission check karke interview dobara do."
      );
      return;
    }

    feedbackInProgressRef.current = true;
    setIsGeneratingFeedback(true);

    console.log("Starting feedback", {
      interviewId,
      userId,
      transcriptEntries: transcript.length,
    });

    try {
      const result = await createFeedback({
        interviewId,
        userId,
        transcript,
        feedbackId,
      });

      if (!result.success || !result.feedbackId) {
        const detail =
          "error" in result && typeof result.error === "string"
            ? result.error
            : "Feedback generate nahi hua. Server terminal logs check karo.";

        throw new Error(detail);
      }

      if (mountedRef.current) {
        router.push(`/interview/${interviewId}/feedback`);
      }
    } catch (cause) {
      console.error("Feedback request failed:", cause);

      if (mountedRef.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Feedback generate karte waqt error aaya."
        );
      }
    } finally {
      feedbackInProgressRef.current = false;

      if (mountedRef.current) {
        setIsGeneratingFeedback(false);
      }
    }
  };

  useEffect(() => {
    if (callStatus !== CallStatus.FINISHED) return;

    if (type === "generate") {
      router.push("/");
      return;
    }

    if (feedbackStartedRef.current) return;

    // Give final transcript events a short opportunity to arrive.
    // This is a grace period, not a guarantee of transcript delivery.
    const timer = window.setTimeout(() => {
      feedbackStartedRef.current = true;
      void handleGenerateFeedback();
    }, 1000);

    return () => window.clearTimeout(timer);
    // Transcript entries live in messagesRef, so new messages do not
    // restart the timer or submit duplicate requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus, type, router, interviewId, userId, feedbackId]);

  const handleCall = async () => {
    if (
      callStatus === CallStatus.CONNECTING ||
      callStatus === CallStatus.ACTIVE ||
      isGeneratingFeedback ||
      isEnding
    ) {
      return;
    }

    setError("");

    if (!userId) {
      setError("Pehle sign in karo, phir interview start karo.");
      return;
    }

    if (!vapi) {
      setError(
        "Vapi initialize nahi hua. NEXT_PUBLIC_VAPI_WEB_TOKEN check karo."
      );
      return;
    }

    if (type === "generate") {
      if (!process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID) {
        setError("NEXT_PUBLIC_VAPI_WORKFLOW_ID missing hai.");
        return;
      }
    } else if (!interviewId || !questions?.length) {
      setError("Interview ID ya questions missing hain.");
      return;
    }

    messagesRef.current = [];
    setMessages([]);
    feedbackStartedRef.current = false;
    setIsSpeaking(false);
    setCallStatus(CallStatus.CONNECTING);

    try {
      const call =
        type === "generate"
          ? await vapi.start(
              process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!,
              {
                variableValues: {
                  username: userName,
                  userid: userId,
                },
              }
            )
          : await vapi.start(interviewer, {
              variableValues: {
                questions: questions!
                  .map((question) => `- ${question}`)
                  .join("\n"),
              },
            });

      if (!call) {
        throw new Error(
          "Voice call start nahi hui. Browser Console mein Vapi error check karo."
        );
      }
    } catch (cause) {
      console.error("Call start failed:", cause);

      setCallStatus(CallStatus.INACTIVE);
      setError(
        cause instanceof Error
          ? cause.message
          : "Interview call start nahi ho saki."
      );
    }
  };

  const handleDisconnect = async () => {
    if (isEnding || feedbackInProgressRef.current) return;
    setIsEnding(true);

    try {
      // stop() resolves even when the SDK does not emit call-end.
      // Completing either path must start the same feedback flow.
      await vapi.stop();

      if (mountedRef.current) {
        setIsSpeaking(false);
        setIsEnding(false);
        setCallStatus(CallStatus.FINISHED);
      }
    } catch (cause) {
      console.error("Call stop failed:", cause);
      if (mountedRef.current) {
        setIsEnding(false);
        setError("Call end nahi ho saki. Dobara try karo.");
      }
    }
  };

  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="AI interviewer"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="User profile"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {lastMessage && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={messages.length}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-center text-red-400">
          {error}
        </p>
      )}

      <div className="flex w-full flex-wrap justify-center gap-4">
        {isGeneratingFeedback ? (
          <p role="status">Feedback generate ho raha hai…</p>
        ) : callStatus === CallStatus.ACTIVE ? (
          <button
            type="button"
            className="btn-disconnect"
            onClick={handleDisconnect}
            disabled={isEnding}
          >
            {isEnding ? "Ending…" : "End"}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="relative btn-call"
              onClick={() => void handleCall()}
              disabled={
                callStatus === CallStatus.CONNECTING ||
                (callStatus === CallStatus.FINISHED &&
                  type === "generate")
              }
            >
              <span
                className={cn(
                  "absolute animate-ping rounded-full opacity-75",
                  callStatus !== CallStatus.CONNECTING && "hidden"
                )}
              />
              <span className="relative">
                {callStatus === CallStatus.CONNECTING
                  ? "Connecting…"
                  : "Call"}
              </span>
            </button>

            {callStatus === CallStatus.FINISHED &&
              type !== "generate" &&
              error && (
                <button
                  type="button"
                  className="btn-call"
                  onClick={() => void handleGenerateFeedback()}
                >
                  Retry Feedback
                </button>
              )}
          </>
        )}
      </div>
    </>
  );
};

export default Agent;