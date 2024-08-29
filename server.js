const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('build'));

app.post('/api/convert', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const { buffer, originalname } = req.file;
  const { format } = req.body;

  try {
    let convertedBuffer;
    switch (format) {
      case 'jpeg':
      case 'png':
      case 'webp':
        convertedBuffer = await sharp(buffer)[format]().toBuffer();
        break;
      case 'svg':
        // Note: This is a placeholder. Actual SVG conversion is complex and may require additional libraries.
        return res.status(400).send('SVG conversion not supported.');
      case 'pdf':
        // Note: This is a placeholder. PDF conversion requires additional setup.
        return res.status(400).send('PDF conversion not supported.');
      default:
        return res.status(400).send('Invalid format specified.');
    }

    res.set('Content-Type', `image/${format}`);
    res.set('Content-Disposition', `attachment; filename=converted.${format}`);
    res.send(convertedBuffer);
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).send('Error during conversion');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});