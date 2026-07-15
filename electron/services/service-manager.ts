import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { app } from 'electron'
import { getSetting } from '../db/settings'
import type { LLMConfig } from '../../src/types'

let serviceProcess: ChildProcess | null = null
let mcpProcess: ChildProcess | null = null
let servicePort = 19876
let isReady = false
let serviceRestartCount = 0
let mcpRestartCount = 0
const MAX_RESTART_DELAY = 30000

function getServicePath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'dist-electron/services/fetch-analysis-service.js')
  }
  return path.join(__dirname, '../../dist-electron/services/fetch-analysis-service.js')
}

function getMcpServerPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'dist-electron/services/mcp-server.js')
  }
  return path.join(__dirname, '../../dist-electron/services/mcp-server.js')
}

function getLLMConfig(): LLMConfig {
  const baseUrl = getSetting('llm_baseUrl') || ''
  const apiKey = getSetting('llm_apiKey') || ''
  const model = getSetting('llm_model') || ''
  return { baseUrl, apiKey, model }
}

function restartDelay(count: number): number {
  return Math.min(2000 * Math.pow(1.5, count), MAX_RESTART_DELAY)
}

// ========== Fetch Analysis Service ==========

function startFetchAnalysisInternal(resolve?: () => void) {
  if (serviceProcess) return

  const servicePath = getServicePath()
  console.log(`[Service] Starting from: ${servicePath}`)

  serviceProcess = spawn('node', [servicePath], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' }
  })

  serviceProcess.stdout?.on('data', (data) => {
    console.log(`[Service] ${data.toString().trim()}`)
  })

  serviceProcess.stderr?.on('data', (data) => {
    console.error(`[Service] ${data.toString().trim()}`)
  })

  serviceProcess.on('message', (msg: any) => {
    if (msg.type === 'ready') {
      isReady = true
      servicePort = msg.port || servicePort
      serviceRestartCount = 0
      console.log(`[Service] Ready on port ${servicePort}`)

      const config = getLLMConfig()
      if (config.baseUrl && config.apiKey && config.model) {
        sendToService({ type: 'config', config })
      }

      resolve?.()
    }
  })

  serviceProcess.on('error', (err) => {
    console.error('[Service] Error:', err.message)
    serviceProcess = null
    isReady = false
  })

  serviceProcess.on('exit', (code) => {
    console.log(`[Service] Exited with code ${code}`)
    serviceProcess = null
    isReady = false

    // Auto-restart
    const delay = restartDelay(serviceRestartCount++)
    console.log(`[Service] Restarting in ${Math.round(delay / 1000)}s (attempt ${serviceRestartCount})`)
    setTimeout(() => startFetchAnalysisInternal(), delay)
  })
}

export function startFetchAnalysisService(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (serviceProcess && isReady) {
      resolve()
      return
    }

    startFetchAnalysisInternal(() => resolve())

    setTimeout(() => {
      if (!isReady) reject(new Error('Service start timeout'))
    }, 10000)
  })
}

export function stopFetchAnalysisService() {
  serviceRestartCount = 999 // prevent auto-restart
  if (serviceProcess) {
    serviceProcess.kill('SIGTERM')
    serviceProcess = null
    isReady = false
  }
}

export function sendToService(msg: any) {
  if (serviceProcess && isReady) {
    serviceProcess.send(msg)
  }
}

export function updateServiceConfig() {
  const config = getLLMConfig()
  sendToService({ type: 'config', config })
}

export async function callService(action: string, params?: any): Promise<any> {
  if (!isReady) throw new Error('Service not ready')

  const response = await fetch(`http://127.0.0.1:${servicePort}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params })
  })

  if (!response.ok) throw new Error(`Service request failed: ${response.status}`)

  const data = await response.json()
  if (!data.ok) throw new Error(data.error || 'Service error')

  return data.data
}

export function isServiceReady(): boolean {
  return isReady
}

// ========== MCP Server ==========

function startMcpInternal() {
  if (mcpProcess) return

  const scriptPath = getMcpServerPath()
  console.log(`[MCP] Starting from: ${scriptPath}`)

  mcpProcess = spawn(process.execPath, [scriptPath, '--http'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  })

  mcpProcess.stdout?.on('data', (data) => {
    console.log(`[MCP] ${data.toString().trim()}`)
  })

  mcpProcess.stderr?.on('data', (data) => {
    console.log(`[MCP] ${data.toString().trim()}`)
  })

  mcpProcess.on('error', (err) => {
    console.error('[MCP] Error:', err.message)
    mcpProcess = null
  })

  mcpProcess.on('exit', (code) => {
    console.log(`[MCP] Exited with code ${code}`)
    mcpProcess = null

    // Auto-restart
    const delay = restartDelay(mcpRestartCount++)
    console.log(`[MCP] Restarting in ${Math.round(delay / 1000)}s (attempt ${mcpRestartCount})`)
    setTimeout(() => startMcpInternal(), delay)
  })
}

export function startMcpServer() {
  mcpRestartCount = 0
  startMcpInternal()
}

export function stopMcpServer() {
  mcpRestartCount = 999 // prevent auto-restart
  if (mcpProcess) {
    mcpProcess.kill('SIGTERM')
    mcpProcess = null
  }
}

export function getMcpServerCommand(): { command: string; args: string[] } {
  const scriptPath = getMcpServerPath()
  return {
    command: process.execPath,
    args: [scriptPath]
  }
}
