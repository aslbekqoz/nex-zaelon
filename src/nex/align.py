# Lirika vaqtini aniqlash (sinxronlash): Gemini matnni yaxshi eshitadi, lekin vaqtlari ba'zan siljiydi.
# Whisper (faster-whisper) har bir so'z QACHON aytilganini aniq beradi. Bu skript ikkisini birlashtiradi:
#   Gemini qatorlari (matn)  +  Whisper so'zlari (vaqt)  ->  to'g'ri vaqtli qatorlar
# Kirish: JSON fayl {audio, offset, language, lines:[{start,end,text}]}   Chiqish: JSON {mode, ratio, lines}
import json
import re
import sys
import difflib

LANG = {'english': 'en', 'russian': 'ru', 'uzbek': 'uz', 'spanish': 'es', 'japanese': 'ja', 'korean': 'ko',
        'french': 'fr', 'german': 'de', 'portuguese': 'pt', 'italian': 'it', 'turkish': 'tr', 'ukrainian': 'uk'}


def norm(w):
    w = w.lower().replace('ё', 'е')
    return re.sub(r"[^\w']+", '', w).strip("'")


def main():
    inp, out = sys.argv[1], sys.argv[2]
    job = json.load(open(inp, encoding='utf-8'))
    from faster_whisper import WhisperModel

    lang = LANG.get(str(job.get('language', '')).strip().lower())
    prompt = ' '.join(l['text'] for l in job['lines'])[:800]
    model = WhisperModel(job.get('model', 'small'), device='cpu', compute_type='int8')
    # wav'ni o'zimiz o'qiymiz (16 kHz mono, ffmpeg tayyorlagan) — PyAV versiyasiga bog'liq bo'lmasin
    import wave
    import numpy as np
    with wave.open(job['audio'], 'rb') as f:
        pcm = np.frombuffer(f.readframes(f.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    off = float(job.get('offset', 0))

    def words(vad):
        segs, _ = model.transcribe(pcm, language=lang, word_timestamps=True, initial_prompt=prompt or None,
                                   condition_on_previous_text=False, vad_filter=vad, beam_size=5,
                                   vad_parameters={'min_silence_duration_ms': 300, 'speech_pad_ms': 150} if vad else None)
        out = []  # (so'z, boshlanish, tugash, asl so'z)
        for s in segs:
            for k, w in enumerate(s.words or []):
                n = norm(w.word)
                if not n:
                    continue
                st = w.start
                # Whisper pauzadan keyingi birinchi so'zning boshini pauza ichiga "yoyib" yuboradi — qisqartiramiz
                if (k == 0 or (w.start - s.words[k - 1].end) < 0.05) and (w.end - w.start) > 1.2:
                    st = w.end - 0.7
                out.append((n, st + off, w.end + off, w.word.strip()))
        return out

    # 1) ovoz detektori (VAD) bilan — pauzalar aniq; 2) qo'shiq zich bo'lsa VAD ovozni "ko'rmaydi" -> VAD'siz
    ww = words(True)
    if len(ww) < max(6, len(prompt.split()) // 4):
        alt = words(False)
        if len(alt) > len(ww):
            ww = alt

    lines = job['lines']
    gw = [(i, norm(t)) for i, l in enumerate(lines) for t in l['text'].split() if norm(t)]
    sm = difflib.SequenceMatcher(None, [w for _, w in gw], [w[0] for w in ww], autojunk=False)
    match = {}
    for a, b, size in sm.get_matching_blocks():
        for k in range(size):
            match[a + k] = b + k
    # so'zlar biroz boshqacha eshitilgan bo'lsa ham (masalan "gonna"/"going") — yaqinlik bo'yicha qo'shimcha moslash
    used = set(match.values())
    for gi, (_, g) in enumerate(gw):
        if gi in match:
            continue
        prev = max([match[k] for k in match if k < gi], default=-1)
        nxt = min([match[k] for k in match if k > gi], default=len(ww))
        best, score = None, 0.0
        for wi in range(prev + 1, nxt):
            if wi in used:
                continue
            r = difflib.SequenceMatcher(None, g, ww[wi][0]).ratio()
            if r > score:
                best, score = wi, r
        if best is not None and score >= 0.6:
            match[gi] = best
            used.add(best)

    ratio = len(match) / max(1, len(gw))
    span = (ww[-1][2] - ww[0][1]) if ww else 0  # eshitilgan ovoz davomiyligi (gallyutsinatsiyani ajratish uchun)
    if len(ww) >= 4 and ratio < 0.35:
        # Gemini matni umuman mos kelmadi -> Whisper'ning o'z qatorlari (vaqti aniq)
        res, cur = [], []
        for w in ww:
            if cur and (len(cur) >= 6 or w[1] - cur[-1][2] > 0.7):
                res.append({'start': cur[0][1], 'end': cur[-1][2], 'text': ' '.join(x[3] for x in cur)})
                cur = []
            cur.append(w)
        if cur:
            res.append({'start': cur[0][1], 'end': cur[-1][2], 'text': ' '.join(x[3] for x in cur)})
        json.dump({'mode': 'whisper', 'ratio': ratio, 'words': len(ww), 'span': span, 'lines': res}, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
        return

    res = []
    for i, l in enumerate(lines):
        idx = [gi for gi, (li, _) in enumerate(gw) if li == i]
        hit = [match[gi] for gi in idx if gi in match]
        if not idx or not hit:
            res.append({'start': None, 'end': None, 'text': l['text']})
            continue
        hit = sorted(hit)
        first_g = next(gi for gi in idx if gi in match)
        before = idx.index(first_g)  # qator boshidagi eshitilmagan so'zlar
        # qator so'zlari ketma-ket aytiladi: chetdagi so'z boshqalardan uzoqda "osilib" qolsa — u adashgan vaqt
        while len(hit) > 1 and ww[hit[1]][1] - ww[hit[0]][2] > 0.8:
            hit.pop(0)
            before += 1
        while len(hit) > 1 and ww[hit[-1]][1] - ww[hit[-2]][2] > 0.8:
            hit.pop()
        s = ww[hit[0]][1] - 0.25 * before
        e = ww[hit[-1]][2]
        res.append({'start': round(max(0, s), 2), 'end': round(e, 2), 'text': l['text']})
    # topilmagan qatorlar — qo'shnilar orasiga joylanadi
    for i, r in enumerate(res):
        if r['start'] is None:
            p = next((res[k]['end'] for k in range(i - 1, -1, -1) if res[k]['end'] is not None), lines[i]['start'])
            n = next((res[k]['start'] for k in range(i + 1, len(res)) if res[k]['start'] is not None), None)
            r['start'] = round(p + 0.1, 2)
            r['end'] = round(min(n - 0.1, p + 3.0) if n else p + 3.0, 2)
    json.dump({'mode': 'aligned', 'ratio': ratio, 'words': len(ww), 'span': span, 'lines': res}, open(out, 'w', encoding='utf-8'), ensure_ascii=False)


if __name__ == '__main__':
    main()
