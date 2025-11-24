import type { SupportedLanguage, LanguageConfig, LanguageOption } from '../types/language';

/**
 * Language configuration for speech recognition and AI responses
 * Used by LiveKit Agent and OpenAI Realtime API
 */
export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  'zh-TW': {
    code: 'zh-TW',
    name: 'Traditional Chinese',
    nativeName: '台灣國語',
    whisperLanguage: 'zh',
    systemPromptLanguage: 'Traditional Chinese (Taiwan Mandarin)',
    voiceModel: 'alloy', // Will be updated when we implement TTS
  },
  'en-US': {
    code: 'en-US',
    name: 'English',
    nativeName: 'English',
    whisperLanguage: 'en',
    systemPromptLanguage: 'English',
    voiceModel: 'alloy',
  },
} as const;

/**
 * Language options for UI display
 */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'zh-TW',
    name: 'Traditional Chinese',
    nativeName: '台灣國語 (繁體)',
    flag: '🇹🇼',
    description: 'Taiwan Mandarin Chinese',
    helperText: '✅ Recommended for Taiwan users',
  },
  {
    code: 'en-US',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    description: 'US English',
    helperText: 'For international users',
  },
];

/**
 * Get language configuration for STT/TTS
 */
export function getLanguageConfig(languageCode: SupportedLanguage): LanguageConfig {
  return LANGUAGE_CONFIGS[languageCode];
}

/**
 * Get language option for UI display
 */
export function getLanguageOption(languageCode: SupportedLanguage): LanguageOption {
  return LANGUAGE_OPTIONS.find(opt => opt.code === languageCode) || LANGUAGE_OPTIONS[0];
}

/**
 * Generate system prompt with language locking
 * This will be used by the LiveKit Agent
 */
export function getSystemPromptForLanguage(
  languageCode: SupportedLanguage,
  interviewType: string
): string {
  const config = getLanguageConfig(languageCode);
  
  const languageName = config.systemPromptLanguage;
  
  return `
You are a professional job interviewer conducting a ${interviewType} interview.

🔒 CRITICAL LANGUAGE CONFIGURATION:
- Interview Language: ${languageName}
- You MUST conduct this ENTIRE interview in ${languageName}
- NEVER switch to another language
- NEVER ask the candidate to speak another language  
- NEVER respond in a different language
- Language is LOCKED for this session

LANGUAGE CONSISTENCY RULES:
✅ Your responses: ${languageName} ONLY
✅ Expected from candidate: ${languageName} ONLY
✅ Transcription language: ${languageName}
✅ Evaluation report: ${languageName}

If you detect the candidate speaking a different language:
1. Politely redirect in ${languageName}: ${
  languageCode === 'zh-TW' 
    ? '"讓我們用台灣國語繼續這次面試。"' 
    : '"Let\'s continue this interview in English."'
}
2. Do NOT switch languages yourself
3. Maintain ${languageName} throughout

🚫 ABSOLUTE RULE: NO LANGUAGE SWITCHING UNDER ANY CIRCUMSTANCES.

This ensures:
- Consistent transcription quality
- No Mandarin/Cantonese confusion
- Professional interview experience
- Accurate evaluation in the correct language
`.trim();
}

/**
 * Get localized UI strings
 */
export function getLocalizedStrings(languageCode: SupportedLanguage) {
  const strings = {
    'zh-TW': {
      interviewWillBeIn: '本次面試將使用',
      toChangeLangauge: '若要更換語言，請退出並重新開始。',
      speakClearlyTip: '請清楚說話，保持適中語速',
      minimizeNoiseTip: '減少背景噪音',
      checkMicrophoneTip: '檢查麥克風位置',
    },
    'en-US': {
      interviewWillBeIn: 'This interview will be conducted in',
      toChangeLangauge: 'To change language, please exit and start a new session.',
      speakClearlyTip: 'Speak clearly at moderate pace',
      minimizeNoiseTip: 'Minimize background noise',
      checkMicrophoneTip: 'Check microphone positioning',
    },
  };
  
  return strings[languageCode];
}
