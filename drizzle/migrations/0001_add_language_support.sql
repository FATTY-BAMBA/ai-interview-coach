-- Add spoken language support to interview sessions
-- Migration: 0001_add_language_support
-- Created: 2024-11-14

-- Add spoken_language column with default
ALTER TABLE interview_sessions 
ADD COLUMN IF NOT EXISTS spoken_language VARCHAR(20) DEFAULT 'zh-TW';

-- Add constraint to ensure only valid languages
ALTER TABLE interview_sessions
ADD CONSTRAINT valid_spoken_language 
CHECK (spoken_language IN ('zh-TW', 'en-US'));

-- Create index for language-based queries
CREATE INDEX IF NOT EXISTS idx_sessions_language 
ON interview_sessions(spoken_language);

-- Update existing sessions to have default language
UPDATE interview_sessions 
SET spoken_language = 'zh-TW' 
WHERE spoken_language IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN interview_sessions.spoken_language IS 
'User spoken language during interview: zh-TW (Taiwan Mandarin) or en-US (English)';
