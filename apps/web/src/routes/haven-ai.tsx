import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { chatStream, type AiHistoryMessage } from '../lib/api/ai';
import { useAuth } from '../lib/auth-context';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { LoginPromptOverlay } from '../components/ai/LoginPromptOverlay';
import { buttonClasses } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

export const Route = createFileRoute('/haven-ai')({
  component: HavenAiPage,
});

/**
 * Starter questions. Haven AI is given the current listings plus general knowledge of the app, so
 * these stay within what it can actually answer (rooms, and how things work here).
 */
const SUGGESTIONS = [
  'Which rooms are under ₱5,000 a month?',
  'Which rooms have air-conditioning?',
  'What should I check when I visit a room?',
  'How do I log a rent payment?',
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

function AiMark({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const box = size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-8 w-8 rounded-xl';
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-mint text-primary ${box}`}
    >
      <Icon name="sparkles" size={size === 'lg' ? 24 : 16} />
    </span>
  );
}

function AssistantMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <AiMark />
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-xs font-semibold text-gray-ink">Haven AI</p>
        <div className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink">
          {children}
        </div>
      </div>
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
  // Shown only before a guest has used their free question.
  const showGuestAllowance = isHydrated && !isAuthenticated && guestPromptsUsed === 0;

  return (
    <div className="flex h-dvh flex-col bg-cream text-ink">
      <PublicNavbar />

      <main className="flex min-h-0 flex-1 flex-col">
        {/* Messages / empty state */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {!hasMessages && !loading ? (
            <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-4 py-10 sm:px-6">
              <div className="rise-in">
                <AiMark size="lg" />
                <h1 className="display-lg mt-6 text-ink">What are you looking for?</h1>
                <p className="mt-4 max-w-lg text-lg leading-relaxed text-gray-ink">
                  Ask Haven AI about the rooms listed here, or how renting through Haven works. It
                  answers in plain language and points you to the right page.
                </p>
              </div>

              <div className="mt-10">
                <p className="text-sm font-semibold text-ink">Try asking</p>
                <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
                  {SUGGESTIONS.map(suggestion => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        disabled={guestBlocked}
                        onClick={() => sendMessage(suggestion)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[0.9375rem] text-ink transition-colors hover:bg-subtle focus-visible:bg-subtle disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent"
                      >
                        <Icon name="search" size={16} className="text-primary" />
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div
              role="log"
              aria-label="Conversation with Haven AI"
              aria-busy={loading}
              className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6"
            >
              {history.map((msg, index) =>
                msg.role === 'user' ? (
                  <div key={index} className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary-strong px-4 py-3 text-[0.9375rem] leading-relaxed text-white sm:max-w-[75%]">
                      <span className="sr-only">You: </span>
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  <AssistantMessage key={index}>{msg.content}</AssistantMessage>
                )
              )}

              {loading ? (
                <AssistantMessage>
                  {streamingContent ? (
                    <>
                      {streamingContent}
                      <span
                        aria-hidden="true"
                        className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle"
                      />
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-gray-ink">
                      <span aria-hidden="true" className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </span>
                      Thinking
                    </span>
                  )}
                </AssistantMessage>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    dailyLimitHit
                      ? 'border-warning-border bg-warning-tint text-warning-ink'
                      : 'border-error-border bg-error-tint text-error-ink'
                  }`}
                >
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-cream/95 px-4 pb-4 pt-3 sm:px-6">
          <div className="mx-auto max-w-2xl">
            {guestBlocked ? (
              <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink">Log in or sign up to keep chatting with Haven AI.</p>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/auth/login?redirect=${REDIRECT_PATH}`}
                    className={buttonClasses({ size: 'sm' })}
                  >
                    Log in
                  </a>
                  <a
                    href={`/auth/choose?redirect=${REDIRECT_PATH}`}
                    className={buttonClasses({ variant: 'outline', size: 'sm' })}
                  >
                    Sign up
                  </a>
                </div>
              </div>
            ) : null}

            <form
              onSubmit={onSubmit}
              className="flex items-end gap-2 rounded-2xl border border-border-strong bg-surface p-2 shadow-card transition-[border-color,box-shadow] duration-150 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgb(59_106_42/0.12)]"
            >
              <label htmlFor="haven-ai-input" className="sr-only">
                Message Haven AI
              </label>
              <textarea
                id="haven-ai-input"
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
                  guestBlocked ? 'Log in to continue chatting' : 'Ask about rooms, rent or tours'
                }
                className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[0.9375rem] leading-6 text-ink outline-none [field-sizing:content] placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || guestBlocked || input.trim() === ''}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-strong text-white transition-[background-color,transform] duration-150 hover:bg-primary-hover active:scale-[0.95] disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted disabled:active:scale-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
              </button>
            </form>
            <p className="mt-2 text-center text-xs text-muted">
              {showGuestAllowance
                ? 'You can ask one question without an account. '
                : null}
              Haven AI can make mistakes. Check important details with the landlord.
            </p>
          </div>
        </div>
      </main>

      <LoginPromptOverlay open={showLoginModal} redirect={REDIRECT_PATH} onNotNow={handleNotNow} />
    </div>
  );
}
