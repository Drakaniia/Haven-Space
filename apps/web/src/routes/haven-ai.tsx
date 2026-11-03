import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { chatStream, type AiHistoryMessage } from '../lib/api/ai';
import { useAuth } from '../lib/auth-context';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { LoginPromptOverlay } from '../components/ai/LoginPromptOverlay';
import { Icon } from '../components/ui/Icon';

export const Route = createFileRoute('/haven-ai')({
  component: HavenAiPage,
});

const SUGGESTIONS = [
  'Find a room near UST under ₱5,000',
  'When is my next payment due?',
  'Help me submit a maintenance request',
  'Show me rooms with AC near my university',
];

/** Return-to path carried through login/signup so guests resume their chat. */
const REDIRECT_PATH = '/haven-ai';

/**
 * Guest chat state persisted in sessionStorage across the login detour so the
 * conversation (and the blocked question) survive navigating to /auth/* and
 * back. Cleared once it has been acted on.
 */
const PENDING_STATE_KEY = 'haven_ai_pending';

interface PendingChatState {
  history: AiHistoryMessage[];
  pendingMessage: string | null;
  blocked: boolean;
}

function AiAvatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-light text-white">
      <Icon name="sparkles" size={18} />
    </div>
  );
}

function HavenAiPage() {
  const { isAuthenticated, isHydrated, token } = useAuth();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<AiHistoryMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [guestPromptsUsed, setGuestPromptsUsed] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [guestBlocked, setGuestBlocked] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [dailyLimitHit, setDailyLimitHit] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<string | null>(null);

  function persistState(overrides: Partial<PendingChatState>) {
    try {
      sessionStorage.setItem(
        PENDING_STATE_KEY,
        JSON.stringify({
          history,
          pendingMessage: null,
          blocked: false,
          ...overrides,
        } satisfies PendingChatState)
      );
    } catch {
      // sessionStorage unavailable — gating still works for this page load
    }
  }

  function clearPendingState() {
    try {
      sessionStorage.removeItem(PENDING_STATE_KEY);
    } catch {
      // ignore
    }
  }

  async function sendMessage(message: string) {
    const text = message.trim();
    if (!text || loading) return;

    // Guests get one free response per browser (enforced server-side too).
    // Block further sends and prompt them to log in instead.
    if (!isAuthenticated && guestPromptsUsed >= 1) {
      pendingRef.current = text;
      setPendingMessage(text);
      persistState({ pendingMessage: text });
      setShowLoginModal(true);
      return;
    }

    setHistory(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    setError(null);
    setDailyLimitHit(false);
    setStreamingContent('');
    try {
      const result = await chatStream(
        text,
        history,
        delta => {
          setStreamingContent(prev => prev + delta);
        },
        token ?? undefined
      );
      if (result.success && result.response) {
        setHistory(prev => [...prev, { role: 'assistant', content: result.response ?? '' }]);
        if (!isAuthenticated) setGuestPromptsUsed(1);
      } else if (result.code === 'AI_LIMIT_REACHED') {
        if (result.limit?.scope === 'user') {
          setError("You've reached today's limit of 10 Haven AI questions. Come back tomorrow.");
          setDailyLimitHit(true);
        } else {
          // Guest freebie already spent (e.g. after a page reload) — server
          // backstop pops the same login prompt.
          pendingRef.current = text;
          setPendingMessage(text);
          persistState({ pendingMessage: text });
          setShowLoginModal(true);
        }
      } else {
        setError(result.error ?? 'AI assistant unavailable. Please try again later.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'AI assistant unavailable. Please try again later.'
      );
    } finally {
      setLoading(false);
      setStreamingContent('');
    }
  }

  const sendRef = useRef(sendMessage);
  sendRef.current = sendMessage;

  // Restore a guest chat carried over from the login detour (or a manual
  // navigation away and back).
  useEffect(() => {
    let saved: PendingChatState | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_STATE_KEY);
      if (raw) saved = JSON.parse(raw) as PendingChatState;
    } catch {
      // ignore malformed state
    }
    if (!saved) return;

    if (Array.isArray(saved.history)) setHistory(saved.history);

    if (saved.blocked) {
      setGuestBlocked(true);
      setGuestPromptsUsed(1);
    } else if (typeof saved.pendingMessage === 'string' && saved.pendingMessage) {
      pendingRef.current = saved.pendingMessage;
      setPendingMessage(saved.pendingMessage);
    }
  }, []);

  // Once auth state is known, either auto-send the blocked question (the user
  // returned logged in) or re-show the login prompt (they came back as a
  // guest). Also fires when the Google OAuth `#auth=` hash flips auth state.
  useEffect(() => {
    if (!isHydrated || !pendingRef.current) return;

    if (isAuthenticated) {
      const message = pendingRef.current;
      pendingRef.current = null;
      setPendingMessage(null);
      clearPendingState();
      void sendRef.current(message);
    } else {
      setShowLoginModal(true);
    }
  }, [isHydrated, isAuthenticated]);

  function handleNotNow() {
    setShowLoginModal(false);
    setGuestBlocked(true);
    setGuestPromptsUsed(1);
    persistState({ pendingMessage: null, blocked: true });
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading, streamingContent]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    sendMessage(input);
    setInput('');
  }

  const hasMessages = history.length > 0;

  return (
    <div className="flex h-screen flex-col bg-surface text-ink">
      <PublicNavbar />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Messages / empty state */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!hasMessages && !loading ? (
            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-light text-white">
                <Icon name="sparkles" size={24} />
              </div>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink">
                What can I help with?
              </h1>
              <p className="mt-2 max-w-md text-gray-ink">
                Ask Haven AI about rooms, payments, maintenance, or anything about your tenancy.
              </p>
              <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={guestBlocked}
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-xl border border-border bg-surface p-4 text-left text-sm text-gray-ink transition hover:border-primary hover:bg-mint/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
              {history.map((msg, index) =>
                msg.role === 'user' ? (
                  <div key={index} className="flex justify-end">
                    <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary-strong px-4 py-3 text-sm leading-relaxed text-white">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div key={index} className="flex items-start gap-3">
                    <AiAvatar />
                    <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-ink">
                      {msg.content}
                    </div>
                  </div>
                )
              )}

              {loading ? (
                <div className="flex items-start gap-3">
                  <AiAvatar />
                  {streamingContent ? (
                    <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-ink">
                      {streamingContent}
                      <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-primary-strong align-middle" />
                    </div>
                  ) : (
                    <div className="flex gap-1 rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="h-2 w-2 animate-bounce rounded-full bg-gray-ink"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {error ? (
                <p
                  className={`rounded-lg px-4 py-3 text-sm ${
                    dailyLimitHit
                      ? 'bg-warning-tint text-warning-ink'
                      : 'bg-error-tint text-error-ink'
                  }`}
                >
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-surface px-4 py-4">
          <div className="mx-auto max-w-3xl">
            {guestBlocked ? (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-mint/50 px-4 py-3">
                <p className="text-sm text-ink">
                  Log in or sign up to keep chatting with Haven AI.
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/auth/login?redirect=${REDIRECT_PATH}`}
                    className="rounded-full bg-primary-strong px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover"
                  >
                    Log in
                  </a>
                  <a
                    href={`/auth/choose?redirect=${REDIRECT_PATH}`}
                    className="rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-surface"
                  >
                    Sign up
                  </a>
                </div>
              </div>
            ) : null}

            <form
              onSubmit={onSubmit}
              className="flex items-end gap-2 rounded-3xl border border-border-strong bg-surface p-2 shadow-sm focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(74,124,35,0.1)]"
            >
              <textarea
                rows={1}
                value={input}
                disabled={guestBlocked}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit(e);
                  }
                }}
                placeholder={
                  guestBlocked ? 'Log in to continue chatting' : 'Ask Haven AI anything...'
                }
                className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || guestBlocked || input.trim() === ''}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-strong text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-subtle"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </form>
            <p className="mt-2 text-center text-xs text-muted">
              Haven AI can make mistakes. Check important information.
            </p>
          </div>
        </div>
      </main>

      <LoginPromptOverlay open={showLoginModal} redirect={REDIRECT_PATH} onNotNow={handleNotNow} />
    </div>
  );
}
