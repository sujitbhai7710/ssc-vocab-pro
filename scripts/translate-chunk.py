#!/usr/bin/env python3
"""Translate a chunk of words to Bengali using z-ai CLI."""
import json, subprocess, re, time, sys

CHUNK = int(sys.argv[1]) if len(sys.argv) > 1 else 0
DICT_PATH = './public/bengali-dictionary.json'
CHUNK_PATH = f'/tmp/bengali_chunk_{CHUNK}.json'
BATCH_SIZE = 20
DELAY = 3

os_cwd = '/home/z/my-project'

def translate_batch(words_list):
    word_list = "\n".join(f"{i+1}. {w}" for i, w in enumerate(words_list))
    prompt = f"""Translate these English words/phrases to Bengali. For each, provide Bengali script and transliteration.
Return ONLY a JSON object. Keys = exact input words (lowercase), values = {{"bengali": "...", "bengali_translit": "..."}}.
Words:
{word_list}"""
    
    result = subprocess.run(
        ['z-ai', 'chat', '-p', prompt, '-s', 'You are a professional English-to-Bengali translator. Return valid JSON only, no markdown fences.', '-o', f'/tmp/trans_{CHUNK}.json'],
        capture_output=True, text=True, timeout=90, cwd=os_cwd
    )
    
    if result.returncode != 0:
        raise RuntimeError(f"CLI error: {result.stderr[:200]}")
    
    with open(f'/tmp/trans_{CHUNK}.json', 'r') as f:
        resp = json.load(f)
    
    content = resp['choices'][0]['message']['content']
    # Remove markdown fences
    m = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
    json_str = m.group(1) if m else content
    obj = re.search(r'\{[\s\S]*\}', json_str)
    if not obj:
        raise ValueError(f"No JSON: {content[:200]}")
    return json.loads(obj.group(0))

import os
os.chdir(os_cwd)

dict_data = json.load(open(DICT_PATH))
words = json.load(open(CHUNK_PATH))
print(f"Chunk {CHUNK}: {len(words)} words to translate")

success = 0
for i in range(0, len(words), BATCH_SIZE):
    batch = words[i:i+BATCH_SIZE]
    bn = i // BATCH_SIZE + 1
    tb = (len(words) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"  Batch {bn}/{tb}...", end=' ', flush=True)
    
    try:
        trans = translate_batch(batch)
        for w, t in trans.items():
            wl = w.lower().strip()
            ben = t.get('bengali', '') if isinstance(t, dict) else ''
            trl = t.get('bengali_translit', '') if isinstance(t, dict) else ''
            if ben and not re.search(r'[\u4e00-\u9fff]', ben):
                dict_data[wl] = {'bengali': ben, 'bengali_translit': trl}
                success += 1
        print(f"OK +{len(trans)}")
    except Exception as e:
        print(f"FAIL: {e}")
    
    if i + BATCH_SIZE < len(words):
        time.sleep(DELAY)

# Save
with open(DICT_PATH, 'w') as f:
    json.dump(dict_data, f, indent=2)
print(f"Chunk {CHUNK} done. Success: {success}. Dict size: {len(dict_data)}")
