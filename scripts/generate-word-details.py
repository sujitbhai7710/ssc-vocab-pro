#!/usr/bin/env python3
"""
Generate word details one word at a time using NVIDIA API.
More reliable than batch processing.
"""

import json
import os
import time
import sys
import re
import signal

sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', buffering=1)

from openai import OpenAI

NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "")
if not NVIDIA_API_KEY:
    print("ERROR: set NVIDIA_API_KEY env var (get one at https://build.nvidia.com/settings/api-keys)", file=sys.stderr)
    sys.exit(1)
NVIDIA_BASE_URL = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
MODEL = os.environ.get("NVIDIA_MODEL", "qwen/qwen3-next-80b-a3b-instruct")
OUTPUT_FILE = "public/word-details.json"

# Load dataset
with open("public/dataset.json") as f:
    dataset = json.load(f)

# Load existing progress
if os.path.exists(OUTPUT_FILE):
    with open(OUTPUT_FILE) as f:
        word_details = json.load(f)
    print(f"Loaded {len(word_details)} existing entries", flush=True)
else:
    word_details = {}

# Extract all unique words
all_words = set()
for section in dataset["sections"]:
    for q in section["questions"]:
        all_words.add(q["word"])

sorted_words = sorted(all_words, key=str.lower)
words_to_process = [w for w in sorted_words if w not in word_details]

print(f"Total unique words: {len(sorted_words)}", flush=True)
print(f"Already processed: {len(word_details)}", flush=True)
print(f"Remaining: {len(words_to_process)}", flush=True)

if not words_to_process:
    print("Nothing to process!", flush=True)
    sys.exit(0)

client = OpenAI(
    base_url=NVIDIA_BASE_URL,
    api_key=NVIDIA_API_KEY,
    timeout=60.0,
)

MAX_WORDS = int(os.environ.get("MAX_WORDS", "50"))  # Process N words per run

def generate_single(word):
    """Generate word details for a single word."""
    prompt = f"""Generate vocabulary details for the English word: "{word}"

Provide:
1. "meaning" - A short, simple English definition (max 15 words)
2. "sentence" - An easy example sentence using Indian context (Indian names like Raj, Priya; places like Delhi, Mumbai; daily life like cricket, chai, railway, auto-rickshaw, sarkari exam, etc. Keep sentence simple and short.)
3. "synonyms" - 3-5 synonym words as an array
4. "antonyms" - 3-5 antonym words as an array (if no antonym exists, use empty array)

Return ONLY a valid JSON object with keys: meaning, sentence, synonyms, antonyms. No markdown, no explanations."""

    for attempt in range(3):
        try:
            completion = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.6,
                top_p=0.7,
                max_tokens=500,
                stream=False,
            )
            response_text = completion.choices[0].message.content.strip()

            # Clean response
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                lines = [l for l in lines if not l.startswith("```")]
                response_text = "\n".join(lines)

            response_text = re.sub(r'<think.*?>.*?</think\s*>', '', response_text, flags=re.DOTALL).strip()

            try:
                result = json.loads(response_text)
            except json.JSONDecodeError:
                start = response_text.find('{')
                end = response_text.rfind('}') + 1
                if start >= 0 and end > start:
                    result = json.loads(response_text[start:end])
                else:
                    raise

            if isinstance(result, dict) and "meaning" in result:
                return {
                    "meaning": result.get("meaning", ""),
                    "sentence": result.get("sentence", ""),
                    "synonyms": result.get("synonyms", [])[:5],
                    "antonyms": result.get("antonyms", [])[:5],
                }
            return None

        except Exception as e:
            if attempt < 2:
                print(f"    Retry {attempt+1}: {str(e)[:80]}", flush=True)
                time.sleep(3 * (attempt + 1))
            else:
                print(f"    Failed: {str(e)[:80]}", flush=True)
                return None

    return None


def save():
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(word_details, f, indent=2, ensure_ascii=False)

def handle_signal(signum, frame):
    print("\nInterrupted! Saving...", flush=True)
    save()
    sys.exit(1)

signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)

# Process words one by one
words_this_run = words_to_process[:MAX_WORDS]
print(f"Processing {len(words_this_run)} words this run", flush=True)

added = 0
failed = 0
for i, word in enumerate(words_this_run):
    print(f"[{i+1}/{len(words_this_run)}] {word}...", flush=True)

    result = generate_single(word)
    if result:
        word_details[word] = result
        added += 1
    else:
        failed += 1

    # Save every 10 words
    if (i + 1) % 10 == 0:
        save()
        print(f"  Saved ({len(word_details)} total)", flush=True)

    # Rate limiting
    time.sleep(0.5)

# Final save
save()
print(f"\nDone! Added {added}, failed {failed}. Total: {len(word_details)}", flush=True)
