const WORDS = ["no one", "one", "two", "three", "four", "five", "six"];
/** Counts in words: the TV never shows bare numbers in prose. */
export const inWords = (n: number) => WORDS[n] ?? String(n);
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
