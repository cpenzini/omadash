# Reproduce the 48-second sample walkthrough

The demo captures the actual Qt app using fictional sample data. It exercises selection, archive/undo, splits, sample account switching, search results, selected-message replies, and the docked calendar. It is a UI walkthrough, not a live Gmail or performance demonstration. There is no real sending.

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DOMADASH_BUILD_DEMO=ON
cmake --build build --target omadash_demo -j 4
mkdir -p /tmp/omadash-demo-frames
GSETTINGS_BACKEND=memory OMADASH_TEST_MODE=1 QT_QPA_PLATFORM=offscreen \
  QTWEBENGINE_CHROMIUM_FLAGS=--disable-gpu \
  ./build/omadash_demo /tmp/omadash-demo-frames
```

The optional recorder is disabled in normal builds and does not load `.state/` or restore accounts. It produces 240 frames at five frames per second. Encode with FFmpeg using the narration captions in `demo.srt`:

```sh
ffmpeg -y -framerate 5 -i /tmp/omadash-demo-frames/%04d.png \
  -vf "pad=iw:ih+100:0:0:color=0x182028,subtitles=docs/community/demo.srt:force_style='FontSize=8,Outline=0,Shadow=0,MarginV=5'" \
  -c:v libx264 -crf 22 -pix_fmt yuv420p -r 25 -movflags +faststart \
  /tmp/omadash-demo.mp4
```
