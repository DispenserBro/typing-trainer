export type TranslationParams = Record<string, string | number | boolean | null | undefined>;

export interface PluralTranslation {
  zero?: string;
  one?: string;
  few?: string;
  many?: string;
  other?: string;
}

export type TranslationNode =
  | string
  | PluralTranslation
  | { [key: string]: TranslationNode };

export type TranslationDictionary = Record<string, TranslationNode>;

export type InterfaceTranslationSource = 'built-in' | 'addon' | 'mod' | 'imported';

export type InterfaceLocaleMergeConflictKind = 'value-override' | 'type-mismatch';

export interface InterfaceLocaleLayerDefinition {
  source: InterfaceTranslationSource;
  sourceName?: string;
  importedAt?: string;
}

export interface InterfaceLocaleMergeDiagnostic {
  localeId: string;
  keyPath: string;
  kind: InterfaceLocaleMergeConflictKind;
  previousSource: InterfaceTranslationSource;
  nextSource: InterfaceTranslationSource;
  previousSourceName?: string;
  nextSourceName?: string;
}

export interface InterfaceLocaleDefinition {
  id: string;
  label: string;
  nativeLabel: string;
  source: InterfaceTranslationSource;
  sourceName?: string;
  importedAt?: string;
  layers?: InterfaceLocaleLayerDefinition[];
  dictionary: TranslationDictionary;
}

export interface ImportedInterfaceLocaleDefinition extends InterfaceLocaleDefinition {
  source: 'imported';
  importedAt: string;
  sourceName: string;
}
