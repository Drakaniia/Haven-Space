export function Spinner() {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-mint border-t-primary [animation-duration:650ms]"
    />
  );
}
