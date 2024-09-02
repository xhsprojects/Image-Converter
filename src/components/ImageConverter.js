import React, { useEffect, useState, useCallback } from 'react';
import { Trash2, Upload, Download, Settings, RotateCw, AlertTriangle, FileType, Archive } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PDFDocument } from 'pdf-lib';

const ImageConverter = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [convertedFiles, setConvertedFiles] = useState([]);
  const [outputFormat, setOutputFormat] = useState('PNG');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quality, setQuality] = useState(90);
  const [resize, setResize] = useState({ width: '', height: '' });
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage(height, "*");
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [convertedFiles, progress]);

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  }, []);

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const removeFile = (index) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const convertImages = async (format = outputFormat) => {
    if (selectedFiles.length === 0) {
      alert('Silakan pilih file terlebih dahulu.');
      return;
    }

    setProgress(0);
    setErrorMessage('');
    setIsConverting(true);

    const interval = 100;
    const progressUpdateInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 1, 100));
    }, interval);

    try {
      const converted = await Promise.all(
        selectedFiles.map(async (file, index) => {
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
          const formatLower = format.toLowerCase();

          if (formatLower === 'pdf') {
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([canvas.width, canvas.height]);
            const imgData = canvas.toDataURL('image/png').split(',')[1];
            const image = await pdfDoc.embedPng(imgData);
            page.drawImage(image, { x: 0, y: 0, width: canvas.width, height: canvas.height });
            const pdfBytes = await pdfDoc.save();
            dataUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
          } else if (formatLower === 'svg') {
            const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"><image href="${canvas.toDataURL('image/png')}" width="${canvas.width}" height="${canvas.height}" /></svg>`;
            dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
          } else {
            dataUrl = canvas.toDataURL(`image/${formatLower}`, quality / 100);
          }

          return {
            name: `${file.name.split('.')[0]}.${formatLower}`,
            dataUrl,
          };
        })
      );

      clearInterval(progressUpdateInterval);
      setProgress(100);
      setConvertedFiles(converted);
    } catch (error) {
      clearInterval(progressUpdateInterval);
      setErrorMessage(`Konversi gagal: ${error.message}`);
      setProgress(0);
    } finally {
      setIsConverting(false);
    }
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
    convertedFiles.forEach((file) => {
      const base64Data = file.dataUrl.split(',')[1];
      zip.file(file.name, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'converted_images.zip');
  };

  const removeConvertedFile = (index) => {
    setConvertedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto mt-10 p-6 bg-[#2F2F30] rounded-lg shadow-xl font-overpass">
      
      <div className="text-center mb-6">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2 text-white">Image Converter</h1>
        <p className="text-sm text-gray-300">Convert images online, for free.</p>
      </div>

      <nav className="mb-6 overflow-x-auto">
        <ul className="flex justify-center gap-2 md:gap-4 whitespace-nowrap">
          {['PNG', 'JPEG', 'WEBP', 'PDF', 'SVG'].map((format) => (
            <li key={format}>
              <button
                onClick={() => convertImages(format)}
                className={`px-3 py-1 md:px-4 md:py-2 rounded-lg font-overpass text-sm md:text-base ${
                  outputFormat === format ? 'bg-[#F7AA01] text-[#2F2F30]' : 'bg-gray-500 text-gray-300'
                } hover:bg-[#F7AA01] hover:text-[#2F2F30] transition-colors duration-200`}
              >
                {format}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mb-6">
        <h2 className="text-xl lg:text-2xl mb-2 font-overpass text-white">Upload Files</h2>
        <div
          className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer bg-gray-700 flex flex-col justify-center items-center"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <Upload size={48} className="text-gray-300 mb-4" />
          <p className="text-gray-300">Drag & Drop files here</p>
          <p className="text-gray-300">or</p>
          <button
            onClick={() => document.getElementById('fileInput').click()}
            className="bg-[#F7AA01] text-[#2F2F30] px-4 py-2 rounded-lg mt-2 flex items-center gap-2 hover:bg-[#F7AA01]/80 transition-colors duration-200"
          >
            <Upload size={20} />
            Select Files
          </button>
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
              <div key={index} className="flex justify-between items-center bg-gray-700 p-2 rounded-lg mb-2">
                <span className="truncate text-white">{file.name}</span>
                <button onClick={() => removeFile(index)} className="text-red-500 ml-2">
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-xl lg:text-2xl mb-2 font-overpass text-white">Output Format</h2>
        <select
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value)}
          className="w-full p-2 border rounded-lg bg-gray-700 text-white"
        >
          <option>PNG</option>
          <option>JPEG</option>
          <option>WEBP</option>
          <option>PDF</option>
          <option>SVG</option>
        </select>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-[#F7AA01] hover:text-[#F7AA01]/80 transition-colors duration-200"
        >
          <Settings size={20} />
          Advanced Settings
        </button>
        
        {convertedFiles.length > 0 && (
          <button
            onClick={() => downloadAllAsZip()}
            className="bg-[#F7AA01] text-[#2F2F30] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#F7AA01]/80 transition-colors duration-200"
          >
            <Archive size={20} />
            Download All as ZIP
          </button>
        )}
        
        <button
          onClick={() => convertImages(outputFormat)}
          disabled={isConverting}
          className={`bg-[#F7AA01] text-[#2F2F30] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#F7AA01]/80 transition-colors duration-200 ${
            isConverting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <FileType size={20} />
          {isConverting ? 'Converting...' : 'Convert'}
        </button>
      </div>

      {showAdvanced && (
        <div className="mb-6">
          <h2 className="text-xl lg:text-2xl mb-2 font-overpass text-white">Advanced Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-white">Quality (JPEG/WebP)</label>
              <input
                type="range"
                min="1"
                max="100"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full bg-gray-700"
              />
              <span className="text-white">{quality}%</span>
            </div>
            <div>
              <label className="block mb-2 text-white">Resize</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Width"
                  value={resize.width}
                  onChange={(e) => setResize({ ...resize, width: e.target.value })}
                  className="w-full p-2 border rounded-lg bg-gray-700 text-white"
                />
                <input
                  type="number"
                  placeholder="Height"
                  value={resize.height}
                  onChange={(e) => setResize({ ...resize, height: e.target.value })}
                  className="w-full p-2 border rounded-lg bg-gray-700 text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {progress > 0 && (
        <div className="mb-6">
          <div className="relative w-full bg-gray-200 rounded-lg overflow-hidden h-4">
            <div
              className="absolute top-0 left-0 h-full bg-[#F7AA01] transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center mt-2 text-white">{progress}%</p>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertTriangle size={24} />
          <span>{errorMessage}</span>
        </div>
      )}

      {convertedFiles.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl lg:text-2xl mb-2 font-overpass text-white">Converted Files</h2>
          <div className="flex flex-col">
            {convertedFiles.map((file, index) => (
              <div key={index} className="flex justify-between items-center bg-gray-700 p-2 rounded-lg mb-2">
                <span className="truncate text-white">{file.name}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => downloadFile(file)} className="text-[#F7AA01]">
                    <Download size={20} />
                  </button>
                  <button onClick={() => removeConvertedFile(index)} className="text-red-500">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={() => window.location.reload()}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg"
        >
          <RotateCw size={20} />
        </button>
      </div>
    </div>
  );
};

export default ImageConverter;
