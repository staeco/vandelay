// not only does it call close, but makes sure any further events are ignored
// useful for limiting # of items you want
export default (stream) => {
  if (stream._closed) return // already hard closed
  stream._closed = true
  stream.write = () => false // kill ability for anything to write anymore, its over

  // wait a tick for any remaining rows to process
  process.nextTick(() => {
    if (stream.end) return stream.end(null)
    if (stream.destroy) return stream.destroy()
    throw new Error('Invalid stream - no end or destroy')
  })
}
