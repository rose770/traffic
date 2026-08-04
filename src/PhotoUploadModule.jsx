import React, { useState, useRef } from 'react';
import { Upload, X, MapPin, Calendar, Info, AlertTriangle, CheckCircle2, Image as ImageIcon } from 'lucide-react';

const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// Simplified inline EXIF parser
const parseExifGPS = (buffer) => {
  const dataView = new DataView(buffer);
  if (dataView.getUint16(0) !== 0xffd8) return null; // Not JPEG

  let offset = 2;
  while (offset < dataView.byteLength - 2) {
    const marker = dataView.getUint16(offset);
    if (marker === 0xffe1) {
      const tiffStart = offset + 10;
      if (dataView.getUint32(offset + 4) !== 0x45786966) return null; // 'Exif'
      
      const littleEndian = dataView.getUint16(tiffStart) === 0x4949; // 'II'
      const ifd0Offset = dataView.getUint32(tiffStart + 4, littleEndian);
      
      return parseTags(dataView, tiffStart, tiffStart + ifd0Offset, littleEndian);
    }
    offset += 2 + dataView.getUint16(offset + 2);
  }
  return null;
};

const parseTags = (dataView, tiffStart, dirStart, littleEndian) => {
  const entries = dataView.getUint16(dirStart, littleEndian);
  let gpsOffset = null;
  let dateStr = null;

  for (let i = 0; i < entries; i++) {
    const entryOffset = dirStart + 2 + i * 12;
    const tag = dataView.getUint16(entryOffset, littleEndian);
    
    if (tag === 0x8769) { // EXIF Offset
      // We could look for DateTimeOriginal here, but to keep it simple we just grab GPS
    }
    if (tag === 0x8825) { // GPS Info Offset
      gpsOffset = dataView.getUint32(entryOffset + 8, littleEndian);
    }
  }

  if (!gpsOffset) return null;
  
  const gpsDirStart = tiffStart + gpsOffset;
  const gpsEntries = dataView.getUint16(gpsDirStart, littleEndian);
  
  let lat = null, lng = null, latRef = 'N', lngRef = 'E';

  for (let i = 0; i < gpsEntries; i++) {
    const entryOffset = gpsDirStart + 2 + i * 12;
    const tag = dataView.getUint16(entryOffset, littleEndian);
    
    if (tag === 1) { // GPSLatitudeRef
      const valOffset = tiffStart + dataView.getUint32(entryOffset + 8, littleEndian);
      // Hacky string read
      latRef = String.fromCharCode(dataView.getUint8(entryOffset + 8)); 
    } else if (tag === 2) { // GPSLatitude
      lat = readGpsCoordinate(dataView, tiffStart, entryOffset, littleEndian);
    } else if (tag === 3) { // GPSLongitudeRef
      lngRef = String.fromCharCode(dataView.getUint8(entryOffset + 8));
    } else if (tag === 4) { // GPSLongitude
      lng = readGpsCoordinate(dataView, tiffStart, entryOffset, littleEndian);
    }
  }

  if (lat !== null && lng !== null) {
    if (latRef === 'S') lat = -lat;
    if (lngRef === 'W') lng = -lng;
    return { lat, lng };
  }
  
  return null;
};

const readGpsCoordinate = (dataView, tiffStart, entryOffset, littleEndian) => {
  const valOffset = tiffStart + dataView.getUint32(entryOffset + 8, littleEndian);
  const degNum = dataView.getUint32(valOffset, littleEndian);
  const degDen = dataView.getUint32(valOffset + 4, littleEndian);
  const minNum = dataView.getUint32(valOffset + 8, littleEndian);
  const minDen = dataView.getUint32(valOffset + 12, littleEndian);
  const secNum = dataView.getUint32(valOffset + 16, littleEndian);
  const secDen = dataView.getUint32(valOffset + 20, littleEndian);
  
  const deg = degNum / (degDen || 1);
  const min = minNum / (minDen || 1);
  const sec = secNum / (secDen || 1);
  
  return deg + (min / 60) + (sec / 3600);
};


