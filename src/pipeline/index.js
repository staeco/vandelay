/* eslint-disable no-loops/no-loops */
import { pipeline } from 'readable-stream'
import ex from 'stream-exhaust'

const pipe = (...s) => pipeline(...s)
pipe.exhaust = (...s) => ex(pipe(...s))

export default pipe
