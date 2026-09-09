// Adapted from the live JDC résumé; keep its verified playback and gallery edits.
import projects from './resume-projects.json';
export function mountResume(root) {
    const list = root.querySelector("#projectList");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hiddenRoutes = new Set([
      "/working-project-37",
      "/working-project-40",
      "/tobias-rees-limn",
      "/maybelline-gigi-whip-it-up",
    ]);
    const selectedRoutes = new Set([
      ...projects.filter(project => !hiddenRoutes.has(project.route)).slice(0,10).map(project => project.route),
      "/celeste-everyday",
      "/spotify-hip-hop-classics-1",
      "/ggm-accoustic",
      "/lovb-launch",
    ]);
    let mediaObserver;
    let currentFilter = "all";
    let globalSoundEnabled = false;
    const escapeHTML = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
    const renderProjectTitle = value => escapeHTML(value).replace(/ ([–—]) /g, " $1<br>");
    const hasRecognition = project => project.fields.some(field => /award|festival|recognition/i.test(field.label));
    const hasPress = project => project.fields.length > 0;
    const isJos = name => /\bjos(?:e|é)?\s+diaz\s+contreras\b/i.test(String(name || ""));
    const hasJosRole = (project, roleTest) => project.credits.some(([role, name]) => isJos(name) && roleTest(String(role || "")));
    // The Creative Director navigation includes Creative Director, Art Director,
    // Graphics Director, and combined Art & Animation Director credits. These
    // overrides change only portfolio classification; detailed credits stay put.
    const creativeRoleOverrides = new Set([
      "/working-project-38",
      "/mtv-vote-early",
      "/laufey-tour-visuals",
      "/diamond-terrifier-action-fortress",
      "/spotify-hip-hop-classics-1",
      "/polymarket-make-your-own-market",
      "/basis",
      "/working-project-44",
      "/maybelline-loaded-bolds",
    ]);
    const hasDirectorRole = project => !creativeRoleOverrides.has(project.route) &&
      hasJosRole(project, role => role.trim().toLowerCase() === "director");
    const hasProducerRole = project => hasJosRole(project, role => /producer/i.test(role));
    const hasEditorRole = project => hasJosRole(project, role => /editor|editing/i.test(role));
    const hasCreativeRole = project => creativeRoleOverrides.has(project.route) ||
      hasJosRole(project, role =>
        /(?:creative|art|graphics).*director|director.*(?:creative|art|graphics)/i.test(role)
      );
    const HLS_JS_URL = "https://cdn.jsdelivr.net/npm/hls.js@1.7.1/dist/hls.min.js";
    const hlsPlayers = new Map();
    const highSourceCache = new Map();
    const seamlessLoopStates = new WeakMap();
    const galleryVideoQuartiles = new WeakMap();
    const logicalVideoSegmentCompletions = new Map();
    const galleryVolumeFades = new WeakMap();
    const GALLERY_SOUND_VOLUME = .7;
    const GALLERY_SOUND_FADE_IN_MS = 180;
    const GALLERY_SOUND_FADE_OUT_MS = 160;
    let desiredGallerySoundVideo = null;
    let activeGallerySoundVideo = null;
    let gallerySoundTransitionRunning = false;
    let galleryAudioUnlocked = false;
    let preferredLeadSoundVideo = null;
    const galleryVideoRoutes = new Set([
      "/lovb-adidas",
      "/bombas-spring",
      "/alignment-documentary",
      "/kings-of-tupelo",
      "/laufey-tour-visuals",
      "/nike-aja-sabrina",
      "/siberia-hills",
      "/spotify-hip-hop-classics-1",
      "/ggm-accoustic",
      "/basis",
    ]);
    const GALLERY_MEDIA_REVISION = "20260830-tupelo-laufey-audio-1";
    const mediaEventLog = window.jdcMediaEvents = window.jdcMediaEvents || [];
    let hlsPromise;
    function revisedMediaUrl(value) {
      const source = String(value || "");
      if (!source) return source;
      return `${source}${source.includes("?") ? "&" : "?"}mediaRevision=${GALLERY_MEDIA_REVISION}`;
    }
    function galleryItemStem(item) {
      return String(item.src || "")
        .split("?")[0]
        .split("/").pop()
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
    }
    function galleryVideoIdentity(project, item) {
      if (item.type !== "video") return null;
      const stem = galleryItemStem(item);
      const bombasSegment = project.route === "/bombas-dream-of-comfort"
        ? /bombas-bts-0?([1-3])/.exec(stem)
        : null;
      if (bombasSegment) {
        return {
          id:"bombas-dream-bts",
          presentation:"split-segment",
          segmentIndex:Number(bombasSegment[1]),
          segmentCount:3,
        };
      }
      if (!galleryVideoRoutes.has(project.route)) return null;
      return {
        id:String(item.systemDataId || item.sourceSystemDataId || `${project.route.slice(1)}-${stem}`),
        presentation:"standalone",
        segmentIndex:1,
        segmentCount:1,
      };
    }
    function galleryMediaId(project, item) {
      return String(item.systemDataId || `${project.route.slice(1)}-${galleryItemStem(item)}`);
    }
    function trackGalleryMedia(eventName, video, extra = {}) {
      const frame = video.closest(".gallery-frame");
      if (!frame) return;
      const mediaKind = frame.dataset.mediaKind || "clip";
      const detail = {
        eventName,
        mediaKind,
        mediaId:frame.dataset.mediaId || null,
        videoId:mediaKind === "video" ? frame.dataset.mediaId || null : null,
        presentation:frame.dataset.presentation || "loop",
        segmentIndex:Number(frame.dataset.segmentIndex || 1),
        segmentCount:Number(frame.dataset.segmentCount || 1),
        projectRoute:frame.dataset.projectRoute || null,
        projectTitle:frame.dataset.projectTitle || null,
        source:String(video.dataset.src || "").split("?")[0],
        currentTime:Number.isFinite(video.currentTime) ? Number(video.currentTime.toFixed(3)) : 0,
        duration:Number.isFinite(video.duration) ? Number(video.duration.toFixed(3)) : null,
        ...extra,
      };
      mediaEventLog.push(detail);
      if (mediaEventLog.length > 500) mediaEventLog.shift();
      window.dispatchEvent(new CustomEvent("jdc:media-track", { detail }));
      if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push({ event:`jdc_${eventName}`, ...detail });
      }
    }
    function ensureHlsLibrary() {
      if (window.Hls) return Promise.resolve(window.Hls);
      if (hlsPromise) return hlsPromise;
      hlsPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = HLS_JS_URL;
        script.async = true;
        script.onload = () => window.Hls ? resolve(window.Hls) : reject(new Error("hls.js did not initialize"));
        script.onerror = () => reject(new Error("hls.js failed to load"));
        document.head.appendChild(script);
      });
      return hlsPromise;
    }
    function absoluteMediaUrl(value, baseUrl) {
      try { return new URL(String(value || ""), baseUrl).href; }
      catch (error) { return ""; }
    }
    function highestRendition(masterText, masterUrl) {
      const lines = String(masterText || "").split(/\r?\n/);
      const renditions = [];
      lines.forEach((line, index) => {
        if (!line.startsWith("#EXT-X-STREAM-INF:")) return;
        const resolution = /RESOLUTION=(\d+)x(\d+)/i.exec(line);
        const bandwidth = /(?:AVERAGE-)?BANDWIDTH=(\d+)/i.exec(line);
        let mediaLine = "";
        for (let next = index + 1; next < lines.length; next += 1) {
          if (!lines[next] || lines[next].startsWith("#")) continue;
          mediaLine = lines[next];
          break;
        }
        const url = absoluteMediaUrl(mediaLine, masterUrl);
        if (!url) return;
        renditions.push({
          url,
          width:resolution ? Number(resolution[1]) : 0,
          height:resolution ? Number(resolution[2]) : 0,
          bandwidth:bandwidth ? Number(bandwidth[1]) : 0,
        });
      });
      renditions.sort((a, b) => b.width * b.height - a.width * a.height || b.bandwidth - a.bandwidth);
      if (renditions.length) return renditions[0];
      return { url:masterUrl, width:0, height:0, bandwidth:0 };
    }
    function resolveHighestHlsSource(masterUrl) {
      if (!/\.m3u8(?:$|\?)/i.test(masterUrl)) return Promise.resolve({ url:masterUrl, width:0, height:0 });
      if (highSourceCache.has(masterUrl)) return highSourceCache.get(masterUrl);
      const request = fetch(masterUrl, { mode:"cors", credentials:"omit", cache:"force-cache" })
        .then(response => {
          if (!response.ok) throw new Error(`Master playlist returned ${response.status}`);
          return response.text();
        })
        .then(text => highestRendition(text, masterUrl))
        .catch(error => {
          highSourceCache.delete(masterUrl);
          throw error;
        });
      highSourceCache.set(masterUrl, request);
      return request;
    }
    function ensureLoopBackdrop(video) {
      const shell = video.parentElement;
      if (!shell || shell.querySelector(".loop-backdrop")) return;
      const capture = () => {
        if (!video.videoWidth || !video.videoHeight || shell.querySelector(".loop-backdrop")) return;
        try {
          const width = Math.min(640, video.videoWidth);
          const height = Math.max(1, Math.round(width * video.videoHeight / video.videoWidth));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d", { alpha:false });
          if (!context) return;
          context.drawImage(video, 0, 0, width, height);
          const backdrop = document.createElement("img");
          backdrop.className = "loop-backdrop";
          backdrop.alt = "";
          backdrop.setAttribute("aria-hidden", "true");
          backdrop.draggable = false;
          backdrop.src = canvas.toDataURL("image/jpeg", .78);
          shell.prepend(backdrop);
        } catch (error) {}
      };
      if (video.readyState >= 2) capture();
      else video.addEventListener("loadeddata", capture, { once:true });
    }
    function suspendSeamlessLoop(video) {
      const state = seamlessLoopStates.get(video);
      if (!state) return;
      if (state.timer) clearTimeout(state.timer);
      state.timer = null;
      state.restarting = false;
      video.classList.remove("is-loop-resetting");
    }
    function prepareSeamlessLoop(video) {
      const existingState = seamlessLoopStates.get(video);
      if (existingState) {
        existingState.resetToLoopStart?.();
        return;
      }
      ensureLoopBackdrop(video);
      const state = { timer:null, restarting:false, wraps:0 };
      seamlessLoopStates.set(video, state);
      const configuredLoopStart = Number(video.dataset.loopStart || 0);
      const hasCustomLoopStart = Number.isFinite(configuredLoopStart) && configuredLoopStart > 0;
      const loopStart = () => {
        const maximum = Number.isFinite(video.duration) ? Math.max(.001, video.duration - .05) : configuredLoopStart;
        return hasCustomLoopStart ? Math.min(configuredLoopStart, maximum) : .001;
      };
      const applyInitialLoopStart = () => {
        if (!hasCustomLoopStart || video.dataset.loopStartApplied === "true") return;
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        const target = loopStart();
        video.dataset.loopStartApplied = "true";
        video.classList.add("is-loop-resetting");
        const revealInitialFrame = () => requestAnimationFrame(() => video.classList.remove("is-loop-resetting"));
        if (Math.abs(video.currentTime - target) < .025) {
          revealInitialFrame();
          return;
        }
        video.addEventListener("seeked", revealInitialFrame, { once:true });
        try { video.currentTime = target; }
        catch (error) { video.classList.remove("is-loop-resetting"); }
      };
      state.resetToLoopStart = () => {
        if (!hasCustomLoopStart) return;
        video.dataset.loopStartApplied = "false";
        applyInitialLoopStart();
      };
      const loopEnabled = () => !(
        video.classList.contains("project-loop") &&
        video.closest(".project-media")?.classList.contains("player-active")
      );
      const clearTimer = () => {
        if (state.timer) clearTimeout(state.timer);
        state.timer = null;
      };
      const reveal = () => {
        state.restarting = false;
        state.wraps += 1;
        video.dataset.loopWraps = String(state.wraps);
        video.classList.remove("is-loop-resetting");
        video.dispatchEvent(new CustomEvent("jdc-loop-wrap", {
          detail:{ wraps:state.wraps },
        }));
        schedule();
      };
      const revealAfterFrame = () => {
        if (typeof video.requestVideoFrameCallback === "function" && !video.paused) {
          video.requestVideoFrameCallback(() => requestAnimationFrame(reveal));
        } else {
          requestAnimationFrame(() => requestAnimationFrame(reveal));
        }
      };
      const restart = () => {
        clearTimer();
        if (!loopEnabled() || state.restarting || video.dataset.inView !== "true" || reduceMotion.matches) return;
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        state.restarting = true;
        video.classList.add("is-loop-resetting");
        const afterSeek = () => {
          if (video.dataset.inView !== "true" || reduceMotion.matches) {
            reveal();
            return;
          }
          video.play().catch(() => {});
          revealAfterFrame();
        };
        video.addEventListener("seeked", afterSeek, { once:true });
        try { video.currentTime = loopStart(); }
        catch (error) { reveal(); }
      };
      const schedule = () => {
        clearTimer();
        if (!loopEnabled() || state.restarting || video.paused || video.dataset.inView !== "true") return;
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        const lead = Math.min(.08, Math.max(.04, video.duration * .006));
        const remaining = Math.max(0, video.duration - video.currentTime - lead);
        const rate = Math.max(.1, Math.abs(video.playbackRate || 1));
        state.timer = setTimeout(restart, remaining / rate * 1000);
      };
      video.addEventListener("loadeddata", () => { ensureLoopBackdrop(video); schedule(); });
      video.addEventListener("playing", () => { video.classList.add("is-ready"); schedule(); });
      video.addEventListener("seeked", schedule);
      video.addEventListener("ratechange", schedule);
      video.addEventListener("waiting", clearTimer);
      video.addEventListener("pause", clearTimer);
      video.addEventListener("timeupdate", () => {
        if (!loopEnabled() || state.restarting || video.paused || !Number.isFinite(video.duration)) return;
        const lead = Math.min(.08, Math.max(.04, video.duration * .006));
        if (video.duration - video.currentTime <= lead) restart();
      });
      video.addEventListener("ended", restart);
      if (hasCustomLoopStart) {
        video.classList.add("is-loop-resetting");
        if (video.readyState >= 1) applyInitialLoopStart();
        else video.addEventListener("loadedmetadata", applyInitialLoopStart, { once:true });
      }
      video.loop = false;
    }
    function destroyVideoSource(video) {
      const existing = hlsPlayers.get(video);
      if (existing) existing.destroy();
      hlsPlayers.delete(video);
      video.removeAttribute("src");
      video.querySelectorAll("source").forEach(source => source.remove());
      video.load();
    }
    function loadVideo(video, requestedSource = video.dataset.src) {
      const source = String(requestedSource || "");
      if (!source) return Promise.reject(new Error("Video source is missing"));
      if (video.dataset.loadedSource === source) return Promise.resolve(video);
      destroyVideoSource(video);
      video.dataset.loadedSource = source;
      if (!/\.m3u8(?:$|\?)/i.test(source)) {
        const sourceElement = document.createElement("source");
        sourceElement.src = source;
        sourceElement.type = "video/mp4";
        video.appendChild(sourceElement);
        video.load();
        return Promise.resolve(video);
      }
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = source;
        video.load();
        return Promise.resolve(video);
      }
      return ensureHlsLibrary().then(Hls => new Promise((resolve, reject) => {
        if (!Hls.isSupported()) throw new Error("HLS playback is not supported in this browser");
        const hls = new Hls({
          startLevel:0,
          capLevelToPlayerSize:false,
          capLevelOnFPSDrop:false,
          startFragPrefetch:true,
          maxBufferLength:30,
          maxMaxBufferLength:60,
          backBufferLength:0,
        });
        hlsPlayers.set(video, hls);
        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(source));
        hls.on(Hls.Events.MANIFEST_PARSED, () => resolve(video));
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          hls.destroy();
          hlsPlayers.delete(video);
          reject(new Error("High-resolution playback failed"));
        });
      }));
    }
    function seekToPlaybackStart(video) {
      const requested = Number(video.dataset.playbackStart || 0);
      if (!Number.isFinite(requested) || requested <= 0) return Promise.resolve(video);
      return new Promise(resolve => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve(video);
        };
        const apply = () => {
          if (!Number.isFinite(video.duration) || video.duration <= requested) {
            finish();
            return;
          }
          const target = Math.min(requested, Math.max(0, video.duration - .05));
          video.addEventListener("seeked", finish, { once:true });
          try { video.currentTime = target; }
          catch (error) { finish(); }
          window.setTimeout(finish, 2500);
        };
        if (video.readyState >= 1) apply();
        else {
          video.addEventListener("loadedmetadata", apply, { once:true });
          window.setTimeout(finish, 2500);
        }
      });
    }
    function formatTime(value) {
      const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2,"0")}`;
    }
    function autoplayEmbedUrl(source, soundEnabled = globalSoundEnabled) {
      try {
        const url = new URL(source, "https://jdc4444.github.io/jdc_resume/");
        url.searchParams.set("autoplay", "1");
        url.searchParams.set("playsinline", "1");
        if (/player\.vimeo\.com$/i.test(url.hostname)) {
          url.searchParams.set("title", "0");
          url.searchParams.set("byline", "0");
          url.searchParams.set("portrait", "0");
          url.searchParams.set("muted", soundEnabled ? "0" : "1");
        } else if (/youtube(?:-nocookie)?\.com$/i.test(url.hostname)) {
          url.searchParams.set("mute", soundEnabled ? "0" : "1");
        }
        return url.href;
      } catch (error) { return source; }
    }
    function cancelGalleryVolumeFade(video) {
      const fade = galleryVolumeFades.get(video);
      if (fade) fade.cancel();
    }
    function fadeGalleryVolume(video, targetVolume, duration) {
      cancelGalleryVolumeFade(video);
      const startVolume = video.volume;
      if (Math.abs(startVolume - targetVolume) < .001 || duration <= 0) {
        video.volume = targetVolume;
        return Promise.resolve();
      }
      return new Promise(resolve => {
        const startTime = performance.now();
        let settled = false;
        let animationFrame = 0;
        const finish = () => {
          if (settled) return;
          settled = true;
          cancelAnimationFrame(animationFrame);
          if (galleryVolumeFades.get(video)?.cancel === cancel) {
            galleryVolumeFades.delete(video);
          }
          resolve();
        };
        const cancel = () => finish();
        const step = now => {
          const progress = Math.max(0, Math.min(1, (now - startTime) / duration));
          const eased = targetVolume > startVolume
            ? 1 - Math.pow(1 - progress, 3)
            : progress * progress * (3 - 2 * progress);
          video.volume = startVolume + (targetVolume - startVolume) * eased;
          if (progress >= 1) {
            video.volume = targetVolume;
            finish();
          } else {
            animationFrame = requestAnimationFrame(step);
          }
        };
        galleryVolumeFades.set(video, { cancel, targetVolume });
        animationFrame = requestAnimationFrame(step);
      });
    }
    function resetGallerySoundVideo(video) {
      cancelGalleryVolumeFade(video);
      if (desiredGallerySoundVideo === video) desiredGallerySoundVideo = null;
      if (activeGallerySoundVideo === video) activeGallerySoundVideo = null;
      video.muted = true;
      video.volume = GALLERY_SOUND_VOLUME;
      video.closest(".gallery-sound-frame")?.classList.remove("gallery-sound-active");
    }
    function muteOtherAudibleMedia(activeVideo) {
      root.querySelectorAll(".gallery-video, .project-loop").forEach(other => {
        if (other === activeVideo) return;
        if (other.classList.contains("gallery-video")) resetGallerySoundVideo(other);
        else other.muted = true;
      });
    }
    function preferredActiveLead() {
      if (
        preferredLeadSoundVideo?.isConnected &&
        preferredLeadSoundVideo.closest(".project-media")?.classList.contains("player-active")
      ) return preferredLeadSoundVideo;
      return root.querySelector(
        ".project-media.player-active:not(.player-embed) .project-loop"
      );
    }
    function setLeadSound(video, enabled) {
      video.dataset.localSoundEnabled = String(Boolean(enabled));
      if (!enabled) {
        video.muted = true;
        return;
      }
      preferredLeadSoundVideo = video;
      desiredGallerySoundVideo = null;
      root.querySelectorAll(".gallery-video").forEach(resetGallerySoundVideo);
      muteOtherAudibleMedia(video);
      video.muted = false;
      if (video.volume === 0) video.volume = GALLERY_SOUND_VOLUME;
      reconcileGallerySound();
    }
    async function reconcileGallerySound() {
      if (gallerySoundTransitionRunning) return;
      gallerySoundTransitionRunning = true;
      try {
        while (true) {
          const target = globalSoundEnabled ? desiredGallerySoundVideo : null;
          if (activeGallerySoundVideo && activeGallerySoundVideo !== target) {
            const outgoing = activeGallerySoundVideo;
            await fadeGalleryVolume(outgoing, 0, GALLERY_SOUND_FADE_OUT_MS);
            if (activeGallerySoundVideo === outgoing) activeGallerySoundVideo = null;
            outgoing.muted = true;
            outgoing.volume = GALLERY_SOUND_VOLUME;
            outgoing.closest(".gallery-sound-frame")?.classList.remove("gallery-sound-active");
            continue;
          }
          if (!target) break;
          // Safari pauses an autoplaying video when script unmutes it before
          // the document has received a user gesture. Preserve the moving,
          // muted loop on first hover; a click anywhere unlocks hover audio
          // for the remainder of the page session.
          if (!galleryAudioUnlocked) {
            target.muted = true;
            target.volume = GALLERY_SOUND_VOLUME;
            target.closest(".gallery-sound-frame")?.classList.remove("gallery-sound-active");
            if (target.paused) {
              await loadVideo(target)
                .then(() => {
                  target.muted = true;
                  return target.play();
                })
                .catch(() => {
                  target.closest(".gallery-sound-frame")?.setAttribute("data-player-state", "unavailable");
                });
            }
            break;
          }
          if (activeGallerySoundVideo !== target) {
            root.querySelectorAll(".project-loop").forEach(video => { video.muted = true; });
            setEmbedSound(false);
            activeGallerySoundVideo = target;
            target.volume = 0;
            target.muted = false;
            target.closest(".gallery-sound-frame")?.classList.add("gallery-sound-active");
            let soundPlaybackStarted = true;
            await loadVideo(target).then(() => target.play()).catch(() => {
              soundPlaybackStarted = false;
              galleryAudioUnlocked = false;
              if (activeGallerySoundVideo === target) activeGallerySoundVideo = null;
              target.muted = true;
              target.volume = GALLERY_SOUND_VOLUME;
              target.closest(".gallery-sound-frame")?.classList.remove("gallery-sound-active");
              target.closest(".gallery-sound-frame")?.setAttribute("data-player-state", "sound-locked");
              target.play().catch(() => {});
            });
            if (!soundPlaybackStarted) break;
            target.closest(".gallery-sound-frame")?.removeAttribute("data-player-state");
            await fadeGalleryVolume(target, GALLERY_SOUND_VOLUME, GALLERY_SOUND_FADE_IN_MS);
            if (desiredGallerySoundVideo !== target) continue;
          }
          break;
        }
      } finally {
        gallerySoundTransitionRunning = false;
        if (
          desiredGallerySoundVideo !== activeGallerySoundVideo &&
          (galleryAudioUnlocked || desiredGallerySoundVideo === null)
        ) {
          queueMicrotask(reconcileGallerySound);
        }
      }
    }
    function requestGallerySound(video, enabled) {
      if (enabled && !globalSoundEnabled) return false;
      if (enabled) desiredGallerySoundVideo = video;
      else if (desiredGallerySoundVideo === video) desiredGallerySoundVideo = null;
      if (activeGallerySoundVideo && activeGallerySoundVideo !== desiredGallerySoundVideo) {
        const activeFade = galleryVolumeFades.get(activeGallerySoundVideo);
        if (!activeFade || activeFade.targetVolume > 0) {
          cancelGalleryVolumeFade(activeGallerySoundVideo);
        }
      }
      reconcileGallerySound();
      return enabled ? desiredGallerySoundVideo === video : true;
    }
    function unlockGalleryAudioFromGesture() {
      if (galleryAudioUnlocked) return;
      galleryAudioUnlocked = true;
      if (desiredGallerySoundVideo) reconcileGallerySound();
    }
    root.addEventListener("click", unlockGalleryAudioFromGesture, { capture:true });
    function setEmbedSound(enabled) {
      root.querySelectorAll(".project-player-embed").forEach(iframe => {
        const source = String(iframe.src || "");
        if (/player\.vimeo\.com/i.test(source)) {
          iframe.contentWindow?.postMessage(
            { method:"setVolume", value:enabled ? GALLERY_SOUND_VOLUME : 0 },
            "*"
          );
        } else if (/youtube(?:-nocookie)?\.com/i.test(source)) {
          iframe.contentWindow?.postMessage(
            JSON.stringify({
              event:"command",
              func:enabled ? "unMute" : "mute",
              args:[],
            }),
            "*"
          );
        }
      });
    }
    function setGlobalSound(enabled) {
      globalSoundEnabled = Boolean(enabled);
      if (!globalSoundEnabled) {
        desiredGallerySoundVideo = null;
        root.querySelectorAll(".gallery-video").forEach(resetGallerySoundVideo);
        root.querySelectorAll(".project-loop").forEach(video => {
          video.muted = true;
        });
        reconcileGallerySound();
      } else {
        unlockGalleryAudioFromGesture();
        const hoveredGalleryVideo = root.querySelector(
          ".gallery-sound-frame:hover .gallery-video"
        );
        const activeLead = preferredActiveLead();
        if (hoveredGalleryVideo) {
          requestGallerySound(hoveredGalleryVideo, true);
        } else if (activeLead) {
          setLeadSound(activeLead, true);
        }
      }
      setEmbedSound(globalSoundEnabled);
    }
    function bindLeadPlayers() {
      root.querySelectorAll(".project-media").forEach(shell => {
        const video = shell.querySelector(".project-loop");
        const trigger = shell.querySelector(".media-play-trigger");
        const controls = shell.querySelector(".jdc-video-controls");
        const playButton = controls?.querySelector("[data-jdc-play]");
        const muteButton = controls?.querySelector("[data-jdc-mute]");
        const progress = controls?.querySelector(".jdc-video-progress");
        const progressFill = progress?.querySelector("span");
        if (!video || !trigger || !controls || !playButton || !muteButton || !progress || !progressFill) return;
        const updateControls = () => {
          playButton.textContent = video.paused ? "Play" : "Pause";
          muteButton.textContent = video.muted ? "Sound" : "Mute";
          const percent = video.duration ? video.currentTime / video.duration * 100 : 0;
          progressFill.style.width = `${percent}%`;
          progress.setAttribute("aria-valuenow", String(Math.round(percent)));
          progress.setAttribute("aria-valuetext", `${formatTime(video.currentTime)} of ${formatTime(video.duration)}`);
        };
        const playWithSound = async () => {
          video.dataset.userPaused = "false";
          setLeadSound(video, true);
          await video.play().catch(() => {});
          updateControls();
        };
        const toggleFromVideoSurface = async () => {
          if (video.paused) {
            await playWithSound();
          } else if (video.muted) {
            setLeadSound(video, true);
            updateControls();
          } else {
            video.dataset.userPaused = "true";
            video.pause();
          }
        };
        const activate = async () => {
          if (shell.classList.contains("player-active")) {
            await playWithSound();
            return;
          }
          shell.classList.add("player-active");
          shell.dataset.playerState = "loading";
          video.dataset.inView = "true";
          video.dataset.userPaused = "false";
          // Direct playback always starts this lead with sound without
          // enabling hover audio for every gallery video.
          video.dataset.localSoundEnabled = "true";
          preferredLeadSoundVideo = video;
          const playbackType = video.dataset.playbackType || "preview";
          const masterSource = video.dataset.playbackSrc || video.dataset.src;
          if (playbackType === "embed") {
            video.pause();
            suspendSeamlessLoop(video);
            shell.classList.add("player-embed");
            controls.setAttribute("aria-hidden", "true");
            const iframe = document.createElement("iframe");
            iframe.className = "project-player-embed";
            iframe.src = autoplayEmbedUrl(masterSource, true);
            iframe.title = video.getAttribute("aria-label") || "Project main video";
            iframe.allow = "autoplay; fullscreen; picture-in-picture";
            iframe.allowFullscreen = true;
            iframe.referrerPolicy = "strict-origin-when-cross-origin";
            shell.appendChild(iframe);
            shell.dataset.playerState = "ready";
            return;
          }
          controls.setAttribute("aria-hidden", "false");
          video.pause();
          video.classList.remove("is-ready");
          muteOtherAudibleMedia(video);
          video.muted = false;
          video.volume = .7;
          try {
            shell.dataset.playbackWidth = playbackType === "hls" ? "adaptive" : "local";
            shell.dataset.playerState = "ready";
            // Keep the complete HLS master intact so its separate audio group
            // remains attached. Local full-film caches bypass HLS entirely.
            await loadVideo(video, masterSource);
            await seekToPlaybackStart(video);
            await video.play();
          } catch (error) {
            // Never disguise a failed full-film load by silently replaying the
            // short preview. Restore the preview as a paused poster and expose
            // the full-film button for an explicit retry.
            shell.dataset.playerState = "unavailable";
            shell.classList.remove("player-active");
            controls.setAttribute("aria-hidden", "true");
            video.muted = true;
            await loadVideo(video, video.dataset.src).catch(() => {});
            video.pause();
          }
          updateControls();
        };
        trigger.addEventListener("click", event => { event.stopPropagation(); activate(); });
        playButton.addEventListener("click", event => {
          event.stopPropagation();
          if (video.paused) {
            playWithSound();
          } else {
            video.dataset.userPaused = "true";
            video.pause();
          }
        });
        muteButton.addEventListener("click", event => {
          event.stopPropagation();
          setLeadSound(video, video.muted);
          updateControls();
        });
        const seek = event => {
          event.stopPropagation();
          if (!video.duration) return;
          const rect = progress.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
          video.currentTime = ratio * video.duration;
          updateControls();
        };
        progress.addEventListener("click", seek);
        progress.addEventListener("keydown", event => {
          if (!video.duration || !["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          if (event.key === "Home") video.currentTime = 0;
          else if (event.key === "End") video.currentTime = Math.max(0, video.duration - .05);
          else video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + (event.key === "ArrowRight" ? 5 : -5)));
          updateControls();
        });
        shell.addEventListener("click", event => {
          if (!shell.classList.contains("player-active") || event.target.closest(".jdc-video-controls")) return;
          toggleFromVideoSurface();
        });
        shell.addEventListener("pointerleave", event => {
          if (
            event.pointerType === "touch" ||
            !shell.classList.contains("player-active") ||
            shell.classList.contains("player-embed")
          ) return;
          video.muted = true;
          updateControls();
        });
        shell.addEventListener("pointerenter", event => {
          if (
            event.pointerType === "touch" ||
            !shell.classList.contains("player-active") ||
            shell.classList.contains("player-embed") ||
            video.paused ||
            video.dataset.localSoundEnabled === "false"
          ) return;
          setLeadSound(video, true);
          updateControls();
        });
        ["play","pause","volumechange","timeupdate","loadedmetadata"].forEach(eventName => video.addEventListener(eventName, updateControls));
        updateControls();
      });
    }
    function bindGallerySoundPlayers() {
      root.querySelectorAll(".gallery-sound-frame").forEach(frame => {
        if (frame.dataset.soundBound === "true") return;
        const video = frame.querySelector(".gallery-video");
        if (!video) return;
        frame.dataset.soundBound = "true";
        const isFeature = video.classList.contains("gallery-feature-player");
        video.loop = false;
        video.muted = true;
        video.volume = GALLERY_SOUND_VOLUME;
        if (isFeature) galleryVideoQuartiles.set(video, new Set());
        const setSound = (enabled, input) => {
          if (enabled && !globalSoundEnabled) return;
          const wasEnabled = desiredGallerySoundVideo === video;
          requestGallerySound(video, enabled);
          if (enabled !== wasEnabled) {
            trackGalleryMedia(
              enabled
                ? (isFeature ? "gallery_video_sound_on" : "gallery_clip_sound_on")
                : (isFeature ? "gallery_video_sound_off" : "gallery_clip_sound_off"),
              video,
              { input }
            );
          }
        };
        frame.addEventListener("pointerenter", event => {
          if (event.pointerType === "touch") return;
          setSound(true, "hover");
        });
        frame.addEventListener("pointerleave", event => {
          if (event.pointerType === "touch") return;
          setSound(false, "hover");
        });
        frame.addEventListener("focusin", () => setSound(true, "focus"));
        frame.addEventListener("focusout", event => {
          if (!frame.contains(event.relatedTarget)) setSound(false, "focus");
        });
        frame.addEventListener("click", () => {
          if (window.matchMedia("(hover:hover)").matches) return;
          setSound(desiredGallerySoundVideo !== video, "tap");
        });
        frame.addEventListener("keydown", event => {
          if (!["Enter", " "].includes(event.key)) return;
          event.preventDefault();
          const wasUnlocked = galleryAudioUnlocked;
          unlockGalleryAudioFromGesture();
          setSound(!wasUnlocked || desiredGallerySoundVideo !== video, "keyboard");
        });
        video.addEventListener("loadeddata", () => video.classList.add("is-ready"));
        video.addEventListener("play", () => {
          frame.classList.add("gallery-video-active");
          video.classList.add("is-ready");
          if (isFeature && video.dataset.videoPlayTracked !== "true") {
            video.dataset.videoPlayTracked = "true";
            trackGalleryMedia("gallery_video_play", video, {
              playbackMode:"autoplay-muted-hover-sound",
            });
          }
        });
        if (isFeature) video.addEventListener("timeupdate", () => {
          if (!video.duration) return;
          const progressRatio = video.currentTime / video.duration;
          const reached = galleryVideoQuartiles.get(video) || new Set();
          [25,50,75].forEach(quartile => {
            if (progressRatio < quartile / 100 || reached.has(quartile)) return;
            reached.add(quartile);
            trackGalleryMedia("gallery_video_progress", video, { quartile });
          });
          galleryVideoQuartiles.set(video, reached);
        });
        const recordCompletion = () => {
          if (video.dataset.completionTracked === "true") return;
          video.dataset.completionTracked = "true";
          trackGalleryMedia("gallery_video_complete", video, {
            completionScope:Number(frame.dataset.segmentCount || 1) > 1 ? "segment" : "video",
          });
          const segmentCount = Number(frame.dataset.segmentCount || 1);
          if (segmentCount > 1) {
            const mediaId = frame.dataset.mediaId;
            const state = logicalVideoSegmentCompletions.get(mediaId) || { segments:new Set(), completed:false };
            state.segments.add(Number(frame.dataset.segmentIndex || 1));
            if (!state.completed && state.segments.size === segmentCount) {
              state.completed = true;
              trackGalleryMedia("gallery_video_parent_complete", video, {
                completedSegments:[...state.segments].sort((a,b) => a - b),
              });
            }
            logicalVideoSegmentCompletions.set(mediaId, state);
          }
        };
        if (isFeature) video.addEventListener("jdc-loop-wrap", recordCompletion);
        video.addEventListener("volumechange", () => {
          if (video.muted) frame.classList.remove("gallery-sound-active");
        });
      });
    }
    function activateMedia() {
      if (mediaObserver) mediaObserver.disconnect();
      const videos = [...root.querySelectorAll(".project-loop, .gallery-video")];
      videos.forEach(prepareSeamlessLoop);
      bindLeadPlayers();
      bindGallerySoundPlayers();
      mediaObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const video = entry.target;
          if (entry.isIntersecting) {
            video.dataset.inView = "true";
            if (video.classList.contains("gallery-video")) {
              loadVideo(video).catch(() => {});
              if (!reduceMotion.matches) {
                if (!video.closest(".gallery-sound-frame")?.classList.contains("gallery-sound-active")) {
                  video.muted = true;
                }
                video.play().then(() => {
                  if (video.classList.contains("gallery-feature-player")) return;
                  if (video.dataset.clipTracked === "true") return;
                  video.dataset.clipTracked = "true";
                  trackGalleryMedia("gallery_clip_autoplay", video);
                }).catch(() => {});
              }
            } else {
              const shell = video.closest(".project-media");
              if (!shell?.classList.contains("player-active")) {
                video.muted = true;
                loadVideo(video).catch(() => {});
                if (!reduceMotion.matches) video.play().catch(() => {});
              } else if (!shell.classList.contains("player-embed") && video.dataset.userPaused !== "true") {
                video.play().catch(() => {});
              }
            }
          } else {
            video.dataset.inView = "false";
            if (video.classList.contains("gallery-video")) {
              resetGallerySoundVideo(video);
            }
            video.pause();
            suspendSeamlessLoop(video);
          }
        });
      }, { rootMargin:"240px 0px", threshold:.12 });
      videos.forEach(video => mediaObserver.observe(video));
    }
    function teardownMedia() {
      if (mediaObserver) mediaObserver.disconnect();
      root.querySelectorAll(".project-loop, .gallery-video").forEach(video => {
        if (video.classList.contains("gallery-video")) resetGallerySoundVideo(video);
        video.pause();
        suspendSeamlessLoop(video);
      });
      hlsPlayers.forEach(player => player.destroy());
      hlsPlayers.clear();
    }
    function render() {
      teardownMedia();
      const visible = projects.filter(project => {
        const hidden = hiddenRoutes.has(project.route) || !selectedRoutes.has(project.route);
        const matchesFilter = (currentFilter === "all" && !hidden) ||
          (currentFilter === "director" && !hidden && hasDirectorRole(project)) ||
          (currentFilter === "producer" && !hidden && hasProducerRole(project)) ||
          (currentFilter === "editor" && !hidden && hasEditorRole(project)) ||
          (currentFilter === "creative" && !hidden && hasCreativeRole(project)) ||
          (currentFilter === "press" && !hidden && hasPress(project)) ||
          (currentFilter === "recognition" && !hidden && hasRecognition(project)) ||
          (currentFilter === "quotes" && !hidden && project.quotes.length > 0);
        return matchesFilter;
      });
      for (const [firstRoute, secondRoute] of [
        ["/celeste-everyday", "/paracosm"],
        ["/lovb-launch", "/ggm-accoustic"],
      ]) {
        const firstIndex = visible.findIndex(project => project.route === firstRoute);
        const secondIndex = visible.findIndex(project => project.route === secondRoute);
        if (firstIndex >= 0 && secondIndex >= 0) {
          [visible[firstIndex], visible[secondIndex]] = [visible[secondIndex], visible[firstIndex]];
        }
      }
      list.innerHTML = visible.length ? visible.map(project => {
        const credits = project.credits.length ? `<section class="content-section"><div class="section-label">Credits</div><div class="credit-grid">${project.credits.map(([role,name]) => `<div class="credit"><div class="credit-role">${escapeHTML(role || "Credit")}</div><div class="credit-name">${escapeHTML(name)}</div></div>`).join("")}</div></section>` : "";
        const fields = project.fields.map(field => `<section class="content-section"><div class="section-label">${escapeHTML(field.label)}</div><div class="link-line">${field.links.map(link => `<a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(link.label)}</a>`).join("")}</div></section>`).join("");
        const quotes = project.quotes.length ? `<section class="content-section"><div class="quotes">${project.quotes.map(quote => `<blockquote><p>“${escapeHTML(quote.text)}”</p><footer>${escapeHTML(quote.source)}</footer></blockquote>`).join("")}</div></section>` : "";
        const loopScale = Number(project.media.scale) > 1 ? Number(project.media.scale) : 1;
        const projectAspect = Number(project.media.aspect) > 0 ? Number(project.media.aspect) : 16 / 9;
        const playbackAspect = Number(project.media.playbackAspect) > 0
          ? Number(project.media.playbackAspect)
          : projectAspect;
        const playbackFit = project.media.playbackFit === "cover" ? "cover" : "contain";
        const hasMainVideo = project.media.hasMain !== false;
        const projectFit = project.media.fit === "contain" ? "contain" : "cover";
        const projectBackground = project.media.background || "#0a0a0a";
        const playerAria = project.media.playbackType === "preview"
          ? `Play the ${project.title} preview`
          : project.media.playbackType === "local_full"
            ? `Watch the full ${project.title} video`
            : `Watch the ${project.title} project-page main video`;
        const videoAria = hasMainVideo
          ? `${project.title} main video`
          : `${project.title} preview video`;
        const playerMarkup = hasMainVideo ? `<button class="media-play-trigger" type="button" aria-label="${escapeHTML(playerAria)}"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></span></button><div class="jdc-video-controls" aria-hidden="true"><button type="button" data-jdc-play>Play</button><div class="jdc-video-progress" role="slider" tabindex="0" aria-label="Video progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><button type="button" data-jdc-mute>Sound</button></div>` : "";
        const media = `<div class="project-media${hasMainVideo ? "" : " no-main"}" style="--loop-scale:${loopScale};--project-aspect:${projectAspect};--playback-aspect:${playbackAspect};--playback-fit:${playbackFit};--project-fit:${projectFit};--project-bg:${escapeHTML(projectBackground)}" data-playback-quality="${escapeHTML(project.media.playbackQuality)}"><img class="loop-backdrop" src="${escapeHTML(project.media.poster)}" alt="" aria-hidden="true" draggable="false"><video class="project-loop" muted playsinline preload="none" poster="${escapeHTML(project.media.poster)}" data-src="${escapeHTML(project.media.src)}" data-playback-src="${escapeHTML(project.media.playbackSrc)}" data-playback-type="${escapeHTML(project.media.playbackType)}" data-playback-start="${Number(project.media.playbackStart || 0)}" aria-label="${escapeHTML(videoAria)}"></video>${playerMarkup}</div>`;
        const rawGalleryItems = project.gallery.items || [];
        // Stagger the three matching Snow Angels clip types across the
        // four-column rows: original clips 4, 8, and 12 land in columns 4,
        // 3, and 2 respectively. Current display positions 2 and 8 are also
        // swapped per the subsequent gallery review.
        const galleryItems = project.route === "/siberia-hills" && rawGalleryItems.length === 12
          ? [0,6,2,3,4,5,7,1,8,11,9,10].map(index => rawGalleryItems[index])
          : rawGalleryItems;
        const allGalleryItemsAreVideos = project.gallery.videoCount === galleryItems.length;
        const fourColumnVideoGallery = allGalleryItemsAreVideos &&
          (project.route === "/siberia-hills" ||
            (project.route === "/lovb-adidas" && galleryItems.length === 4));
        const twoColumnVideoGallery = allGalleryItemsAreVideos &&
          !fourColumnVideoGallery &&
          (galleryItems.length === 2 || galleryItems.length === 4);
        const galleryModifiers = project.gallery.videoCount ? [
          twoColumnVideoGallery ? "gallery-two-column" : "",
          fourColumnVideoGallery ? "gallery-four-column" : "",
          allGalleryItemsAreVideos && galleryItems.length === 3 ? "gallery-three-items" : "",
          allGalleryItemsAreVideos && galleryItems.length > 3 && galleryItems.length % 2 === 1 ? "gallery-odd-over-three" : "",
        ].filter(Boolean).join(" ") : "";
        const galleryClass = project.gallery.videoCount
          ? `project-gallery${galleryModifiers ? ` ${galleryModifiers}` : ""}`
          : "project-gallery gallery-images";
        const renderGalleryItems = (items, indexOffset = 0) => items.map((item, localIndex) => {
          const index = indexOffset + localIndex;
          const aspect = Number(item.aspect) > 0 ? Number(item.aspect) : 16 / 9;
          const style = `--media-aspect:${aspect}`;
          if (item.type === "video") {
            const poster = item.poster ? ` poster="${escapeHTML(item.poster)}"` : "";
            const backdrop = item.poster ? `<img class="loop-backdrop" src="${escapeHTML(item.poster)}" alt="" aria-hidden="true" draggable="false">` : "";
            const mediaLabel = item.label || `${project.title} video ${index + 1}`;
            const caption = item.displayLabel ? `<figcaption class="gallery-caption">${escapeHTML(item.displayLabel)}</figcaption>` : "";
            const videoIdentity = galleryVideoIdentity(project, item);
            const hasAudio = item.hasAudio === true;
            const mediaId = videoIdentity?.id || galleryMediaId(project, item);
            const dataAttributes = `data-media-kind="${videoIdentity ? "video" : "clip"}" data-media-id="${escapeHTML(mediaId)}" data-presentation="${videoIdentity?.presentation || "loop"}" data-segment-index="${videoIdentity?.segmentIndex || 1}" data-segment-count="${videoIdentity?.segmentCount || 1}" data-project-route="${escapeHTML(project.route)}" data-project-title="${escapeHTML(project.title)}"`;
            const mediaSource = escapeHTML(revisedMediaUrl(item.src));
            if (videoIdentity) {
              const hoverLabel = videoIdentity.presentation === "split-segment"
                ? `${mediaLabel}, segment ${videoIdentity.segmentIndex} of ${videoIdentity.segmentCount}; hover or focus for sound`
                : `${mediaLabel}; hover or focus for sound`;
              const soundClass = hasAudio ? " gallery-sound-frame" : "";
              const soundAttributes = hasAudio
                ? ` tabindex="0" aria-label="${escapeHTML(hoverLabel)}"`
                : ` aria-label="${escapeHTML(mediaLabel)}"`;
              return `<figure class="gallery-frame gallery-feature-frame${soundClass}" style="${style}"${soundAttributes} ${dataAttributes}>${backdrop}<video class="gallery-video gallery-feature-player" muted autoplay playsinline preload="none"${poster} data-src="${mediaSource}" aria-label="${escapeHTML(mediaLabel)}"></video>${caption}</figure>`;
            }
            const clipSoundClass = hasAudio ? " gallery-sound-frame" : "";
            const clipSoundAttributes = hasAudio
              ? ` tabindex="0" aria-label="${escapeHTML(`${mediaLabel}; hover or focus for sound`)}"`
              : "";
            return `<figure class="gallery-frame${clipSoundClass}" style="${style}"${clipSoundAttributes} ${dataAttributes}>${backdrop}<video class="gallery-video" muted autoplay playsinline preload="none"${poster} data-src="${mediaSource}" aria-label="${escapeHTML(mediaLabel)}"></video>${caption}</figure>`;
          }
          return `<figure class="gallery-frame" style="${style}"><img src="${escapeHTML(item.src)}" alt="${escapeHTML(project.title)} website image ${index + 1}" loading="lazy" decoding="async"></figure>`;
        }).join("");
        const gallery = !galleryItems.length ? "" :
          `<div class="${galleryClass}" aria-label="${escapeHTML(project.title)} verified media">${renderGalleryItems(galleryItems)}</div>`;
        const projectMeta = `<span class="project-meta"><span class="project-type">${escapeHTML(project.projectType)}</span></span>`;
        return `<article class="project" data-date="${escapeHTML(project.date)}">${media}${gallery}<div class="project-grid"><header class="project-heading">${projectMeta}<h2>${renderProjectTitle(project.title)}</h2></header><div class="project-body">${credits}${fields}${quotes}</div></div></article>`;
      }).join("") : `<div class="empty">No matching projects.</div>`;
      activateMedia();
    }
    setGlobalSound(false);
    render();
    return () => { teardownMedia(); root.removeEventListener("click", unlockGalleryAudioFromGesture, { capture:true }); };
  
}
