VisionNav media pack
====================
All animations are drawn from the project's real behaviour (same clock directions,
distances, thresholds and phrases as the system). They are illustrations, not camera footage.

videos/  (1280x720, MP4 = H.264, WebM = VP9, silent, loop-friendly)
  lidar      10 s  Hero loop: live LiDAR top view, objects labelled, earpiece line
  walk       12 s  "Take me to the chair": route planned around furniture, clock directions
  memory     11 s  Camera turns away, objects stay "remembered" on the map
  hand        8 s  The last inch: hand landmarks guided to the cup, cm readout
  outdoor     9 s  Crossing, red signal, car time-to-collision -> "Stop. Car coming."
  buttons     8 s  The five buttons: tap / hold, with spoken replies
posters/  key frame of each video (PNG + WebP) for <video poster="...">
gifs/     lidar, memory, buttons as GIFs (for README / LinkedIn / GitHub)
stills/   section images (2x resolution): architecture, features, comparison table,
          results, AI models, spec terminal, timeline, use cases, limits, walk demo panel,
          og-image.png (1200x630 link preview), cover-1920.png
          prototype-cutout-real.png / prototype-photo-real.jpg = the REAL prototype photo
          (cropped from a screenshot, low resolution; replace with your original file)

Suggested use:  <video src="videos/lidar.webm" poster="posters/lidar-poster.webp" autoplay muted loop playsinline></video>
