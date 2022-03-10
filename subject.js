import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import axios from 'axios'

axios.defaults.timeout = 3000

const rewrite = true
const queueNum = 8
const startIndex = 0

const host = 'https://api.bgm.tv'
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36',
}
const ids = [
  ...JSON.parse(readFileSync('./ids/anime-bangumi-data.json', 'utf8')),
  ...JSON.parse(readFileSync('./ids/rank-bangumi.json', 'utf8'))
]

function decode(str = '') {
  if (str.length === 0) {
    return ''
  }
  return (
    str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      // eslint-disable-next-line quotes
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
  )
}

async function fetchSubject(id, index, count = 0) {
  const retry = 3

  try {
    const filePath = `./data/${Math.floor(id / 100)}/${id}.json`
    const exists = existsSync(filePath)
    if (!rewrite && exists) {
      return true
    }

    const { data: apiRes } = await axios.get(`${host}/v0/subjects/${id}`, { headers })

    const dirPath = dirname(filePath)
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true })
    }

    console.log(`- Write to ${id}.json [${index}/${ids.length}]`, apiRes.name)
    writeFileSync(filePath, decode(JSON.stringify(apiRes)))

    return true
  } catch (error) {

    if (error.response && error.response.status === 404) {
      console.log(`- 404 ${id}.json [${index}/${ids.length}]`)
      return true
    } 

    if (count < retry) {
      console.log(`- Retry ${id}.json [${index}/${ids.length}]`)
      return fetchSubject(id, index, count + 1)
    } else {
      console.log(`- [Error] ${id}.json [${index}/${ids.length}]`)
    }

    return true
  }
}

async function queue(fetchs, num = 2) {
  if (!fetchs.length) {
    return false
  }

  await Promise.all(
    Array.from({ length: num }).map(async () => {
      while (fetchs.length) {
        setTimeout(() => {}, 100)
        const fetch = fetchs.shift()
        if (fetch) {
          await fetch()
        }
      }
    })
  )

  return true
}

const fetchs = ids.map((id, index) => () => {
  if (index < startIndex) return true
  return fetchSubject(id, index)
})

queue(fetchs, queueNum)