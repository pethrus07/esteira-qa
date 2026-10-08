# Market and literature standards for QA of narrated audio and video (vs. esteira-qa)

Scope: software tutorial videos with synthetic pt-BR TTS narration, plus podcasts/voice and general video. Each section compares the norm to what esteira-qa checks today. Labels used below: **STANDARD** (EBU/AES/ITU/ATSC/W3C/ABNT), **PLATFORM** (what a service documents or does), **CONVENTION** (practitioner habit), **LITERATURE** (peer-reviewed).

---

## 1. Loudness targets and true peak (EBU R128 + supplements, ATSC A/85, AES TD1004/TD1008, platforms) and lossy-codec overshoot

### Takeaway
-16 LUFS integrated is defensible. It is Apple Podcasts' documented target and the top of the AES/EBU streaming window (-20 to -16 LUFS). But the pipeline's ±1.5 LU tolerance is **looser** than Apple's ±1 LU and much looser than the AES example of ±0.5 LU for prerecorded files. The main miss is where true peak is measured. Every source says lossy codecs overshoot and that low bitrates overshoot more. So the -1 dBTP ceiling has to be checked **on the delivered encoded file**, or the pre-encode ceiling has to go down to about -2 dBTP or lower at ≤160 kbps. The pipeline's own measurements (+0.6 dB at 160 kbps, +1.5 dB at 128 kbps) match the literature.

