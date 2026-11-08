//! A stretch of a take's decoded audio as its own WAV file: for sharing a clip, and for an AI app
//! that asks to hear part of a take. Read from the 16-bit PCM `analysis.wav` the analysis writes
//! next to the original, which is never changed.

/// The part of a 16-bit PCM WAV between `start_s` and `end_s` (clamped to the audio, and to at most
/// `max_s` seconds), as a new WAV, with the start and end actually used.
pub fn wav_clip(
    bytes: &[u8],
    start_s: f64,
    end_s: f64,
    max_s: f64,
) -> anyhow::Result<(Vec<u8>, f64, f64)> {
    anyhow::ensure!(
        bytes.len() > 44 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WAVE",
        "not a WAV file"
    );
    let mut pos = 12;
    let (mut channels, mut rate, mut bits) = (0u16, 0u32, 0u16);
    let mut data: Option<(usize, usize)> = None;
    while pos + 8 <= bytes.len() {
        let id = &bytes[pos..pos + 4];
        let size = u32::from_le_bytes(bytes[pos + 4..pos + 8].try_into()?) as usize;
        let body = pos + 8;
        if id == b"fmt " {
            channels = u16::from_le_bytes(bytes[body + 2..body + 4].try_into()?);
            rate = u32::from_le_bytes(bytes[body + 4..body + 8].try_into()?);
            bits = u16::from_le_bytes(bytes[body + 14..body + 16].try_into()?);
        } else if id == b"data" {
            data = Some((body, size.min(bytes.len() - body)));
            break;
        }
        pos = body + size + (size & 1);
    }
    let (off, len) = data.ok_or_else(|| anyhow::anyhow!("WAV has no data chunk"))?;
    anyhow::ensure!(
        bits == 16 && channels >= 1 && rate > 0,
        "unsupported WAV format"
    );
    let frame = (channels as usize) * 2;
    let total = len / frame;
    let dur = total as f64 / rate as f64;
    let s = start_s.clamp(0.0, dur);
    let e = end_s.clamp(s, dur).min(s + max_s);
    let (a, b) = ((s * rate as f64) as usize, (e * rate as f64) as usize);
    let pcm = &bytes[off + a * frame..off + b * frame];
    let mut out = Vec::with_capacity(44 + pcm.len());
    out.extend_from_slice(b"RIFF");
    out.extend_from_slice(&(36 + pcm.len() as u32).to_le_bytes());
    out.extend_from_slice(b"WAVEfmt ");
    out.extend_from_slice(&16u32.to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes());
    out.extend_from_slice(&channels.to_le_bytes());
    out.extend_from_slice(&rate.to_le_bytes());
    out.extend_from_slice(&(rate * frame as u32).to_le_bytes());
    out.extend_from_slice(&(frame as u16).to_le_bytes());
    out.extend_from_slice(&16u16.to_le_bytes());
    out.extend_from_slice(b"data");
    out.extend_from_slice(&(pcm.len() as u32).to_le_bytes());
    out.extend_from_slice(pcm);
    Ok((out, s, e))
}

#[cfg(test)]
mod tests {
    use super::wav_clip;

    /// A mono 16-bit WAV of `secs` seconds at `rate`, each sample holding its own index.
    fn wav(rate: u32, secs: usize) -> Vec<u8> {
        let n = rate as usize * secs;
        let pcm: Vec<u8> = (0..n).flat_map(|i| (i as i16).to_le_bytes()).collect();
        let mut out = b"RIFF".to_vec();
        out.extend_from_slice(&(36 + pcm.len() as u32).to_le_bytes());
        out.extend_from_slice(b"WAVEfmt ");
        out.extend_from_slice(&16u32.to_le_bytes());
        out.extend_from_slice(&1u16.to_le_bytes());
        out.extend_from_slice(&1u16.to_le_bytes());
        out.extend_from_slice(&rate.to_le_bytes());
        out.extend_from_slice(&(rate * 2).to_le_bytes());
        out.extend_from_slice(&2u16.to_le_bytes());
        out.extend_from_slice(&16u16.to_le_bytes());
        out.extend_from_slice(b"data");
        out.extend_from_slice(&(pcm.len() as u32).to_le_bytes());
        out.extend_from_slice(&pcm);
        out
    }

    #[test]
    fn a_clip_is_the_asked_stretch_clamped_to_the_take_and_the_limit() {
        let src = wav(1000, 10);
        let (clip, s, e) = wav_clip(&src, 2.0, 3.5, 300.0).unwrap();
        assert_eq!((s, e), (2.0, 3.5));
        assert_eq!(clip.len(), 44 + 1500 * 2);
        assert_eq!(
            i16::from_le_bytes([clip[44], clip[45]]),
            2000,
            "starts at 2 s"
        );
        let (_, s, e) = wav_clip(&src, -1.0, 99.0, 300.0).unwrap();
        assert_eq!((s, e), (0.0, 10.0), "clamped to the take");
        let (_, _, e) = wav_clip(&src, 1.0, 9.0, 4.0).unwrap();
        assert_eq!(e, 5.0, "at most the limit");
        assert!(
            wav_clip(
                b"not a wav at all, no header here........................",
                0.0,
                1.0,
                1.0
            )
            .is_err()
        );
    }
}
