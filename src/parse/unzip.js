import pumpify from 'pumpify'
import merge from 'merge2'
import duplexify from 'duplexify'
import through2 from 'through2'
import zip from 'unzipper'
import { finished, pipeline } from 'readable-stream'

export default (parser, regex) => {
  const out = merge({ end: false })

  const dataStream = pumpify.obj(
    zip.Parse(),
    through2.obj((entry, _, cb) => {
      if (entry.type !== 'File' || !regex.test(entry.path)) {
        entry.autodrain()
        return cb()
      }
      out.add(pipeline(entry, parser(), cb))
    }))

  finished(dataStream, () => out.push(null))
  return duplexify.obj(dataStream, out)
}