### Cited Findings
**Standards**
- EBU R 128 (STANDARD): normalize to -23 LUFS ±0.2 LU (±1 LU for live), relative gate at -10 LU. Supplements: s1 = short-form, **s2 = streaming** (not s1 as the brief assumed), s3 = radio, s4 = cinema. Companion documents: Tech 3341 (meter), 3342 (LRA), 3343 (production), 3344 (distribution). — [EBU loudness page](https://tech.ebu.ch/fr/loudness)
- EBU R 128 true peak: "The True Peak Level of a programme shall not exceed −1 dBTP." — [EBU R128 v4 (search snippet)](https://tech.ebu.ch/docs/r/r128v4_0.pdf)
- EBU R 128 s2 "Loudness in Streaming" (first published Aug 2020, V2 June 2021, V3 Nov 2023), recommendation (e): "programmes should be streamed unchanged, that is at −23.0 LUFS". Recommendation (g): unless metadata manages device gain, "the interim value for the Distribution Loudness Level should be in the range of −20.0 to −16.0 LUFS". Recommendation (h): move back to -23 once mobile devices have enough gain. It mentions "anchor-based normalisation" on the loudness of speech. The s2 text has no true-peak figure of its own beyond the R128 reference. — [EBU R 128 s2 (2023) PDF](https://tech.ebu.ch/docs/r/r128s2.pdf)
- AES TD1004.1.15-10 (Oct 2015, editor Bob Katz) (STANDARD-like technical document, not a standard): stream target "not exceed -16 LUFS" and "not be lower than -20 LUFS". Peaks "not exceed −1.0 dB TP: to prevent clipping when using lossy encoders". "Prerecorded files may be matched within ±0.5 LU, for example." Short-form (≤60 s): max short-term loudness ≤ target +5 LU. — [AES TD1004 PDF](https://aes.org/wp-content/uploads/2024/01/AESTD1004_1_15_10.pdf)
- AES TD1004 on codecs: "High rate (e.g., 256 kbps) coders may work satisfactorily with as little as −0.5 dB TP… However, lower bit rate coders tend to overshoot peaks even more, so the limiting threshold may need to be reduced below −1.0 dB TP." True-peak meters "typically have an error less than 0.6 dB". On some OSes, missing headroom for codec overshoot "can produce as much as 3 dB of gain reduction in the decode-side peak limiter". TD1004 advises lowering the target by 1 dB instead of adding more than about 1 dB of limiting. — [AES TD1004 PDF](https://aes.org/wp-content/uploads/2024/01/AESTD1004_1_15_10.pdf)
- AES TD1004 on speech: "Speech normalized to the same Integrated Loudness as a music stream inevitably sounds too loud. It is recommended to normalize speech (dialog) segments… 2 to 4 LU (or more) below the loudness of the other segments." — [AES TD1004 PDF](https://aes.org/wp-content/uploads/2024/01/AESTD1004_1_15_10.pdf)
- AES TD1008.1.21-9 (Sept 2021, supersedes TD1004): max true peak -1 dBTP at the codec input of lossy streams. "Peak overshoot increases as the bit rate decreases", so for low-bitrate streams the ceiling "may need to be reduced below the recommended −1". Codec and SRC overshoots "can be additive". — [Production Expert summary](https://www.production-expert.com/production-expert-1/aes-update-loudness-recommendations-for-audio-only-streaming); [TD1008 PDF link (returned 404 on fetch)](https://aes.org/wp-content/uploads/2024/01/20210924_TD1008_v3.13.pdf)
- AES TD1008 anchor: speech-centric content is normalized to **-18 LUFS** (speech as the anchor, with music and SFX mixed against it). Music sits at -16/-14. — [Production Expert summary of TD1008](https://www.production-expert.com/production-expert-1/aes-update-loudness-recommendations-for-audio-only-streaming) (secondary; the primary PDF could not be fetched)
- ATSC A/85 (US TV): -24 LKFS. Netflix: -27 LKFS dialog-gated. Both are cited only via an aggregator. — [Fora Soft LUFS targets 2026](https://www.forasoft.com/learn/audio-for-video/articles-audio/lufs-targets-per-platform-2026)

**Platforms**
- Apple Podcasts (PLATFORM, official): loudness "around -16 dB LKFS, with a +/- 1 dB tolerance". True peak "doesn't exceed -1 dB FS". Measured per ITU-R BS.1770-5. Preconditioning happens before encoding. For RSS feeds Apple "strongly recommend[s] using AAC instead of MP3": mono 64–128 kbps, stereo 128–256 kbps. — [Apple Podcasts audio requirements](https://podcasters.apple.com/support/audio-requirements)
- Spotify (PLATFORM, official artist page): master at "-14dB integrated LUFS". User modes are Loud -11 / Normal -14 / Quiet -19. "Keep it below -1dB TP… best for lossy formats". "If your master is louder than -14dB integrated LUFS, keep True Peak below -2dB". The Loud-mode limiter works at -1 dB (sample), 5 ms attack, 100 ms decay. The page does not say whether this applies to podcasts. — [Spotify loudness normalization](https://support.spotify.com/au/artists/article/loudness-normalization/)
- Spotify podcasts at -14 LUFS / -1 dBTP is reported only by secondary sources. — [Fora Soft](https://www.forasoft.com/learn/audio-for-video/articles-audio/lufs-targets-per-platform-2026); [Podtools](https://podtools.cc/podcast-loudness-standards-lufs-explained/)
- YouTube: about -14 LUFS, turns down only and never boosts, always on (secondary source; YouTube publishes no official LUFS figure). — [Fora Soft](https://www.forasoft.com/learn/audio-for-video/articles-audio/lufs-targets-per-platform-2026)
- YouTube upload audio spec (official): AAC-LC or Opus, 48 kHz, stereo 384 kbps. — [YouTube recommended upload encoding settings](https://support.google.com/youtube/answer/1722171?hl=en)

**Codec overshoot data**
- At 128 kbps MP3, "overshoots as high as +1.5 dB are not uncommon". At maximum bitrate (320 kbps) peaks rarely change by more than 0.1 dB. — [Fora Soft true peak article](https://www.forasoft.com/learn/audio-for-video/articles-audio/true-peak-dbtp-inter-sample); [baken docs](https://docs.rs/crate/baken/3.0.2/source/docs/true-peak-ceiling.md) (practitioner sources, not controlled studies)

### Inferences
- **The target (-16) is fine.** It matches Apple and the top edge of AES/EBU-s2. YouTube does not boost, so -16 content plays about 2 LU quieter than -14 music there. That is acceptable, and AES says speech should sit 2–4 LU below music anyway. If the tutorials will only ever live on YouTube or LMS players, -16 to -14 is defensible. -18 (TD1008 speech anchor) would be the purist choice for speech-only content.
- **Tolerance:** ±1.5 LU is looser than every documented figure (Apple ±1, AES example ±0.5 for files, EBU ±0.2/±1 live). These are TTS renders under full control, so ±1 LU (Apple) as FAIL in the tutorial profile is easy to meet. ±0.5 LU could be a WARNING band.
- **True peak:** the pipeline's labels are right (-1 dBTP per EBU/AES/Apple). The gap is **where** it measures. The pipeline's own data (+0.6 dB at 160 kbps, +1.5 dB at 128 kbps) matches the documented "overshoot grows as bitrate drops". Recommendations:
  - (a) Measure true peak on the final encoded deliverable (decode the AAC and run BS.1770 true peak), not only on the WAV.
  - (b) Use a pre-encode ceiling of -2 dBTP for 160 kbps or more. Spotify independently uses -2 dB for loud masters.
  - (c) Avoid 128 kbps AAC for narration, or pre-limit to about -2.5/-3 dBTP there.
  - (d) YouTube asks for 384 kbps stereo AAC. At that rate the overshoot should be negligible, so the cheapest fix may be simply exporting at higher bitrate.
- **Sample-peak clipping = FAIL** is consistent with all sources and stricter than none.
- **Missing check (optional):** short-term loudness consistency between scenes. TD1004's "max short-term ≤ target +5 LU" for short-form is a usable anchor for per-scene jumps when scenes are synthesized separately.

### Gaps
- Could not fetch the primary AES TD1008 PDF (404). The -18 LUFS speech anchor and the exact codec wording come from secondary summaries.
- ATSC A/85 tolerance and true-peak recommendation (commonly cited as ±2 dB and -2 dBTP) were **not verified** from a primary source.
- No official documented loudness targets found for Instagram/Reels, TikTok or WhatsApp. These platforms appear to publish none, so any figure seen online is folklore.
- EBU Tech 3343/3344 specific lower true-peak values for particular codecs were not extracted.
- No controlled study of AAC-LC overshoot vs bitrate was found. The pipeline's own measurements are arguably better evidence than the practitioner figures above.

---

## 2. Silence / head-tail editing norms

### Takeaway
No standard or platform specification was found for leading or trailing silence in podcasts or web video. The pipeline's "ARBITRARY" provenance label for ≤1 s head / ≤2 s tail is accurate, and the limits are within common practice.

### Cited Findings
- Apple Podcasts audio requirements say nothing about silence. — [Apple Podcasts audio requirements](https://podcasters.apple.com/support/audio-requirements)
- Practitioner convention for silence *truncation inside* speech: a minimum silence length of about 0.5–1 s to avoid cutting breath pauses, with 0.5 s as one editor's standard (CONVENTION). — [Ardour forum](https://discourse.ardour.org/t/truncate-silence-to-5-second-and-exporting-questions/105276); [Auphonic blog, automatic silence cutting](https://auphonic.com/blog/2023/05/09/automatic-silence-cutting/)
- Van der Meij guidelines: when videos are split into segments, "each segment must have a clear beginning and end" (LITERATURE, a pacing argument, not a duration). — [van der Meij & van der Meij 2013 (U. Twente)](https://research.utwente.nl/en/publications/eight-guidelines-for-the-design-of-instructional-videos-for-softw/)

### Inferences
- Keep it as WARNING/ARBITRARY. A useful extra check is **internal** dead air: the longest silence inside narration, e.g. WARNING above about 2–3 s when no on-screen action happens. That links audio silence to the video-freeze check: silence plus frozen frames at the same time is a stronger "dead moment" signal than either alone.

### Gaps
- No broadcast delivery spec (e.g. DPP/AS-11 line-up conventions) was retrieved, so whether any broadcast norm defines head/tail silence is unverified.

---

## 3. Objective speech quality: MOS methodology, non-intrusive predictors, language bias, meaningful differences

### Takeaway
Non-intrusive predictors track human MOS well **at system level**. Per-file error is large (NISQA RMSE about 0.3–0.4 on a 1–5 scale), and the models degrade outside English. Even real P.808 human tests with 60 votes have 95% CIs about 0.3–0.4 wide. So a fixed NISQA-coloration cutoff of 4.10 anchored on a few files may be separating voices by less than the model's own error. Use it as a relative screen (scene vs. the voice's own baseline), not an absolute pass mark, and keep human listening as the final judge.

### Cited Findings
- ITU-T P.808 is the crowdsourcing ACR (Absolute Category Rating) method for speech-quality MOS. — [Naderi & Cutler, open-source P.808 implementation](https://arxiv.org/pdf/2005.08138)
- Study feeding into P.808: **at least 60 votes per condition** is "a reasonable compromise". With 60+ votes the 95% CI width stays below 0.4, and about 115 votes are needed for a width below 0.3. Lab tests average CI widths of 0.20–0.31. Crowd vs lab Spearman correlation is 0.89–0.97, RMSE 0.32–0.48. — [Naderi et al., impact of number of votes](https://ar5iv.arxiv.org/html/2003.11300)
- In a P.835 crowdsourcing validation, average 95% CIs were 0.14–0.17 (study-specific, not normative). — search result summary of [Naderi/Cutler P.835 work](https://arxiv.org/pdf/2010.13200)
- ITU-T P.1401 defines the statistical methods to evaluate and compare objective quality models (RMSE, correlation, polynomial mapping). — [ITU-T P.1401](https://www.itu.int/rec/T-REC-P.1401/en)
- **NISQA cross-lingual** (Wardah et al., TU Berlin, 2025), trained only on English (49k+ samples) and tested on DE/FR/ZH/SV/NL.
  - **Coloration PCC:** EN 0.759, ZH 0.799, FR 0.764, DE 0.665, SV 0.641, NL 0.622.
  - **Coloration RMSE:** EN 0.302, ZH 0.386, FR 0.361, DE 0.406, SV 0.333, NL 0.408.
  - MOS PCC ranges from 0.673 (SV) to 0.835 (ZH). Discontinuity is hard everywhere (EN PCC 0.363).
  - The authors conclude that both models "exhibit noticeable biases". Portuguese was **not** tested.
  - — [Wardah et al., "Language Barriers" (arXiv 2502.13004)](https://arxiv.org/pdf/2502.13004)
- **UTMOS**, VoiceMOS Challenge 2022:
  - Main track (English BVCC TTS/VC): utterance-level SRCC ≈ 0.897 (MSE ≈ 0.165), system-level SRCC ≈ 0.936.
  - Out-of-domain track: utterance SRCC ≈ 0.893, system SRCC ≈ 0.988.
  - — [VoiceMOS 2022 paper](https://arxiv.org/pdf/2203.11389); figures via [Emergent Mind UTMOS summary](https://www.emergentmind.com/topics/utmos)
- **UTMOSv2**, VoiceMOS 2024 track 1 (high-quality synthetic speech): 1st place in 7 of 16 metrics and 2nd in the other 9. The 2024 OOD track used a small Mandarin set. — [UTMOSv2 GitHub](https://github.com/sarulab-speech/UTMOSv2); [VoiceMOS 2024 paper](https://www.iis.sinica.edu.tw/papers/whm/new-7510-F.pdf)
- UTMOSv2 targets naturalness of mostly English high-quality TTS and "was not designed as a universal metric for… multilingual" audio. Learned predictors trained on English "may measure very little when off-distribution". — summary of [Neural networks for TTS evaluation (arXiv 2604.08562)](https://arxiv.org/pdf/2604.08562)
- Toolkits bundling DNSMOS, NISQA, UTMOS(v2) and SQUIM: VERSA. — [VERSA (NAACL 2025 demo)](https://aclanthology.org/2025.naacl-demo.19.pdf)
- Language-specific MOS predictors are an active direction, e.g. IndicMOS for 7 Indian languages. — [IndicMOS, Interspeech 2024](https://www.isca-archive.org/interspeech_2024/udupa24b_interspeech.pdf)

### Inferences
- **Coloration ≥ 4.10:** NISQA's coloration RMSE against humans is about 0.30–0.41 even in languages it handles well. If the rejected voice and the worst accepted scene are less than about 0.3–0.4 apart, the anchor reflects those specific files more than a perceptual boundary. Calibrate per voice instead:
  - Measure the chosen voice's distribution over many scenes.
  - FAIL scenes far below that voice's own median, e.g. median minus 2×MAD, which catches synthesis glitches.
  - Keep 4.10 only as a voice-selection gate, labelled CALIBRATED-LOCAL.
- NISQA was trained on telecom/VoIP-type distortions, so coloration measures codec/bandwidth-type timbre, not TTS prosody or naturalness. (The training-data nature is inferred from NISQA's purpose; the cited paper only says "English datasets".) For prosody, UTMOS/UTMOSv2 is the closer tool, despite the English bias. The pipeline's choice to discount UTMOS for pt-BR is consistent with the literature, but there is no pt-BR evidence either way.
- Use system-level means over all scenes rather than per-utterance scores for go/no-go. That is where correlations are high (0.94–0.99 vs about 0.89 per utterance).
- A cheap, standard-grounded upgrade: a small internal P.808-style ACR listening panel to validate the 4.10 anchor (even 5–10 listeners × several clips).

### Gaps
- No published evaluation of NISQA, UTMOS, DNSMOS or Distill-MOS on **Portuguese** (European or Brazilian) was found.
- DNSMOS P.835, TorchAudio-SQUIM and Distill-MOS were not individually researched. No correlation figures are reported here.
- The exact normative P.808 text on minimum votes and CI was not retrieved. Figures come from the study that fed into it.

---

## 4. TTS intelligibility via ASR (WER/CER), whisper normalization, pt-BR ASR baselines, reasonable fidelity threshold

### Takeaway
The field standard is WER from Whisper-large-v3 (English) or Paraformer (Chinese) against the input text. State-of-the-art TTS lands at about 1–2.5% WER, roughly equal to **human recordings** on the same benchmark (EN human 2.14%). Published pt TTS results are about 1.5–2.3% WER. A 99% fidelity gate (≤1% WER) is therefore **stricter than the published state of the art** and stricter than Whisper's own error on human pt speech. The pipeline's measured 93.3–98.7% spread on the same scene shows the gate would fail on ASR/TTS noise.

### Cited Findings
- **Seed-TTS-eval:** WER via Whisper-large-v3 (EN) and Paraformer-zh (ZH).
  - Seed-TTS: test-en 2.249, test-zh 1.115.
  - Human ground truth: test-en 2.143, test-zh 1.254.
  - The authors warn that lower WER is not always better. It often means "more 'standardized' speech that is easier for the ASR system to recognize, but at the expense of other desirable qualities" (expressiveness, speaker similarity).
  - — [Seed-TTS paper](https://arxiv.org/html/2406.02430v1)
- Seed-TTS-eval EN subset has 1,088 prompt-target pairs. Its intelligibility metric is WER with Whisper-large-v3. — [Raon-OpenTTS](https://arxiv.org/pdf/2605.20830)
- **Qwen3-TTS** Portuguese WER is 1.526–2.254 depending on variant. CosyVoice 3 and others report WER/CER with Whisper-large-v3 for non-CJK/CJK languages. — [Qwen3-TTS benchmarks page](https://www.mintlify.com/QwenLM/Qwen3-TTS/resources/benchmarks); [CosyVoice 3](https://arxiv.org/pdf/2505.17589)
- Whisper on **Portuguese human speech**:
  - large-v3: FLEURS WER about 3.9–4.1%, Common Voice about 11.6%.
  - medium: FLEURS about 5.1%, and in another evaluation about 8.1% (versus 6.6% fine-tuned).
  - Sources disagree by setup and normalization.
  - — [Voxtral report](https://arxiv.org/pdf/2507.13264); [whisper-medium-portuguese](https://www.promptlayer.com/models/whisper-medium-portuguese); [fsicoli fine-tune card](https://huggingface.co/fsicoli/whisper-medium-pt-cv19-fleurs2-lr-wu/blob/main/README.md?code=true)
- Whisper-large-v3 general English: LibriSpeech clean 2.7%, other 5.2%. — [Coval benchmarks](https://benchmarks.coval.ai/models/whisper-large-v3)

### Inferences
- **Recalibrate fidelity:**
  - Gate on about **≥97% per scene** (≈3% WER, consistent with published pt TTS plus Whisper-medium error).
  - Optionally require ≥98.5% aggregated over the whole video.
  - Raise a hard FAIL only for content errors on a whitelist of key terms: UI labels, menu names, numbers. Those are the errors that actually mislead a tutorial viewer.
- **Reduce variance before thresholding:**
  - Upgrade to whisper large-v3 (or large-v3-turbo). Medium's pt WER is materially worse.
  - Use temperature 0 / beam search.
  - Normalize both sides: numbers to words or vice versa, casing, punctuation. In pt-BR, normalize ordinals, "R$", decimal commas, dates, English UI loanwords and acronyms.
  - Report CER alongside WER. CER is less sensitive to segmentation and accent differences.
- The 98.7/93.3/98.7 variance means a scene at 93% should trigger **resynthesis plus a re-check**, not instant rejection. Two transcription passes and a check for a stable error location separate TTS mistakes from ASR mistakes.
- Seed-TTS's caveat matters for voice choice: chasing the lowest WER can push toward flatter voices.

### Gaps
- No published pt-BR-specific TTS intelligibility benchmark using faster-whisper medium was found. Whisper's own text normalizer is English-centric (not sourced here; known from the Whisper repo, unverified in this session).

---

## 5. Video quality: VMAF/PSNR/SSIM, YouTube 1080p specs, screen content, freeze vs stalling

### Takeaway
The pipeline checks resolution and freezing but not compression fidelity. Industry practice for encode quality is VMAF against the master: about 93–95 for "excellent", and about a 6-point drop is one JND. YouTube's 1080p SDR upload recommendation is 8 Mbps at 24–30 fps and 12 Mbps at 48–60 fps (H.264, MP4, closed GOP, 4:2:0). Standard QoE models (ITU-T P.1203) treat "stalling" as a delivery event (rebuffering), not authored static content. No standard sets a maximum frozen-screen percentage for tutorials, so the pipeline's local anchor is the only evidence available.

### Cited Findings
- YouTube official upload encoding settings:
  - 1080p SDR: 8 Mbps at 24/25/30 fps, 12 Mbps at 48/50/60 fps.
  - 1440p: 16/24 Mbps.
  - MP4, H.264, 2 consecutive B-frames, closed GOP, 4:2:0, same frame rate as recorded.
  - Audio: AAC-LC/Opus 48 kHz, 384 kbps stereo.
  - — [YouTube help 1722171](https://support.google.com/youtube/answer/1722171?hl=en)
- VMAF:
  - Netflix advised in 2017 that **6 VMAF points ≈ 1 JND** (noticeable by >50% of viewers). Deltas under 2 are irrelevant.
  - A score of about 93 means "indistinguishable from original or noticeable but not annoying".
  - Working top-rung target is **93–95**. Below 93 viewers start noticing, and above 95 the extra bandwidth buys nothing visible.
  - — [Streaming Learning Center, JND with VMAF](https://streaminglearningcenter.com/blogs/finding-the-just-noticeable-difference-with-netflix-vmaf.html); [Fora Soft, setting a quality target](https://www.forasoft.com/learn/video-quality/articles-vqm/setting-a-quality-target)
- ITU-T P.1203 models session QoE from a short-term video module, an audio module and an integration module. Its parameters are initial loading delay, the number and total duration of **stalling events** (buffer starvation interrupting playback), and quality switches. — [Fora Soft P.1203 glossary](https://www.forasoft.com/learn/video-quality/glossary/terms-vqm/p1203); [QoE tutorial (arXiv 2202.02454)](https://arxiv.org/pdf/2202.02454)
- Stalling, initial delay and quality adaptation are "the most important QoE factors" in streaming research. — [arXiv 2202.02454](https://arxiv.org/pdf/2202.02454)

### Inferences
- **Height ≥1080 in the tutorial profile** matches YouTube's mainstream tier. Also add a **bitrate floor**:
  - WARNING if the video stream is below about 8 Mbps at 30 fps or 12 Mbps at 60 fps (H.264) when the file is a YouTube master.
  - Or better, **VMAF ≥ 93 (FAIL < 90)** of the delivered encode against the lossless render. Screen text is the first casualty of under-bitrated encodes.
- VMAF was trained on natural video. Its validity for screen content (text, UI) is not established in what was found, so pair it with a text-legibility probe (e.g. OCR success on known UI labels in sampled frames). That is an inference, not a cited standard.
- **Freeze:** P.1203 "stalling" is a player event, so it does not map to static screen content in the master. The pipeline's freezedetect is a **content-pacing** metric with no external standard. Its anchors (approved 63.5% / 5.1 s vs rejected 93–95% / 10.2 s) are the only evidence and should stay labelled CALIBRATED-LOCAL.
- The literature does support motion and continuity qualitatively (see §6). Consider measuring "frozen while narrating about an action" (freeze overlapping narration that mentions clicks or menus) rather than raw percentage.

### Gaps
- No primary Netflix tech-blog statement of the 93–95 target was fetched. That figure is from practitioner sources citing Netflix.
- No study was found giving SSIM/PSNR thresholds for screen-content or tutorial video.
- No ITU/academic standard was found for "static content duration" in authored video.

---

## 6. Instructional/tutorial video research: length, pacing, static screens, cursor/zoom, speech rate (pt-BR)

### Takeaway
Evidence favors short segments (≤6 min), continuous visual motion synced with narration, and fairly fast, enthusiastic speech. Modern TTS no longer measurably hurts learning versus human voice in the newer studies. No study gives a numeric "max static screen seconds". pt-BR spontaneous speech runs about 4.2 syllables/s (about 125 words/min). English MOOC instructors average 156 wpm, and faster was more engaging.

### Cited Findings
- **Guo, Kim & Rubin 2014 (L@S):** 6.9M sessions, 4 edX courses.
  - Length: "median engagement time is at most 6 minutes, regardless of total video length". Students "often make it less than halfway through videos longer than 9 minutes". For 0–3 min videos, 75% of sessions watched over 3/4 of the video. Recommendation: segment into chunks "shorter than 6 minutes".
  - Speaking rate: ranges 48–254 wpm (mean 156, sd 31). Engagement "usually increases (up to 2x) with speaking rate", with a dip at 145–165 wpm for 6–12 min videos. Instructors should "not need to purposely slow down".
  - Visuals: Khan-style tablet drawing "more engaging than PowerPoint slides or code screencasts". Recommendation: "Introduce motion and continuous visual flow into tutorials".
  - Tutorials vs lectures: "for tutorials, add support for rewatching and skimming".
  - — [Guo, Kim & Rubin 2014 PDF](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)
- **Van der Meij & van der Meij 2013**, eight guidelines for software-training videos (Technical Communication 60(3)):
  - Easy access with meaningful titles.
  - Animation with narration: "use a spoken human voice", with "actions on screen in sync with narration".
  - Functional interactivity (pause/back).
  - Practice after demonstration.
  - Short videos (about 3 min) with clear segment beginnings and ends.
  - Validated in three studies (Word formatting): better motivation, skills and 1-week retention.
  - — [U. Twente record](https://research.utwente.nl/en/publications/eight-guidelines-for-the-design-of-instructional-videos-for-softw/); [Ingenta](https://www.ingentaconnect.com/contentone/stc/tc/2013/00000060/00000003/art00004)
- **Mayer's principles:** segmenting (user-paced segments), signaling (cues highlighting organization), redundancy (graphics + narration beat graphics + narration + identical on-screen text). Voice principle: human voice over machine voice. — [Dartmouth summary of Mayer's 12 principles](https://services.dartmouth.edu/TDClient/1806/Portal/KB/PrintArticle?ID=171655); [Pitt checklist](https://teaching.pitt.edu/wp-content/uploads/2023/03/multimedia-principles-checklist.pdf)
- **Voice principle vs modern TTS:**
  - Mayer et al. 2003 found human voice better than synthetic.
  - Mayer & DaPra 2012, with better TTS, found no learning difference.
  - Craig & Schroeder 2017 found a modern TTS voice performed as well as or better than human voice (more transfer learning, better training efficiency).
  - — [Learning Guild, "Almost Human (But Not Quite)"](https://www.learningguild.com/?p=10530); [ReadSpeaker summary](https://www.readspeaker.com/blog/elearning-voice) (secondary summaries)
- **pt-BR speech rate:** fluent young adults (João Pessoa) produced 200 fluent syllables in 48.96 s on average, which is 103.17 words, about 252 syllables/min or 4.20 syllables/s. That works out to about 126 words/min. This is spontaneous speech, not read narration. — [UFPB, velocidade da fala de adultos pessoenses](https://periodicos.ufpb.br/index.php/rbcs/article/view/48420)
- Speech rate varies by Brazilian variety (e.g. the Bahian variety is slower than the Minas Gerais variety). — [search summary of UFSC/UFES studies](https://periodicos.ufsc.br/index.php/workingpapers/article/download/92124/53982/365831)

### Inferences
- **New checks the pipeline could add:**
  - (a) Video/segment length: WARNING above 6 min (Guo).
  - (b) Narration rate in syllables/s, from the whisper word timestamps the pipeline already produces. A plausible pt-BR window is about 3.5–5.5 syll/s, with WARNING outside it. This is an inference from the 4.2 syll/s spontaneous baseline plus Guo's "faster is fine", not a standard.
  - (c) Redundancy: WARNING if on-screen captions are burned in verbatim while narration plays. Mayer's redundancy principle conflicts with burned-in captions, but closed captions (toggleable) satisfy accessibility without that conflict (see §7).
- The freeze limit (≤55%, ≤4 s) has qualitative backing ("motion and continuous visual flow", "actions in sync with narration") but no numeric literature anchor. Keep it CALIBRATED-LOCAL.
- Since the user is narrating with TTS, the newer voice-effect evidence (2012, 2017) supports TTS as acceptable. Mayer's original voice principle should not be cited as a reason to reject TTS outright.

### Gaps
- No empirical study was found on cursor highlighting, zoom-in usage or a maximum static-screen duration in screencasts. The Mayer/Fiorella Cambridge Handbook chapters were not fetched directly.
- No pt-BR study of *recommended* narration rate for e-learning was found, only descriptive speech-rate studies.

---

## 7. Accessibility: captions (WCAG 1.2.x), Brazilian norms (ABNT NBR 15290, LBI)

### Takeaway
Captions for prerecorded video are WCAG Level A, the minimum tier, and must include speaker identification and meaningful non-speech sounds. In Brazil, the LBI (Lei 13.146/2015, art. 67) and ABNT NBR 15290 (TV accessibility, 2005/2016) set closed-caption and audio-description expectations. The pipeline has **no caption check at all**, which is the biggest miss relative to standards. Since the script is known and timestamps exist, captions can be generated and verified cheaply.

### Cited Findings
- WCAG 2.2 SC 1.2.2 Captions (Prerecorded), **Level A**: "Captions are provided for all prerecorded audio content in synchronized media". Captions "identify who is speaking and include non-speech information conveyed through sound". — [W3C Understanding 1.2.2](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html)
- ABNT NBR 15290 sets accessibility guidelines for television (closed caption, audio description). EBC requires third-party CC/AD to conform to NBR 15290:2005. — [EBC NOR 704](https://www.ebc.com.br/sites/_institucional/files/atoms/files/nor_704_-_norma_de_formato_padrao_em_alta_definicao_-direx_18.12.18.pdf)
- Descriptive subtitles (LSE) are mandatory under LBI (Lei 13.146/2015, art. 67) and regulated by ABNT NBR 15290:2016. Closed caption in pt-BR covers dialogues, sound effects and environmental sounds. — [TRE-MS estudo preliminar](https://www.tre-ms.jus.br/transparencia-e-prestacao-de-contas/licitacoes/pregao/pregao-2022/arquivos-2022/tre-ms-pg-36-2022-legenda-e-audiodescricao-estudo-preliminar); [UFMA Cambiassu article](https://www.periodicoseletronicos.ufma.br/index.php/cambiassu/article/download/22782/12211/69605)

### Inferences
- Add a tutorial-profile check: a **sidecar caption file exists** (SRT/VTT), its text matches the script (reuse the fidelity metric), cues stay in sync with audio (whisper timestamps within about ±0.5 s; tolerance is an inference), and reading speed is reasonable. WCAG sets no numeric caption rate; NBR 15290 has TV-specific parameters not retrieved here.
- For TTS tutorials where the visual shows UI actions, WCAG 1.2.3/1.2.5 (audio description) is usually satisfied when narration already describes the actions. This could be checked semi-automatically: narration mentions the action the cursor performs. That is an inference.
- Art. 67 of the LBI is aimed at broadcast TV. Whether it legally binds corporate tutorial videos on the web was not established, but WCAG/eMAG practice makes captions the safe default.

### Gaps
- NBR 15290 numeric parameters (characters per line, display time, delay) were not retrieved. The norm is paywalled.
- The levels and text of WCAG 1.2.1, 1.2.3 and 1.2.5 were not verified in this session (only 1.2.2 was fetched).
- eMAG (Brazilian federal government accessibility model) requirements for video were not researched.
