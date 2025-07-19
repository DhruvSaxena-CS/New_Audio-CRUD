const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const axios = require('axios');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads/data.json exists
const dataPath = path.join(__dirname, 'uploads', 'data.json');
if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(dataPath, '[]');
}

// Home form
app.get('/', (req, res) => {
  res.render('index');
});

// Handle submission (upload or text)
app.post('/upload', upload.single('audio'), async (req, res) => {
  const { text, lang } = req.body;
  const file = req.file;
  let filename = '';
  let filePath = '';
  let savedText = text || '';
  let voiceLang = lang || 'eng';

  if (!file && !text) {
    return res.send('Please upload a file or enter text.');
  }

  if (file) {
    filename = file.filename + path.extname(file.originalname);
    filePath = path.join(__dirname, 'uploads', filename);
    fs.renameSync(file.path, filePath);
  } else {
    // Generate audio from ElevenLabs
    const voiceMap = {
      eng: 'pNInz6obpgDQGcFmaJgB', // Adam
      hin: 'yoZ06aMxZJJ28mfd3POQ', // Hindi male
      mar: 'EXAVITQu4vr4xnSDxMaL'  // Marathi male
    };
    const voiceId = voiceMap[voiceLang] || voiceMap.eng;

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        { text: savedText, model_id: 'eleven_multilingual_v2' },
        {
          headers: {
            'xi-api-key': process.env.EL_API_KEY,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      filename = uuid() + '.mp3';
      filePath = path.join(__dirname, 'uploads', filename);
      fs.writeFileSync(filePath, response.data);
    } catch (err) {
      console.error('TTS API Error:', err.response?.data || err.message);
      return res.send('Text-to-Speech preview failed.');
    }
  }

  // Save metadata
  const data = JSON.parse(fs.readFileSync(dataPath));
  data.push({
    filename: filename,
    path: `/uploads/${filename}`,
    text: savedText,
    lang: voiceLang,
    timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss')
  });
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  res.redirect('/list-audio');
});

// TTS Preview API
app.post('/api/tts', async (req, res) => {
  const { text, lang } = req.body;
  const voiceMap = {
    eng: 'KSsyodh37PbfWy29kPtx',
    hin: 'KSsyodh37PbfWy29kPtx',
    mar: 'KSsyodh37PbfWy29kPtx'
  };
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
    console.error('TTS API Error:', error.response?.data || error.message);
    res.status(500).send('TTS conversion failed.');
  }
});

// List uploaded/generated audio
app.get('/list-audio', (req, res) => {
  const data = JSON.parse(fs.readFileSync(dataPath));
  res.render('list-audio', { uploadedFiles: data.reverse() });
});

function uuid() {
  return Math.random().toString(36).substring(2, 10) + Date.now();
}

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
