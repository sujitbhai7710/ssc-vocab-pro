#!/usr/bin/env node
/**
 * Batch Bengali translation script using z-ai-web-dev-sdk
 * Translates English words to Bengali with transliteration
 */

import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

const DICT_PATH = './public/bengali-dictionary.json';
const WORDS_PATH = '/tmp/words_needing_bengali.json';
const BATCH_SIZE = 25;
const DELAY_MS = 2000;

async function main() {
  const zai = await ZAI.create();
  
  const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf-8'));
  const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));
  
  console.log(`Total words to translate: ${words.length}`);
  console.log(`Existing dictionary size: ${Object.keys(dict).length}`);
  
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(words.length / BATCH_SIZE);
    
    console.log(`\n--- Batch ${batchNum}/${totalBatches} (${batch.length} words) ---`);
    
    const wordList = batch.map((w, idx) => `${idx + 1}. ${w}`).join('\n');
    
    const prompt = `Translate these English words/phrases to Bengali. For each word, provide:
1. Bengali translation in Bengali script
2. Transliteration in Roman/Latin script

Return ONLY a valid JSON object where keys are the exact input words/phrases and values are objects with "bengali" and "bengali_translit" keys. Example:
{"word": {"bengali": "বাংলা শব্দ", "bengali_translit": "bangla shobdo"}}

Words to translate:
${wordList}

Return ONLY the JSON object, no other text.`;

    try {
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a professional English-to-Bengali translator. Always respond with valid JSON only. Provide accurate Bengali translations and transliterations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      });
      
      const content = completion.choices[0]?.message?.content || '';
      
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      let translations;
      try {
        translations = JSON.parse(jsonStr.trim());
      } catch (parseErr) {
        const objMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objMatch) {
          translations = JSON.parse(objMatch[0]);
        } else {
          throw new Error(`Failed to parse JSON response: ${content.substring(0, 200)}`);
        }
      }
      
      for (const [word, translation] of Object.entries(translations)) {
        const normalizedKey = word.toLowerCase().trim();
        if (translation.bengali && translation.bengali_translit) {
          if (/[\u4e00-\u9fff]/.test(translation.bengali)) {
            console.log(`  SKIP (Chinese chars): ${word}`);
            skipCount++;
            continue;
          }
          dict[normalizedKey] = {
            bengali: translation.bengali,
            bengali_translit: translation.bengali_translit
          };
          successCount++;
        } else if (translation.bengali) {
          if (/[\u4e00-\u9fff]/.test(translation.bengali)) {
            console.log(`  SKIP (Chinese chars): ${word}`);
            skipCount++;
            continue;
          }
          dict[normalizedKey] = {
            bengali: translation.bengali,
            bengali_translit: translation.bengali_translit || ''
          };
          successCount++;
        } else {
          console.log(`  SKIP (no bengali): ${word} -> ${JSON.stringify(translation)}`);
          skipCount++;
        }
      }
      
      console.log(`  Batch ${batchNum} done: +${Object.keys(translations).length} translations`);
      
    } catch (err) {
      console.error(`  Batch ${batchNum} FAILED: ${err.message}`);
      failCount += batch.length;
    }
    
    if (batchNum % 4 === 0 || batchNum === totalBatches) {
      fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2));
      console.log(`  [Saved progress: ${Object.keys(dict).length} total entries]`);
    }
    
    if (i + BATCH_SIZE < words.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2));
  
  console.log('\n=== Translation Complete ===');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Final dictionary size: ${Object.keys(dict).length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
