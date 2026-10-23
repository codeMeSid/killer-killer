# killer-killer trailer audio (30 s, A minor, 90 BPM, beat 0.667 s)

Files: `music.wav foley.wav vo.wav` (stems, 48k stereo 24-bit), `master.wav`, `master.mp3` (320k), `cues.json`.

## Build
All synthesized in Python (numpy/scipy, venv outside repo), no samples.
- Music: 5-voice detuned saw pads (A-F-E-A progression), A1 sub drone, sine/noise riser 14-21 s, struck low-string hits, FM-style sub heartbeat 6-21 s, pad/drone cut 21-22 s (breath), drop at 22.0 s (sub pitch-drop, boom, crack, A/E/C stack), slow outro pulses.
- Foley: rain, lamp whirr (panned sweep), paper slide, typed keys, camera shutter, pin clack, stamp thunk (16.0), one bit-crushed glitch burst (18.667), whooshes.
- Reverb: synthetic decaying-noise stereo IR, FFT convolution (music 0.33 wet, foley 0.18, vo 0.30).
- VO: VoiceStudio MCP `generate_speech` (instruct `middle-aged, very low pitch, british accent`, speed 0.85, 32 steps). VoiceStudio `transcribe` vs script = 1.00 for all five lines. Not macOS `say`.
- Mix: VO envelope follower drives ducking (music up to ~-5 dB, foley ~-3 dB), `highpass 25`, `acompressor` 2.5:1 bus, `loudnorm` two-pass linear to -14 LUFS, `alimiter`. Stems are pre-master (before ducking and loudness gain); they do not sum to master.

## Levels (ffmpeg ebur128)
- master.wav: -14.0 LUFS integrated, LRA 3.3 LU, true peak -1.5 dBTP.
- master.mp3: -0.7 dB trim so codec overs stay under -1 dBTP; true peak -1.5 dBTP, about -14.7 LUFS.
- Stem max: music -3.9, foley -2.0, vo -3.5 dBFS.

## Not verified
Nobody listened. Checked by numbers, spectrogram and VO transcription only. Timbre, balance, VO delivery, reverb taste unjudged.
