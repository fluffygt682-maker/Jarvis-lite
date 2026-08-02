// Vercel serverless function.
// Converts Jarvis's text reply into a natural-sounding voice using ElevenLabs.
// Falls back to the phone's built-in voice automatically (handled in index.html)
// if this fails or if you haven't set up ElevenLabs yet.
//
// Set your key in Vercel's dashboard under:
// Project Settings -> Environment Variables -> ELEVENLABS_API_KEY
//
// Optional: set ELEVENLABS_VOICE_ID to pick a different voice from
// https://elevenlabs.io/app/voice-library (default below is "Rachel",
// a natural, calm default voice included on the free plan).

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const { text } = req.body || {};
  if (!text) {
    return res.status(400).json({ error: 'Missing "text" in request body' });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('ElevenLabs error:', errText);
      return res.status(500).json({ error: 'TTS provider error' });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.status(200).send(Buffer.from(audioBuffer));

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
