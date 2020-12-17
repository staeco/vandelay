/* eslint-disable no-loops/no-loops */
import { pipeline } from 'readable-stream'
import ex from 'stream-exhaust'

export const exhaust = (...s) =>
  ex(pipeline(...s))

export default pipeline
