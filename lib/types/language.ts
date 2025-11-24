/**
 * Language Types for LyraAI Interview Platform
 * Ensures type safety across language selection and configuration
 */

export type SupportedLanguage = 'zh-TW' | 'en-US';

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['zh-TW', 'en-US'] as const;

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  description: string;
  helperText?: string;
}

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  whisperLanguage: 'zh' | 'en';
  systemPromptLanguage: string;
  voiceModel: string;
}

export function isValidLanguage(lang: unknown): lang is SupportedLanguage {
  return typeof lang === 'string' && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

export function assertValidLanguage(lang: unknown): asserts lang is SupportedLanguage {
  if (!isValidLanguage(lang)) {
    throw new Error(`Invalid language: ${lang}. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }
}
