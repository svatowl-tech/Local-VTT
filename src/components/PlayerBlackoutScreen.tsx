import React, { memo, useEffect, useRef, useState } from 'react';
import { PlayerBlackoutState } from '../types';
import { Shield, Sparkles, Compass, Swords, Volume2, VolumeX } from 'lucide-react';
import { getCachedMediaUrl } from '../services/mediaCache';
import { BLACKOUT_VIDEO_PRESETS, extractYouTubeId } from '../services/blackoutVideoPresets';

interface Props {
  blackout?: PlayerBlackoutState;
}

export const PlayerBlackoutScreen: React.FC<Props> = memo(({ blackout }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const title = blackout?.title || 'Мастер подготавливает карту...';
  const subtitle =
    blackout?.subtitle ||
    'Пожалуйста, подождите. Идет расстановка поля битвы и декораций';

  const mode = blackout?.backgroundMode || 'embers';
  const overlayDim = blackout?.overlayDim !== undefined ? blackout.overlayDim : 0.45;
  const blurAmount = blackout?.blurAmount || 0;
  const showEmbers = blackout?.showEmbers !== false;
  const hideCard = !!blackout?.hideCard;
  const soundEnabled = !!blackout?.soundEnabled;

  const [resolvedMediaUrl, setResolvedMediaUrl] = useState<string>('');
  const [loadError, setLoadError] = useState<boolean>(false);

  // Determine media URL to play
  useEffect(() => {
    let mounted = true;
    setLoadError(false);

    if (mode === 'preset_video') {
      const preset = BLACKOUT_VIDEO_PRESETS.find((p) => p.id === blackout?.presetVideoId) || BLACKOUT_VIDEO_PRESETS[0];
      setResolvedMediaUrl(preset.videoUrl);
    } else if (mode === 'video' && blackout?.videoUrl) {
      getCachedMediaUrl('blackout_video', blackout.videoUrl).then((url) => {
        if (mounted) setResolvedMediaUrl(url);
      });
    } else if (mode === 'image' && blackout?.imageUrl) {
      getCachedMediaUrl('blackout_image', blackout.imageUrl).then((url) => {
        if (mounted) setResolvedMediaUrl(url);
      });
    } else {
      setResolvedMediaUrl('');
    }

    return () => {
      mounted = false;
    };
  }, [mode, blackout?.presetVideoId, blackout?.videoUrl, blackout?.imageUrl]);

  // Adjust volume / muted state on active video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = !soundEnabled;
      if (soundEnabled) {
        videoRef.current.volume = 0.7;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [soundEnabled, resolvedMediaUrl]);

  // Ambient floating gold/amber ember particles animation on canvas
  useEffect(() => {
    if (!showEmbers) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth || 800);
    let height = (canvas.height = window.innerHeight || 600);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth || 800;
      height = canvas.height = window.innerHeight || 600;
    };

    window.addEventListener('resize', handleResize);

    // Particle pool
    const particleCount = mode === 'embers' ? 40 : 25;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * (width || 800),
      y: Math.random() * (height || 600),
      size: Math.random() * 2.5 + 1,
      speedY: Math.random() * 0.4 + 0.15,
      speedX: (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.7 + 0.2,
      pulse: Math.random() * Math.PI * 2,
      color: Math.random() > 0.3 ? '#f59e0b' : '#fbbf24', // amber/gold
    }));

    let lastTime = performance.now();
    let accumTime = 0;

    const render = (time: number) => {
      try {
        const dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;
        accumTime += dt;

        // Cap updates to ~30 FPS (0.033s interval) for high performance on older laptops
        if (accumTime >= 0.033) {
          accumTime = 0;

          ctx.clearRect(0, 0, width, height);

          // Draw embers without costly shadowBlur software filters
          for (const p of particles) {
            p.y -= p.speedY * 1.3;
            p.x += p.speedX * 1.0;
            p.pulse += 0.06;

            if (p.y < -10) {
              p.y = height + 10;
              p.x = Math.random() * width;
            }
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;

            const currentOpacity = Math.max(0, Math.min(1, p.opacity * (0.6 + 0.4 * Math.sin(p.pulse))));

            // Two-pass draw for glowing effect without expensive shadowBlur
            ctx.fillStyle = p.color;
            ctx.globalAlpha = currentOpacity * 0.35;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = currentOpacity;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        animId = requestAnimationFrame(render);
      } catch (err) {
        // Prevent uncaught errors
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [showEmbers, mode]);

  // YouTube embed ID check
  const ytId = mode === 'youtube' && blackout?.youtubeUrl ? extractYouTubeId(blackout.youtubeUrl) : null;

  return (
    <div className="absolute inset-0 z-[2147483647] flex flex-col items-center justify-center bg-zinc-950 overflow-hidden select-none animate-fadeIn transition-opacity duration-700">
      {/* ----------------- BACKGROUND MEDIA LAYER ----------------- */}
      <div
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none transform-gpu"
        style={{
          filter: blurAmount > 0 ? `blur(${blurAmount}px)` : 'none',
          transform: blurAmount > 0 ? 'scale(1.05)' : 'none', // prevent blurred edges
        }}
      >
        {/* 1. YouTube Live Video Embed */}
        {mode === 'youtube' && ytId && (
          <div className="relative w-full h-full pointer-events-none overflow-hidden scale-110">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=${
                soundEnabled ? '0' : '1'
              }&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`}
              title="Blackout Background Video"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vh] min-w-[177.77vh] min-h-[56.25vw] pointer-events-none border-none"
              allow="autoplay; encrypted-media"
            />
          </div>
        )}

        {/* 2. Direct Video / Preset Video */}
        {(mode === 'preset_video' || mode === 'video') && Boolean(resolvedMediaUrl && resolvedMediaUrl.trim()) && !loadError && (
          <video
            ref={videoRef}
            key={resolvedMediaUrl}
            src={resolvedMediaUrl || undefined}
            autoPlay
            loop
            muted={!soundEnabled}
            playsInline
            preload="auto"
            onError={() => setLoadError(true)}
            className="w-full h-full object-cover pointer-events-none"
          />
        )}

        {/* 3. Custom Image / GIF */}
        {mode === 'image' && Boolean(resolvedMediaUrl && resolvedMediaUrl.trim()) && !loadError && (
          <img
            key={resolvedMediaUrl}
            src={resolvedMediaUrl || undefined}
            alt=""
            onError={() => setLoadError(true)}
            className="w-full h-full object-cover pointer-events-none"
          />
        )}
      </div>

      {/* ----------------- ATMOSPHERIC DARKENING & VIGNETTE ----------------- */}
      <div
        className="absolute inset-0 z-1 pointer-events-none transition-opacity duration-300"
        style={{
          backgroundColor: `rgba(0, 0, 0, ${overlayDim})`,
        }}
      />
      <div className="absolute inset-0 z-1 bg-radial-vignette pointer-events-none opacity-80" />
      <div className="absolute inset-0 z-1 bg-gradient-to-t from-black via-transparent to-black/80 pointer-events-none" />

      {/* ----------------- DYNAMIC EMBER CANVAS ----------------- */}
      {showEmbers && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-2"
        />
      )}

      {/* ----------------- FOREGROUND CARD OR MINIMALIST TAG ----------------- */}
      {!hideCard ? (
        <div className="relative z-10 max-w-2xl mx-4 p-8 md:p-12 rounded-3xl bg-zinc-950/70 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-black/80 text-center flex flex-col items-center space-y-6 transform-gpu animate-in fade-in zoom-in-95 duration-500">
          {/* Arcane Rune Ring & Animated D20/Hourglass Emblem */}
          <div className="relative flex items-center justify-center">
            {/* Outer rotating glowing rune ring */}
            <div className="w-28 h-28 rounded-full border border-dashed border-amber-500/30 animate-[spin_30s_linear_infinite] flex items-center justify-center" />

            {/* Inner pulsating glow */}
            <div className="absolute w-20 h-20 rounded-full bg-amber-500/10 blur-xl animate-pulse" />

            {/* Central Animated Badge */}
            <div className="absolute w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-zinc-900 border border-amber-400/40 flex items-center justify-center shadow-lg shadow-amber-500/10 transform hover:scale-105 transition-transform">
              <Swords className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
          </div>

          {/* Status Pill Badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono uppercase tracking-widest text-amber-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>ПОДГОТОВКА СЦЕНЫ</span>
          </div>

          {/* Main Title */}
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-amber-400 tracking-wide drop-shadow-md">
              {title}
            </h1>

            {/* Ornamental Divider */}
            <div className="flex items-center justify-center space-x-3 text-amber-500/40 text-xs">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500/40" />
              <span>✦ ⚔ ✦</span>
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/40" />
            </div>

            {/* Subtitle / Hints */}
            <p className="text-sm md:text-base text-zinc-300/90 font-light max-w-lg leading-relaxed font-sans">
              {subtitle}
            </p>
          </div>

          {/* Ambient tips box for players */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4 border-t border-zinc-800/80 text-left">
            <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60 flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="text-[11px]">
                <span className="font-semibold text-zinc-200 block">Заклинания</span>
                <span className="text-zinc-400">Проверьте ячейки и свитки</span>
              </div>
            </div>

            <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60 flex items-start space-x-2.5">
              <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div className="text-[11px]">
                <span className="font-semibold text-zinc-200 block">Инвентарь</span>
                <span className="text-zinc-400">Подготовьте зелья и оружие</span>
              </div>
            </div>

            <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60 flex items-start space-x-2.5">
              <Compass className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div className="text-[11px]">
                <span className="font-semibold text-zinc-200 block">Инициатива</span>
                <span className="text-zinc-400">Держите d20 наготове</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Minimalist unobtrusive ambient pill if text card is hidden */
        <div className="absolute top-6 left-6 z-10 flex items-center space-x-2 px-3 py-1.5 rounded-full bg-zinc-950/75 border border-zinc-800/80 backdrop-blur-md text-[11px] font-mono text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="font-medium text-amber-300">ПОДГОТОВКА СЦЕНЫ</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400 truncate max-w-xs">{title}</span>
        </div>
      )}

      {/* Subtle Bottom watermark */}
      <div className="absolute bottom-6 text-center text-[11px] font-mono text-zinc-500/80 tracking-wider z-10 flex items-center space-x-2">
        <span>AETHERMAP TABLETOP VTT • BATTLEMAP PROJECTION</span>
        {soundEnabled && (
          <span className="inline-flex items-center space-x-1 text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 text-[10px]">
            <Volume2 className="w-3 h-3" />
            <span>АУДИО</span>
          </span>
        )}
      </div>
    </div>
  );
});
