import fs from 'fs'
import os from 'os'
import path from 'path'
import { FSKeyValueCache } from './utils/cache-utils'

type TestCache = {
  token?: string
  workspaceId?: string
  apiUrl?: string
  counter?: number
}

async function testConcurrentCacheAccess() {
  console.log('Starting concurrent cache access test\n')

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-stress-test-'))
  const cacheFile = path.join(tmpDir, 'test-cache.json')

  console.log(`Cache file: ${cacheFile}\n`)

  const initialData = {
    token: 'initial-token',
    workspaceId: 'initial-workspace',
    apiUrl: 'https://api.initial.com',
    counter: 0,
  }
  fs.writeFileSync(cacheFile, JSON.stringify(initialData, null, 2))

  console.log('Initial cache data written')
  console.log(JSON.stringify(initialData, null, 2))
  console.log()

  const numInstances = 10
  const cacheInstances: FSKeyValueCache<TestCache>[] = []

  for (let i = 0; i < numInstances; i++) {
    cacheInstances.push(new FSKeyValueCache<TestCache>(cacheFile))
  }

  console.log(`Created ${numInstances} cache instances`)
  console.log('Running concurrent operations\n')

  const startTime = Date.now()

  const operations = cacheInstances.map((cache, index) => {
    return (async () => {
      const operationId = `Cache-${index}`

      const token = await cache.get('token')
      console.log(`[${operationId}] Read token: ${token}`)

      await cache.set('token', `token-from-${operationId}`)
      console.log(`[${operationId}] Set token: token-from-${operationId}`)

      const workspaceId = await cache.get('workspaceId')
      console.log(`[${operationId}] Read workspaceId: ${workspaceId}`)

      await cache.set('workspaceId', `workspace-from-${operationId}`)
      console.log(`[${operationId}] Set workspaceId: workspace-from-${operationId}`)

      const counter = await cache.get('counter')
      await cache.set('counter', (counter || 0) + 1)
      console.log(`[${operationId}] Incremented counter: ${counter} -> ${(counter || 0) + 1}`)

      const newCounter = await cache.get('counter')
      console.log(`[${operationId}] Read counter back: ${newCounter}`)
    })()
  })

  await Promise.all(operations)

  const endTime = Date.now()
  const duration = endTime - startTime

  console.log(`\nAll operations completed in ${duration}ms\n`)

  const finalCache = new FSKeyValueCache<TestCache>(cacheFile)

  const finalToken = await finalCache.get('token')
  const finalWorkspaceId = await finalCache.get('workspaceId')
  const finalApiUrl = await finalCache.get('apiUrl')
  const finalCounter = await finalCache.get('counter')

  console.log('Final cache state:')
  console.log({
    token: finalToken,
    workspaceId: finalWorkspaceId,
    apiUrl: finalApiUrl,
    counter: finalCounter,
  })
  console.log()

  const fileContent = fs.readFileSync(cacheFile, 'utf8')
  console.log('Actual file content:')
  console.log(fileContent)
  console.log()

  console.log('Analysis:')
  console.log(`- Expected counter if no race conditions: ${numInstances}`)
  console.log(`- Actual counter: ${finalCounter}`)

  if (finalCounter === numInstances) {
    console.log('No race conditions detected')
  } else {
    console.log('Race condition detected: Counter increments were lost due to concurrent writes')
    console.log('This is expected behavior for independent cache instances without locking')
  }
  console.log()

  try {
    const parsed = JSON.parse(fileContent)
    console.log('File is valid JSON')
    console.log(`File has ${Object.keys(parsed).length} keys`)
  } catch (error) {
    console.error('File is corrupted - not valid JSON')
    console.error(error)
  }

  fs.rmSync(tmpDir, { recursive: true })
  console.log('\nCleaned up temporary files')
  console.log('Test complete')
}

testConcurrentCacheAccess().catch((error) => {
  console.error('Test failed with error:', error)
  process.exit(1)
})
