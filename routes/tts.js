const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

const voiceMap = {
  eng: 'KSsyodh37PbfWy29kPtx',
  hin: 'KSsyodh37PbfWy29kPtx',
  mar: 'KSsyodh37PbfWy29kPtx'
};

router.post('/', async (req, res) => {
  const { text, lang } = req.body;
  const voiceId = voiceMap[lang] || voiceMap.eng;

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      { text, model_id: 'eleven_multilingual_v2' },
      {
        headers: {
          'xi-api-key': process.env.EL_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'inline; filename=speech.mp3'
    });
    res.send(response.data);
  } catch (error) {
  if (error.response?.data) {
    const decoded = Buffer.from(error.response.data).toString('utf8');
    console.error('Decoded TTS API Error:', decoded);
  } else {
    console.error('TTS API Error:', error.message);
  }
  res.status(500).send('TTS conversion failed.');
}
});

module.exports = router;
