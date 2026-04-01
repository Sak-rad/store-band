export type I18nJson = { en: string; ru: string; [key: string]: string };

export function resolveI18n(json: I18nJson | null | unknown, locale: string): string {
  if (!json || typeof json !== 'object') return '';
  const obj = json as I18nJson;
  return obj[locale] ?? obj['en'] ?? '';
}

export function resolveModel<T extends Record<string, any>>(
  item: T,
  locale: string,
  i18nFields: Array<{ from: keyof T; to: string }>,
): T & Record<string, string> {
  const resolved: any = { ...item };
  for (const { from, to } of i18nFields) {
    resolved[to] = resolveI18n(item[from] as I18nJson, locale);
  }
  return resolved;
}
