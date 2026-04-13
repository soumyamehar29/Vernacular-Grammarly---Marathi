import os
import re
import json
import urllib.request
import urllib.error
from flask import Flask, request, jsonify, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=None)

API_KEY = os.environ.get("GOOGLE_API_KEY")
MODEL_NAME = "gemini-1.5-pro"
GL_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

DICTIONARY_PATH = os.path.join(BASE_DIR, "marathi_dictionary.json")
VIRAMA = "्"
PUNCTUATION_CHARS = '.,!?।;:\"\'()[]{}'

DEFAULT_DICT = {
    "word_replacements": {
        "म": "मी",
        "मि": "मी",
        "मै": "मी",
        "mee": "मी",
        "me": "मी",
        "अज": "आज",
        "अस": "असे",
        "खुप": "खूप",
        "खप": "खूप",
        "छन": "छान",
        "मौ": "मी",
        "मरठ": "मराठी",
        "शकत": "शिकत",
        "हावामान": "हवामान",
        "हवामन": "हवामान",
        "घ्यावा": "घ्यावे",
        "वाचन": "वाचणे",
        "इतक्या": "इतके",
        "मत": "मात्र",
        "योग": "योग्य",
        "चांगल": "चांगले",
        "आहेतत": "आहेत",
        "होतोय": "होतोय",
        "होतो आहे": "होतो",
        "होते आहे": "होते",
        "आम्ही आहेत": "आम्ही आहोत",
        "आपण आहे": "आपण आहोत",
        "तू आहेस": "तू आहेस",
        "पाहतोय": "पाहतोय",
        "बघतोय": "बघतोय",
        "जाणतोय": "जाणतोय",
        "करतोय": "करतोय",
        "बोलतोय": "बोलतोय",
        "वाचतोय": "वाचतोय",
        "शिकतोय": "शिकतोय",
        "आजदिन": "आज दिन"
    },
    "phrase_replacements": {
        "तो चालतो आहे": "तो चालत आहे",
        "ती चालते आहे": "ती चालत आहे",
        "मी वाचतो आहे": "मी वाचत आहे",
        "मी वाचते आहे": "मी वाचत आहे",
        "अहोत आहे": "आहेत",
        "आहे आहेत": "आहेत",
        "आहेत आहेत": "आहेत",
        "खुप छान": "खूप छान",
        "अज खूप": "आज खूप",
        "अज छान": "आज छान",
        "हावामान आहे": "हवामान आहे",
        "पुन्हा एकदा": "पुन्हा",
        "एवढे चांगले": "इतके चांगले",
        "मला हे आवडते": "मला हे आवडते",
        "आपण आहे": "आपण आहोत",
        "आम्ही आहेत": "आम्ही आहोत"
    }
}


