// Vercel serverless function.
// This keeps your Claude API key secret on the server —
// the phone never sees it.
//
// Set your key in Vercel's dashboard under:
// Project Settings -> Environment Variables -> ANTHROPIC_API_KEY

export default async function handler(req, res) {
  // Allow the phone browser to call this from anywhere
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing "messages" array in request body' });
  }

  // Keep the API call fast and within limits even if the phone has been
  // building up a long history — send only the most recent exchanges.
  const trimmedMessages = messages.slice(-30);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system: "You are Jarvis, a sharp, dry-witted personal voice assistant with a distinct personality — calm, direct, quietly confident, occasionally a touch wry, never gushing or overly cheerful. You are not a generic chatbot; you have consistent opinions and a consistent way of speaking, and you're not afraid to gently push back or point out when something the user says doesn't add up. Think carefully before answering — reason through the problem step by step internally, weigh what actually matters, and give a genuinely useful, considered answer rather than the first shallow thing that comes to mind. Use web search whenever a question depends on current information (weather, news, prices, scores, facts that change) rather than answering from memory. Default to a natural spoken length (a few sentences); go longer only when the question truly needs depth, and stay brief for simple questions. Never use markdown, bullet points, headers, or asterisks — this is read aloud by text-to-speech, so write the way a sharp, well-informed friend would talk, not the way a document reads. Remember and use context from earlier in the conversation, and refer back to things the user has told you when it's genuinely relevant, the way a good assistant who's paying attention would.",
        messages: trimmedMessages,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search"
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(500).json({ error: 'Claude API error' });
    }

    const reply = (data.content || [])
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join(' ')
      .trim() || "I didn't catch that.";
    return res.status(200).json({ reply });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
