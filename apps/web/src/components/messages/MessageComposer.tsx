import { useEffect, useId, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { ApiRequestError } from '../../lib/api/http';
import { MAX_MESSAGE_CHARS, MAX_MESSAGE_IMAGES, composerError } from '../../lib/messages';
import { Button, buttonClasses } from '../ui/Button';

/**
 * The message box (spec `messages-feature-review` §4.3/R18/R19).
 *
 * The draft lives in this component's own state, never in query data, so the
 * thread's 5s poll can never wipe in-progress typing (F13/R18) and a failed send
 * can restore what was typed (R19). Enter inserts a newline as users expect in a
 * message box; the Send button sends, and ⌘/Ctrl+Enter is a shortcut.
 */
export function MessageComposer({
  onSend,
  initialText = '',
  autoFocus = false,
}: {
  /** Resolves once the message is stored; rejects so the draft can be restored. */
  onSend: (input: { text: string; files: File[] }) => Promise<void>;
  initialText?: string;
  autoFocus?: boolean;
}) {
  const [body, setBody] = useState(initialText);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const counterId = useId();

  // Object URLs are created once per file and revoked when they leave the list,
  // so a long session never leaks blobs.
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviews(urls);

    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  const validation = composerError({ body, attachmentCount: files.length });

  function pickFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = [...(event.target.files ?? [])];

    if (picked.length === 0) return;

    if (files.length + picked.length > MAX_MESSAGE_IMAGES) {
      setError(`A message can have at most ${MAX_MESSAGE_IMAGES} images.`);
    } else {
      setError(null);
      setFiles(previous => [...previous, ...picked]);
    }

    // Clear the input so picking the same file again still fires `change`.
    event.target.value = '';
  }

  async function send() {
    const text = body.trim();

    if (sending) return;

    const problem = composerError({ body: text, attachmentCount: files.length });

    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setSending(true);

    try {
      await onSend({ text, files });
      setBody('');
      setFiles([]);
    } catch (failure) {
      // R19: the draft survives a failed send; the message never appears twice.
      setError(failure instanceof ApiRequestError ? failure.message : 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      {previews.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-2">
          {previews.map((preview, index) => (
            <li key={preview} className="relative">
              <img
                src={preview}
                alt={`Attached image ${index + 1}`}
                className="h-14 w-14 rounded-lg object-cover"
              />
              <button
                type="button"
                aria-label={`Remove attached image ${index + 1}`}
                onClick={() => setFiles(previous => previous.filter((_, i) => i !== index))}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-ink/80 px-1.5 text-xs font-bold text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="sr-only" htmlFor={`${counterId}-body`}>
        Message
      </label>
      <textarea
        id={`${counterId}-body`}
        value={body}
        autoFocus={autoFocus}
        rows={2}
        maxLength={MAX_MESSAGE_CHARS + 200}
        aria-describedby={`${counterId}-counter`}
        placeholder="Write a message…"
        onChange={event => setBody(event.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full resize-y rounded-lg border border-border-strong bg-surface px-3 py-2 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      {error ? <p className="mt-2 text-sm text-error-ink">{error}</p> : null}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* A real `<label>` for the picker, so the control is reachable and
              named for screen readers as well as for a mouse (spec §7). */}
          <label
            htmlFor={`${counterId}-files`}
            className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'cursor-pointer' })}
          >
            Add photos
          </label>
          <input
            id={`${counterId}-files`}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={pickFiles}
          />
          {files.length > 0 ? (
            <span className="text-xs text-gray-ink">
              {files.length} of {MAX_MESSAGE_IMAGES} images
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <span
            id={`${counterId}-counter`}
            className={`text-xs ${
              body.trim().length > MAX_MESSAGE_CHARS ? 'font-semibold text-error-ink' : 'text-muted'
            }`}
          >
            {body.trim().length.toLocaleString()} / {MAX_MESSAGE_CHARS.toLocaleString()}
          </span>
          <Button
            type="button"
            size="sm"
            disabled={sending || validation !== null}
            onClick={() => void send()}
          >
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
