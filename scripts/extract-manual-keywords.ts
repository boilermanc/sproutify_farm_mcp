import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function extractKeywords() {
  console.log('Fetching all training manual chunks...');

  const { data: chunks, error } = await supabase
    .from('training_manual_embeddings')
    .select('content');

  if (error) {
    console.error('Error fetching chunks:', error);
    return;
  }

  console.log(`Found ${chunks?.length} chunks`);

  // Extract potential keywords
  const keywords = new Set<string>();
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'can', 'could', 'may', 'might', 'must', 'this', 'that', 'these', 'those',
    'it', 'its', 'they', 'them', 'their', 'you', 'your', 'we', 'our', 'i',
    'me', 'my', 'he', 'she', 'him', 'her', 'his', 'if', 'so', 'than', 'then',
    'when', 'where', 'which', 'who', 'what', 'how', 'all', 'each', 'every',
    'some', 'any', 'no', 'not', 'only', 'just', 'very', 'too', 'also', 'into',
    'about', 'up', 'down', 'out', 'over', 'under', 'again', 'back', 'there',
    'here', 'now', 'more', 'most', 'other', 'such', 'one', 'two', 'three',
    'four', 'five', 'see', 'photo', 'page', 'section', 'chapter'
  ]);

  chunks?.forEach(chunk => {
    // Extract words (lowercase, remove punctuation)
    const words = chunk.content
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2); // At least 3 characters

    words.forEach(word => {
      // Skip common words and numbers
      if (!commonWords.has(word) && !/^\d+$/.test(word)) {
        keywords.add(word);
      }
    });

    // Also extract multi-word phrases (2-3 words)
    const phrases = chunk.content.match(/\b[a-z]+(?:\s+[a-z]+){1,2}\b/gi);
    phrases?.forEach(phrase => {
      const lower = phrase.toLowerCase().trim();
      // Only keep farming/technical phrases
      if (lower.includes('tower') || lower.includes('farm') ||
          lower.includes('nutrient') || lower.includes('crop') ||
          lower.includes('plant') || lower.includes('grow') ||
          lower.includes('water') || lower.includes('seed')) {
        keywords.add(lower);
      }
    });
  });

  // Convert to array and sort by frequency in content
  const keywordFrequency = new Map<string, number>();
  chunks?.forEach(chunk => {
    const content = chunk.content.toLowerCase();
    keywords.forEach(keyword => {
      const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
      keywordFrequency.set(keyword, (keywordFrequency.get(keyword) || 0) + matches);
    });
  });

  // Sort by frequency
  const sortedKeywords = Array.from(keywords).sort((a, b) => {
    return (keywordFrequency.get(b) || 0) - (keywordFrequency.get(a) || 0);
  });

  console.log('\n=== TOP 200 KEYWORDS BY FREQUENCY ===\n');
  const top200 = sortedKeywords.slice(0, 200);

  // Format as JavaScript array for easy copy-paste
  console.log('const farmingKeywords = [');
  const quoted = top200.map(k => `  '${k}'`);
  for (let i = 0; i < quoted.length; i += 5) {
    console.log(quoted.slice(i, i + 5).join(', ') + (i + 5 < quoted.length ? ',' : ''));
  }
  console.log('];');

  console.log(`\n\nTotal unique keywords: ${keywords.size}`);
  console.log(`Top 10 most frequent:`);
  top200.slice(0, 10).forEach(keyword => {
    console.log(`  ${keyword}: ${keywordFrequency.get(keyword)} occurrences`);
  });
}

extractKeywords().catch(console.error);
