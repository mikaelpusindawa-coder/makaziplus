import React, { useState, useRef } from 'react';
import api from '../utils/api';

export default function PropertyVideoSection({ propertyId, videoUrl: initialUrl, isOwner }) {
  const [videoUrl, setVideoUrl] = useState(initialUrl || null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    if (file.size > 200 * 1024 * 1024) {
      setError('Video ni kubwa sana. Ukomo ni MB 200.');
      return;
    }
    const formData = new FormData();
    formData.append('video', file);
    setUploading(true);
    setProgress(0);
    try {
      const res = await api.post(`/properties/${propertyId}/video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => setProgress(Math.round((ev.loaded * 100) / ev.total)),
      });
      setVideoUrl(res.data.data.video_url);
    } catch (err) {
      setError(err.response?.data?.message || 'Hitilafu wakati wa kupakia video.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Uhakika unataka kufuta video hii?')) return;
    setUploading(true);
    try {
      await api.delete(`/properties/${propertyId}/video`);
      setVideoUrl(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Hitilafu wakati wa kufuta video.');
    } finally {
      setUploading(false);
    }
  };

  if (!videoUrl && !isOwner) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-ink">🎬 Video ya Mali</h2>
        {isOwner && (
          <div className="flex gap-2">
            {videoUrl && (
              <button onClick={handleDelete} disabled={uploading} className="text-xs text-red-600 font-semibold px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100">
                {uploading ? 'Inafuta...' : '🗑 Futa'}
              </button>
            )}
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-xs text-primary font-semibold px-3 py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100">
              {uploading ? `Inapakia... ${progress}%` : videoUrl ? '🔄 Badilisha' : '📤 Pakia Video'}
            </button>
            <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={handleFileChange} className="hidden" />
          </div>
        )}
      </div>
      {error && <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-600 mb-3">⚠️ {error}</div>}
      {uploading && (
        <div className="mb-3">
          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden"><div className="h-full bg-primary transition-all duration-200 rounded-full" style={{ width: `${progress}%` }} /></div>
          <p className="text-xs text-ink-5 mt-1 text-center">{progress}% imepakiwa</p>
        </div>
      )}
      {videoUrl && (
        <div className="bg-black rounded-2xl overflow-hidden">
          {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
            <iframe src={videoUrl.includes('youtube.com') ? videoUrl.replace('watch?v=', 'embed/') : `https://www.youtube.com/embed/${videoUrl.split('/').pop()}`} title="Property Video" className="w-full h-64 md:h-96" frameBorder="0" allowFullScreen />
          ) : (
            <video src={videoUrl} controls className="w-full h-64 md:h-96 object-contain" />
          )}
        </div>
      )}
    </div>
  );
}