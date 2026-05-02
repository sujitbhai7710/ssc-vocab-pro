#!/usr/bin/env python3
"""
Batch Bengali translation using z-ai CLI tool.
Processes words in batches of 25, with rate limiting.
"""

import json
import subprocess
import re
import time
import sys
import os

DICT_PATH = './public/bengali-dictionary.json'
WORDS_PATH = '/tmp/words_needing_bengali.json'
BATCH_SIZE = 25
DELAY_SECONDS = 3

def translate_batch(words_batch):
    """Translate a batch of words using z-ai CLI."""
    word_list = "\n".join(f"{i+1}. {w}" for i, w in enumerate(words_batch))
    
    prompt = f"""Translate these English words/phrases to Bengali. For each, provide Bengali script and transliteration.

Return ONLY a JSON object. Keys = exact input words, values = {{"bengali": "...", "bengali_translit": "..."}}.

Words:
{word_list}"""

    system = "You are a professional English-to-Bengali translator. Return valid JSON only. No markdown, no explanation."
    
    result = subprocess.run(
        ['z-ai', 'chat', '-p', prompt, '-s', system, '-o', '/tmp/batch_trans.json'],
        capture_output=True, text=True, timeout=60
    )
    
    if result.returncode != 0:
        raise RuntimeError(f"CLI failed: {result.stderr}")
    
    with open('/tmp/batch_trans.json', 'r') as f:
        response = json.load(f)
    
    content = response['choices'][0]['message']['content']
    
    # Extract JSON from response
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
    if json_match:
        json_str = json_match.group(1)
    else:
        json_str = content
    
    # Try to parse
    obj_match = re.search(r'\{[\s\S]*\}', json_str)
    if obj_match:
        return json.loads(obj_match.group(0))
    else:
        raise ValueError(f"No JSON found in response: {content[:200]}")

def main():
    os.chdir('/home/z/my-project')
    
    with open(DICT_PATH, 'r') as f:
        dict_data = json.load(f)
    with open(WORDS_PATH, 'r') as f:
        words = json.load(f)
    
    print(f"Words to translate: {len(words)}")
    print(f"Current dict size: {len(dict_data)}")
    
    # Filter: skip words already properly translated
    needs_work = []
    for w in words:
        w_lower = w.lower().strip()
        if w_lower in dict_data and 'bengali' in dict_data[w_lower]:
            # Already has bengali key - check for Chinese chars
            if re.search(r'[\u4e00-\u9fff]', dict_data[w_lower].get('bengali', '')):
                needs_work.append(w_lower)
            # else skip - already translated
        else:
            needs_work.append(w_lower)
    
    print(f"Actually needing translation: {len(needs_work)}")
    
    success = 0
    failed = 0
    skipped = 0
    
    total_batches = (len(needs_work) + BATCH_SIZE - 1) // BATCH_SIZE
    
    for i in range(0, len(needs_work), BATCH_SIZE):
        batch = needs_work[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        
        print(f"\n--- Batch {batch_num}/{total_batches} ({len(batch)} words) ---")
        sys.stdout.flush()
        
        retries = 0
        max_retries = 2
        while retries <= max_retries:
            try:
                translations = translate_batch(batch)
                break
            except Exception as e:
                retries += 1
                if retries > max_retries:
                    print(f"  FAILED after {max_retries} retries: {e}")
                    failed += len(batch)
                    break
                print(f"  Retry {retries}/{max_retries}: {e}")
                time.sleep(5)
        else:
            continue
        
        if translations is None:
            continue
            
        for word, translation in translations.items():
            word_lower = word.lower().strip()
            if not isinstance(translation, dict):
                print(f"  SKIP (not dict): {word} -> {translation}")
                skipped += 1
                continue
                
            bengali = translation.get('bengali', '')
            translit = translation.get('bengali_translit', '')
            
            if not bengali:
                print(f"  SKIP (no bengali): {word}")
                skipped += 1
                continue
            
            # Check for Chinese characters
            if re.search(r'[\u4e00-\u9fff]', bengali):
                print(f"  SKIP (Chinese): {word}")
                skipped += 1
                continue
            
            dict_data[word_lower] = {
                'bengali': bengali,
                'bengali_translit': translit
            }
            success += 1
        
        print(f"  Batch {batch_num} done, +{len(translations)} entries")
        
        # Save progress every 4 batches
        if batch_num % 4 == 0 or batch_num == total_batches:
            with open(DICT_PATH, 'w') as f:
                json.dump(dict_data, f, indent=2)
            print(f"  [Saved: {len(dict_data)} entries]")
        
        # Rate limit
        if i + BATCH_SIZE < len(needs_work):
            time.sleep(DELAY_SECONDS)
    
    # Final save
    with open(DICT_PATH, 'w') as f:
        json.dump(dict_data, f, indent=2)
    
    print(f"\n=== Translation Complete ===")
    print(f"Success: {success}")
    print(f"Failed: {failed}")
    print(f"Skipped: {skipped}")
    print(f"Final dict size: {len(dict_data)}")

if __name__ == '__main__':
    main()