const PhotoUploadModule = ({ language, detourNodes = [], onPhotosChange }) => {
  const isAr = language === 'ar';
  const [photos, setPhotos] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Report photo documentation status up to the parent form (used by the
  // Step 1 submission-blocking validation gate for the "photo every 25m" rule).
  React.useEffect(() => {
    if (onPhotosChange) {
      const gpsVerified = photos.filter(p => p.gps).length;
      const violations = photos.filter(p => p.distance !== undefined && p.distance > 25).length;
      onPhotosChange({ count: photos.length, gpsVerified, violations });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  const t = {
    title: isAr ? 'رفع صور الموقع الجغرافية' : 'Upload Geotagged Site Photos',
    dragDrop: isAr ? 'اسحب وأفلت الصور هنا' : 'Drag and drop photos here',
    or: isAr ? 'أو' : 'or',
    browseFiles: isAr ? 'تصفح الملفات' : 'Browse Files',
    noGps: isAr ? 'لا توجد بيانات GPS' : 'No GPS data',
    noDate: isAr ? 'لا يوجد طابع زمني' : 'No timestamp',
    distanceToPrev: isAr ? 'المسافة للصورة السابقة:' : 'Distance to prev:',
    summaryTitle: isAr ? 'ملخص الصور' : 'Photos Summary',
    uploaded: isAr ? 'مرفوعة' : 'Uploaded',
    verified: isAr ? 'موثقة GPS' : 'GPS-Verified',
    violations: isAr ? 'مخالفات المسافة' : 'Spacing Violations',
    meters: isAr ? 'متر' : 'm'
  };

  const processFile = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const gpsData = parseExifGPS(buffer);
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        gps: gpsData,
        timestamp: new Date(file.lastModified).toLocaleString(isAr ? 'ar-SA' : 'en-US') // Fallback to file date
      };
    } catch (err) {
      console.error("Error processing file", err);
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        gps: null,
        timestamp: new Date(file.lastModified).toLocaleString(isAr ? 'ar-SA' : 'en-US')
      };
    }
  };

  const handleFiles = async (files) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/jpeg'));
    const processedPhotos = await Promise.all(validFiles.map(processFile));
    
    setPhotos(prev => {
      const newPhotos = [...prev, ...processedPhotos];
      // Calculate distances sequentially
      return newPhotos.map((photo, i) => {
        if (i === 0 || !photo.gps || !newPhotos[i-1].gps) return photo;
        const prevPhoto = newPhotos[i-1];
        const distance = haversineDistance(
          prevPhoto.gps.lat, prevPhoto.gps.lng, 
          photo.gps.lat, photo.gps.lng
        );
        return { ...photo, distance };
      });
    });
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = (id) => {
    setPhotos(prev => {
      const newPhotos = prev.filter(p => p.id !== id);
      // Recalculate distances
      return newPhotos.map((photo, i) => {
        if (i === 0 || !photo.gps || !newPhotos[i-1].gps) {
          const { distance, ...rest } = photo;
          return rest;
        }
        const prevPhoto = newPhotos[i-1];
        const newDistance = haversineDistance(
          prevPhoto.gps.lat, prevPhoto.gps.lng, 
          photo.gps.lat, photo.gps.lng
        );
        return { ...photo, distance: newDistance };
      });
    });
  };

  const gpsVerifiedCount = photos.filter(p => p.gps).length;
  const violationCount = photos.filter(p => p.distance !== undefined && p.distance > 25).length;

  return (
    <div className={`w-full max-w-5xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-6 ${isAr ? 'text-right' : 'text-left'}`} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3 mb-6">
        <ImageIcon className="w-6 h-6 text-brand-primary" />
        <h2 className="text-xl font-bold text-slate-800">{t.title}</h2>
      </div>

      {/* Upload Zone */}
      <div 
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          isDragging ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 font-medium mb-2">{t.dragDrop}</p>
        <p className="text-slate-400 text-sm mb-4">{t.or}</p>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          {t.browseFiles}
        </button>
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          multiple 
          accept="image/jpeg"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-xs text-slate-400 mt-4">JPG/JPEG format only. GPS location must be enabled on camera.</p>
      </div>

      {/* Summary Bar */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-8 bg-slate-50 p-4 rounded-lg border border-slate-100 items-center justify-between">
          <div className="font-bold text-slate-700">{t.summaryTitle}</div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
              <ImageIcon className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold">{photos.length} {t.uploaded}</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">{gpsVerifiedCount} {t.verified}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${violationCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
              <AlertTriangle className={`w-4 h-4 ${violationCount > 0 ? 'text-red-600' : 'text-slate-400'}`} />
              <span className={`text-sm font-semibold ${violationCount > 0 ? 'text-red-700' : 'text-slate-500'}`}>{violationCount} {t.violations}</span>
            </div>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {photos.map((photo, index) => {
          const hasGps = !!photo.gps;
          const distSafe = photo.distance !== undefined ? photo.distance <= 25 : true;

          return (
            <div key={photo.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative">
              <button 
                onClick={() => handleDelete(photo.id)}
                className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-red-100 text-slate-700 hover:text-red-600 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="h-40 bg-slate-100 relative overflow-hidden">
                <img src={photo.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                {!hasGps && (
                  <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center">
                    <div className="bg-white/90 text-red-600 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {t.noGps}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-3 text-sm space-y-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span className="truncate text-xs">{photo.timestamp || t.noDate}</span>
                </div>
                
                {hasGps ? (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 shrink-0 text-brand-primary" />
                    <span className="text-[11px] truncate" dir="ltr">
                      {photo.gps.lat.toFixed(6)}, {photo.gps.lng.toFixed(6)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-xs">{t.noGps}</span>
                  </div>
                )}
                
                {photo.distance !== undefined && (
                  <div className={`flex items-center justify-between pt-2 border-t border-slate-100 ${distSafe ? 'text-emerald-600' : 'text-red-600 font-bold'}`}>
                    <div className="flex items-center gap-1.5 text-xs">
                      {distSafe ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      <span>{t.distanceToPrev}</span>
                    </div>
                    <span className="text-xs bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      {photo.distance.toFixed(1)} {t.meters}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PhotoUploadModule;
