export function stripYo(text: string): string {
  return text.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
}

export function filterYoWords(words: string[], useYo: boolean): string[] {
  if (useYo) return words;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const word of words) {
    const clean = stripYo(word);
    if (!seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
  }
  return result;
}

export function filterYoKeys(keys: string[], useYo: boolean): string[] {
  if (useYo) return keys;
  return keys.filter(key => key !== 'ё' && key !== 'Ё');
}
