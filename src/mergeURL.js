import url from 'url'
import qs from 'qs'

export default (origUrl, newQuery) => {
  const sourceUrl = url.parse(origUrl)
  const query = qs.stringify({
    ...qs.parse(sourceUrl.query),
    ...newQuery
  }, { strictNullHandling: true })
  return url.format({ ...sourceUrl, search: query })
}
