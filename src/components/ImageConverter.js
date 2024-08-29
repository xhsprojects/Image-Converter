import React, { useState, useCallback } from 'react';
import { Trash2, Upload, Download, Settings, RotateCw } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PDFDocument } from 'pdf-lib';
import { Canvg } from 'canvg'; // Import Canvg

const ImageConverter = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [convertedFiles, setConvertedFiles] = useState([]);
  const [outputFormat, setOutputFormat] = useState('PNG');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quality, setQuality] = useState(90);
  const [resize, setResize] = useState({ width: '', height: '' });

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prevFiles => [...prevFiles, ...files]);
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(prevFiles => [...prevFiles, ...files]);
  }, []);

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const removeFile = (index) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const convertImages = async () => {
    if (selectedFiles.length === 0) {
      alert('Silakan pilih file terlebih dahulu.');
      return;
    }

    const converted = await Promise.all(selectedFiles.map(async (file) => {
      const img = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (resize.width && resize.height) {
        canvas.width = parseInt(resize.width);
        canvas.height = parseInt(resize.height);
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let dataUrl;
      if (outputFormat === 'PDF') {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([canvas.width, canvas.height]);
        const imgData = canvas.toDataURL('image/png').split(',')[1];
        const image = await pdfDoc.embedPng(imgData);
        page.drawImage(image, { x: 0, y: 0, width: canvas.width, height: canvas.height });
        const pdfBytes = await pdfDoc.save();
        dataUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
      } else if (outputFormat === 'SVG') {
        const svgString = canvas.toDataURL('image/svg+xml');
        dataUrl = svgString;
      } else {
        dataUrl = canvas.toDataURL(`image/${outputFormat.toLowerCase()}`, quality / 100);
      }

      return {
        name: `${file.name.split('.')[0]}.${outputFormat.toLowerCase()}`,
        dataUrl
      };
    }));

    setConvertedFiles(converted);
  };

  const downloadFile = (file) => {
    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllAsZip = async () => {
    if (convertedFiles.length === 0) {
      alert('Tidak ada file yang dapat diunduh.');
      return;
    }

    const zip = new JSZip();
    convertedFiles.forEach(file => {
      const base64Data = file.dataUrl.split(',')[1];
      zip.file(file.name, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'converted_images.zip');
  };

  const removeConvertedFile = (index) => {
    setConvertedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl font-overpass">
      <div className="text-center mb-6">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2">Image Converter</h1>
        <p className="text-sm text-gray-600">Convert images files into JPG, PNG, SVG or PDF online, for free.</p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl lg:text-2xl mb-2 font-overpass">Upload Files</h2>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer bg-gray-100"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <p className="text-gray-500">Drag & Drop files here or click to select files</p>
          <input
            id="fileInput"
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            multiple
            className="hidden"
          />
        </div>
        {selectedFiles.length > 0 && (
          <div className="flex flex-col mt-4">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex justify-between items-center bg-gray-100 p-2 rounded-lg mb-2">
                <span className="truncate">{file.name}</span>
                <button onClick={() => removeFile(index)} className="text-red-500 ml-2">
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-xl lg:text-2xl mb-2 font-overpass">Output Format</h2>
        <select
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value)}
          className="w-full p-2 border rounded-lg font-overpass"
        >
          <option>PNG</option>
          <option>JPEG</option>
          <option>WEBP</option>
          <option>PDF</option>
          <option>SVG</option>
        </select>
      </div>

      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-blue-500 font-overpass"
        >
          <Settings size={20} className="mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </button>
        <button
          onClick={convertImages}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center font-overpass"
        >
          <RotateCw size={20} className="mr-2" />
          Convert
        </button>
      </div>

      {showAdvanced && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg lg:text-xl font-semibold mb-2 font-overpass">Advanced Settings</h3>
          <div className="mb-4">
            <label className="block mb-1 font-overpass">Quality (JPEG/WEBP)</label>
            <input
              type="range"
              min="1"
              max="100"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full"
            />
            <span>{quality}%</span>
          </div>
          <div>
            <label className="block mb-1 font-overpass">Resize</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Width"
                value={resize.width}
                onChange={(e) => setResize({...resize, width: e.target.value})}
                className="w-1/2 p-2 border rounded font-overpass"
              />
              <input
                type="number"
                placeholder="Height"
                value={resize.height}
                onChange={(e) => setResize({...resize, height: e.target.value})}
                className="w-1/2 p-2 border rounded font-overpass"
              />
            </div>
          </div>
        </div>
      )}

      {convertedFiles.length > 0 && (
        <div>
          <h2 className="text-xl lg:text-2xl mb-4 font-overpass">Converted Files:</h2>
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={downloadAllAsZip}
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-overpass"
            >
              Download All as ZIP
            </button>
          </div>
          <ul>
            {convertedFiles.map((file, index) => (
              <li key={index} className="flex justify-between items-center bg-gray-100 p-2 rounded-lg mb-2">
                <span className="truncate">{file.name}</span>
                <div className="flex items-center">
                  <button onClick={() => downloadFile(file)} className="text-blue-500 ml-2">
                    <Download size={20} />
                  </button>
                  <button onClick={() => removeConvertedFile(index)} className="text-red-500 ml-2">
                    <Trash2 size={20} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImageConverter;
