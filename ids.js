import { existsSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import axios from 'axios'
import * as cheerio from 'cheerio';
import bangumiData from 'bangumi-data' assert { type: 'json' }

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36',
}

async function fetch(url) {
  try {
    console.log(`Fetch ${url}`)
    return await axios.get(url, { headers })
  } catch (error) {
    console.log(error)
  }
}

function write(filePath, data) {
  const dirPath = dirname(filePath)
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath)
  }
  console.log(` Write to ${filePath}`)
  writeFileSync(filePath, JSON.stringify(Array.from(new Set(data)).sort((a, b) => a - b)))
}

async function buildIds() {
  // 番剧 Rank : https://bgm.tv/anime/browser?sort=rank&page=1
  const page = 285
  let data = []

  // 从Bangumi-Data中获取所有的番剧
  bangumiData.items.forEach(item => {
    const find = item.sites.find(site => site.site === 'bangumi')
    if (find) {
      data.push(parseInt(find.id))
    }
  })
  write('./ids/anime-bangumi-data.json', data)

  data = []
  for (let i = 1; i <= page; i++) {
    setTimeout(() => {}, 500)
    const url = `https://bgm.tv/anime/browser?sort=rank&page=${i}`
    const { data: html } = await fetch(url)
    const $ = cheerio.load(html)
    const ids = $('#browserItemList > li').map((index, element) => {
      return parseInt(element.attribs.id.replace('item_', ''))
    }).get() || []
    data.push(...ids)
  }
  write('./ids/rank-bangumi.json', data)

  console.log('Done')
}

buildIds()