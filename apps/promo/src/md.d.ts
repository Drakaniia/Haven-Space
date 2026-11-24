// .md files are bundled as plain text (see remotion.config.ts).
declare module '*.md' {
  const source: string;
  export default source;
}
