import posthog from 'posthog-js';

export const analytics = {
  // User events
  userSignedUp: (userId: string, email: string) => {
    posthog.identify(userId, { email });
    posthog.capture('user_signed_up', { email });
  },

  userLoggedIn: (userId: string) => {
    posthog.identify(userId);
    posthog.capture('user_logged_in');
  },

  // Interview events
  interviewStarted: (sessionId: string, interviewType: string) => {
    posthog.capture('interview_started', {
      session_id: sessionId,
      interview_type: interviewType,
    });
  },

  interviewCompleted: (sessionId: string, interviewType: string, duration: number) => {
    posthog.capture('interview_completed', {
      session_id: sessionId,
      interview_type: interviewType,
      duration_seconds: duration,
    });
  },

  evaluationViewed: (sessionId: string) => {
    posthog.capture('evaluation_viewed', {
      session_id: sessionId,
    });
  },

  // Feature usage
  transcriptViewed: (sessionId: string) => {
    posthog.capture('transcript_viewed', {
      session_id: sessionId,
    });
  },
};
