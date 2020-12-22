import pumpify from 'pumpify'
import merge from 'merge2'
import duplexify from 'duplexify'
import zip from 'unzipper'
import { finished, pipeline } from 'readable-stream'
import mapStream from '../streams/mapStream'

export default (parser, regex) => {
  const out = merge({ end: false })

  const dataStream = pumpify.obj(
    zip.Parse(),
    mapStream.obj((entry, _, cb) => {
      if (entry.type !== 'File' || !regex.test(entry.path)) {
        entry.autodrain()
        return cb()
      }
      out.add(pipeline(entry, parser(), cb))
    }))

  finished(dataStream, () => out.end(null))
  return duplexify.obj(dataStream, out)
}
