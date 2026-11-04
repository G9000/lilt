# Painted room objects

Approved direction: replace the small left monitor with a cassette music player;
retain the main/right monitor customization. Camera opens Photos, microphone opens
the existing Practice entry, and the player opens music controls.

Implementation and verification:

1. Edit the day background and its three lighting variants, preserving composition.
   Save v3 WebP assets and record generation prompts in the artwork credits.
2. Add accessible physical targets and a viewport music panel. Reuse Lilt's lo-fi,
   volume and Spotify controls; replace the duplicate floating radio. No autoplay.
   Preserve microphone ducking and playback while controls close. Provide narrow-screen
   shortcuts when objects are cropped, focus return, Escape/outside/route dismissal.
3. Check real room navigation, player state, volume/moods, mic ducking, monitor
   customization, lighting, cat framing and small-screen layout in isolated Chrome.
4. Update guide/design/release notes. Run required checks, review, and commit on main.

Tests block all practice API access. Owner data and the running app remain untouched.
