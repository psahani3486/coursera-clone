import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export default function VideoPlayer({ src, isLive }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // If not live, prefer HLS playback
    if (Hls.isSupported() && !isLive) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src;
    } else {
      // WebRTC live placeholder
      // In a real app, you’d set up a WebRTC PeerConnection here
      console.warn('WebRTC live streaming would initialize here in a full implementation.');
    }
  }, [src, isLive]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <video ref={videoRef} controls className="w-full bg-black" />
    </div>
  );
}