const ENDERS = "。！？!?；;…";

// Sentence-ending punctuation inside a title or a quoted phrase should remain
// part of that sentence: 《为什么唐诗到今天还有人读？》 is one title, not two
// sentences. The former regex splitter could not express that distinction,
// which left otherwise-authored static explanations unmatched.
const OPEN_TO_CLOSE: Record<string, string> = {
  "《": "》",
  "〈": "〉",
  "（": "）",
  "【": "】",
  "[": "]",
  "(": ")",
  "“": "”",
  "‘": "’",
  "「": "」",
  "『": "』",
};

/** Split a single block of text into sentences, keeping end punctuation. */
export const splitSentences = (text: string): string[] => {
  const sentences: string[] = [];
  const closingStack: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const closing = OPEN_TO_CLOSE[char];
    if (closing) {
      closingStack.push(closing);
      continue;
    }
    if (closingStack[closingStack.length - 1] === char) {
      closingStack.pop();
      continue;
    }
    if (!ENDERS.includes(char) || closingStack.length > 0) continue;

    // Keep terminal runs such as "？！" or "……" with the same sentence.
    let end = i + 1;
    while (end < text.length && ENDERS.includes(text[end])) end += 1;
    const sentence = text.slice(start, end).trim();
    if (sentence) sentences.push(sentence);
    start = end;
    i = end - 1;
  }

  const remainder = text.slice(start).trim();
  if (remainder) sentences.push(remainder);
  return sentences;
};

/**
 * Split text into paragraphs, each an array of sentences.
 *
 * Only blank lines (\n\n+) start a new paragraph — single newlines inside a
 * block are treated as inline whitespace so authored content that puts one
 * sentence per line still renders as flowing prose. SentenceBlock is built to
 * lay sentences out inline within a single <p>; without this, every line in
 * the library JSON became its own one-sentence "paragraph".
 */
export const splitParagraphs = (text: string): string[][] =>
  text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n+/g, " ").trim())
    .filter(Boolean)
    .map(splitSentences);