def load_marathi_dictionary():
    if os.path.exists(DICTIONARY_PATH):
        try:
            with open(DICTIONARY_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return {
                        "word_replacements": data.get("word_replacements", DEFAULT_DICT["word_replacements"]),
                        "phrase_replacements": data.get("phrase_replacements", DEFAULT_DICT["phrase_replacements"])
                    }
        except Exception as err:
            print(f"Failed to load dictionary file: {err}")
    return DEFAULT_DICT

MARATHI_DICTIONARY = load_marathi_dictionary()
COMMON_WORD_REPLACEMENTS = MARATHI_DICTIONARY["word_replacements"]
PHRASE_REPLACEMENTS = MARATHI_DICTIONARY["phrase_replacements"]

MARATHI_TO_LATIN = {
    "अ": "a", "आ": "ā", "इ": "i", "ई": "ī", "उ": "u", "ऊ": "ū",
    "ऋ": "ṛ", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
    "क": "ka", "ख": "kha", "ग": "ga", "घ": "gha", "ङ": "ṅa",
    "च": "ca", "छ": "cha", "ज": "ja", "झ": "jha", "ञ": "ña",
    "ट": "ṭa", "ठ": "ṭha", "ड": "ḍa", "ढ": "ḍha", "ण": "ṇa",
    "त": "ta", "थ": "tha", "द": "da", "ध": "dha", "न": "na",
    "प": "pa", "फ": "pha", "ब": "ba", "भ": "bha", "म": "ma",
    "य": "ya", "र": "ra", "ल": "la", "व": "va", "श": "śa",
    "ष": "ṣa", "स": "sa", "ह": "ha", "ळ": "ḷa", "क्ष": "kṣa",
    "ज्ञ": "jña"
}

MATRA_TO_LATIN = {
    "ा": "ā", "ि": "i", "ी": "ī", "ु": "u", "ू": "ū",
    "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ं": "ṁ",
    "ः": "ḥ", "ँ": "̃"
}

SPECIAL_MARKS = {
    "्": "", "।": ".", "॥": ".."
}


def normalize_word(word):
    prefix = ''
    suffix = ''

    while word and word[0] in PUNCTUATION_CHARS:
        prefix += word[0]
        word = word[1:]

    while word and word[-1] in PUNCTUATION_CHARS:
        suffix = word[-1] + suffix
        word = word[:-1]

    corrected = COMMON_WORD_REPLACEMENTS.get(word, word)
    return f"{prefix}{corrected}{suffix}"


def normalize_text(text):
    text = re.sub(r"\s+", " ", text.strip())

    for phrase, replacement in PHRASE_REPLACEMENTS.items():
        text = text.replace(phrase, replacement)

    tokens = text.split(" ")
    tokens = [normalize_word(token) for token in tokens]
    text = " ".join(tokens)

    text = re.sub(r"\s*([,!?।;:])\s*", r"\1 ", text).strip()
    text = re.sub(r"([।!?]){2,}", r"\1", text)
    text = re.sub(r"\s+", " ", text)

    return text


def transliterate_text(text):
    result = []
    i = 0

    while i < len(text):
        char = text[i]

        if char == ' ':
            result.append(' ')
            i += 1
            continue

        if char in MARATHI_TO_LATIN:
            next_char = text[i + 1] if i + 1 < len(text) else ''
            base = MARATHI_TO_LATIN[char]
            if next_char == VIRAMA:
                result.append(base[:-1])
                i += 2
                continue
            if next_char in MATRA_TO_LATIN:
                result.append(base[:-1] + MATRA_TO_LATIN[next_char])
                i += 2
                continue
            result.append(base)
            i += 1
            continue

        if char in MATRA_TO_LATIN:
            result.append(MATRA_TO_LATIN[char])
            i += 1
            continue

        if char in SPECIAL_MARKS:
            result.append(SPECIAL_MARKS[char])
            i += 1
            continue

        result.append(char)
        i += 1

    return ''.join(result).strip()


def build_gemini_request(text):
    return {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            "You are a Marathi grammar correction assistant. "
                            "Correct the following Marathi text for spelling, grammar, and sentence structure. "
                            "Return ONLY the corrected Marathi text without any explanation.\n\n"
                            f"{text}"
                        )
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.8,
            "topK": 40,
            "maxOutputTokens": 1024
        }
    }


def call_gemini_api(text):
    if not API_KEY:
        raise RuntimeError("GOOGLE_API_KEY is not configured.")

    url = f"{GL_BASE_URL}/{MODEL_NAME}:generateContent?key={API_KEY}"
    body = json.dumps(build_gemini_request(text)).encode("utf-8")
    request_obj = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(request_obj, timeout=25) as response:
            response_text = response.read().decode("utf-8")
            payload = json.loads(response_text)
    except urllib.error.HTTPError as err:
        error_body = err.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Remote API error: {err.code} {err.reason} - {error_body}")
    except urllib.error.URLError as err:
        raise RuntimeError(f"Remote API request failed: {err.reason}")

    candidates = payload.get("candidates")
    if not candidates or not isinstance(candidates, list):
        raise RuntimeError("Invalid API response structure.")

    first_candidate = candidates[0]
    corrected = ""
    if isinstance(first_candidate, dict):
        content = first_candidate.get("content", [])
        if content and isinstance(content, list):
            parts = content[0].get("parts", [])
            if parts and isinstance(parts, list):
                corrected = parts[0].get("text", "")

    return (corrected or "").strip()

# ---------------- FRONTEND ----------------
@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(BASE_DIR, path)

