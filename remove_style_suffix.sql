-- SQL script to remove "Style" from the end of story style names
-- This targets the 5 story styles in the prompts table

-- Update Movie Trailer Style -> Movie Trailer
UPDATE prompts 
SET title = 'Movie Trailer', 
    updated_at = NOW()
WHERE prompt_key = 'story_style_movie_trailer';

-- Update Documentary Style -> Documentary
UPDATE prompts 
SET title = 'Documentary', 
    updated_at = NOW()
WHERE prompt_key = 'story_style_documentary';

-- Update News Report Style -> News Report
UPDATE prompts 
SET title = 'News Report', 
    updated_at = NOW()
WHERE prompt_key = 'story_style_news_report';

-- Update Public Radio Style -> Public Radio
UPDATE prompts 
SET title = 'Public Radio', 
    updated_at = NOW()
WHERE prompt_key = 'story_style_public_radio';

-- Update Podcast Narrative Style -> Podcast Narrative
UPDATE prompts 
SET title = 'Podcast Narrative', 
    updated_at = NOW()
WHERE prompt_key = 'story_style_podcast_narrative';

-- Verify the changes
SELECT prompt_key, title, updated_at 
FROM prompts 
WHERE category = 'story_styles' 
ORDER BY prompt_key; 