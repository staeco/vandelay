import url from 'url'
import qs from 'qs'

const parseConfig = {
  strictNullHandling: true,
  plainObjects: true,
  arrayLimit: 1000,
  depth: 1000
}

export default (origUrl, newQuery) => {
  const sourceUrl = url.parse(origUrl)
  const query = qs.stringify({
    ...qs.parse(sourceUrl.query, parseConfig),
    ...newQuery
  }, { strictNullHandling: true })
  return url.format({ ...sourceUrl, search: query })
}