# ---------------- NORMALIZATION ----------------
def detect_subject(words):
    for w in words:
        if w == "ती":
            return "female"
        elif w == "तो":
            return "male"
        elif w in ["ते", "आम्ही", "आपण"]:
            return "plural"
        elif w == "मी":
            return "self"
    return None

# ---------------- VERB CORRECTION ----------------
def correct_verbs(words, subject):
    corrected = []

    for word in words:
        # verbs ending with "तो"
        if word.endswith("तो"):
            root = word[:-2]

            if subject == "female":
                word = root + "ते"
            elif subject in ["plural", "self"]:
                word = root + "त"

        # verbs ending with "ते"
        elif word.endswith("ते"):
            root = word[:-2]

            if subject == "male":
                word = root + "तो"

        corrected.append(word)

    return corrected

# ---------------- LOCATION FIX ----------------
def fix_locations(words):
    location_map = {
        "बाजारला": "बाजारात",
        "घरला": "घरी",
        "शाळेला": "शाळेत"
    }

    return [location_map.get(w, w) for w in words]

# ---------------- AUXILIARY FIX ----------------
def fix_auxiliary(sentence, subject):
    if subject == "plural":
        sentence = sentence.replace("आहे", "आहेत")

    # continuous tense fix
    sentence = sentence.replace("ते आहे", "त आहे")
    sentence = sentence.replace("तो आहे", "तो आहे")
    sentence = sentence.replace("ती आहे", "ती आहे")

    return sentence


def fix_phrase_grammar(sentence):
    # phrase-level grammar tuning for Marathi sentence structure
    sentence = sentence.replace("अज ", "आज ")
    sentence = sentence.replace("हावामान", "हवामान")
    sentence = sentence.replace("चालतो आहे", "चालत आहे")
    sentence = sentence.replace("चालते आहे", "चालत आहे")
    sentence = sentence.replace("वाचतो आहे", "वाचत आहे")
    sentence = sentence.replace("वाचते आहे", "वाचत आहे")
    sentence = sentence.replace("होतो आहे", "होतो")
    sentence = sentence.replace("होते आहे", "होते")
    sentence = sentence.replace("आहे आहेत", "आहेत")
    sentence = sentence.replace("आहेत आहेत", "आहेत")
    sentence = sentence.replace("त्यांना आहे", "त्यांना आहे")
    sentence = sentence.replace("मी आहे", "मी आहे")
    sentence = sentence.replace("पुन्हा एकदा", "पुन्हा")
    sentence = sentence.replace("खुप ", "खूप ")
    sentence = sentence.replace("अत", "असे")

    return sentence

# ---------------- MAIN ENGINE ----------------
def correct_text(input_text):
    text = normalize_text(input_text)

    # Split sentences
    sentences = re.split(r"[.।!?]", text)
    final_sentences = []

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        words = sentence.split()

        subject = detect_subject(words)

        words = correct_verbs(words, subject)
        words = fix_locations(words)

        sentence = " ".join(words)
        sentence = fix_auxiliary(sentence, subject)
        sentence = fix_phrase_grammar(sentence)

        final_sentences.append(sentence)

    final_text = ". ".join(final_sentences)

    if not final_text.endswith("."):
        final_text += "."

    # अंतिम सफाई
    final_text = final_text.replace("आहेतत", "आहेत")

    return final_text

# ---------------- API ----------------
@app.route("/correct", methods=["POST"])
def correct():
    user_text = request.json.get("text", "")
    if not user_text.strip():
        return jsonify({
            "original": user_text,
            "corrected": "",
            "source": "none"
        }), 400

    if API_KEY:
        try:
            corrected = call_gemini_api(user_text)
            source = "remote"
            if not corrected:
                raise RuntimeError("Empty remote correction response.")
        except Exception as err:
            print(f"Remote correction failed: {err}")
            corrected = correct_text(user_text)
            source = "local"
    else:
        corrected = correct_text(user_text)
        source = "local"

    pronunciation = transliterate_text(corrected) if corrected else ""

    return jsonify({
        "original": user_text,
        "corrected": corrected,
        "pronunciation": pronunciation,
        "source": source
    })

# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(debug=True)
