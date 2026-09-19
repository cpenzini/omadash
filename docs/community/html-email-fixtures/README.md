# Synthetic HTML email fixtures

These messages are fictional reproductions for checking the HTML reader. Open
each `.html` file in a sample message or use it as the message body in a local
test build. Resize the reader to a narrow window (about 360 CSS px) and a wide
window (about 1100 CSS px); note clipping, horizontal scrolling, or distorted
columns. These fixtures intentionally make no claims about live mailbox data.

## Expected behavior

- `nested-two-column.html` uses nested, fixed-basis columns. On a narrow reader,
  content should remain readable without forcing horizontal scrolling; columns
  may stack or become narrower. At a wide size, both sections should be visible.
- `fixed-width-table.html` models a legacy 640px table layout. Text should wrap
  within the reader on narrow screens, with all table content still reachable.
- `inline-and-remote-images.html` includes a tiny embedded `data:` image and a
  separate remote image at the reserved `.invalid` domain. With external images
  disabled (the default), the embedded image may render and the remote image
  must remain blocked. The remote URL is deliberately non-resolving and carries
  no tracking identifier.

The examples contain no scripts, frames, remote stylesheets, forms, or active
links. They are manual layout reproductions rather than pixel snapshots; record
the app build and actual observations when reporting a rendering difference.
