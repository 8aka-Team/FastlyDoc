import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Globe, Zap, Clock, CheckCircle, RefreshCw, Play, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import './App.css'

function App() {
  const [speedTestResults, setSpeedTestResults] = useState({})
  const [isTestingSpeed, setIsTestingSpeed] = useState(false)
  const [testProgress, setTestProgress] = useState(0)
  const [autoTestEnabled, setAutoTestEnabled] = useState(false)
  const [autoTestInterval, setAutoTestInterval] = useState(null)
  const [docSites, setDocSites] = useState([])
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState(null)

  // 从fastly.json加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setConfigLoading(true)
        const response = await fetch('/fastly.json')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const config = await response.json()
        
        // 将配置转换为组件需要的格式
        const sites = Object.entries(config).map(([key, value]) => ({
          name: value.name || key,
          fastlyUrl: `https://${key.toLowerCase()}.fastly.8aka.cn/`,
          originalUrl: getOriginalUrl(value),
          description: getDescription(value)
        }))
        
        setDocSites(sites)
        console.log('配置加载成功:', sites)
      } catch (error) {
        console.error('加载配置失败:', error)
        setConfigError(error.message)
        
        // 使用默认配置作为后备
        setDocSites([
          { name: 'Paper', fastlyUrl: 'https://paper.fastly.8aka.cn/', originalUrl: 'https://papermc.io/', description: 'Minecraft 高性能服务端' },
          { name: 'Geyser', fastlyUrl: 'https://geyser.fastly.8aka.cn/', originalUrl: 'https://geysermc.org/', description: 'Minecraft 跨版本代理' },
          { name: 'Purpur', fastlyUrl: 'https://purpur.fastly.8aka.cn/', originalUrl: 'https://purpurmc.org/', description: 'Paper 分支服务端' },
          { name: 'Pumpkin', fastlyUrl: 'https://pumpkin.fastly.8aka.cn/', originalUrl: 'https://pumpkin.org/', description: 'Rust Minecraft 服务端' }
        ])
      } finally {
        setConfigLoading(false)
      }
    }

    loadConfig()
  }, [])

  // 从配置中提取原始URL
  const getOriginalUrl = (config) => {
    return config.rawUrl
  }

  // 生成描述
  const getDescription = (config) => {
    const name = config.name || 'Unknown'
    if (name === 'Paper') return 'Minecraft 高性能服务端'
    if (name === 'Geyser') return 'Minecraft 跨版本代理'
    if (name === 'Purpur') return 'Paper 分支服务端'
    if (name === 'Pumpkin') return 'Rust Minecraft 服务端'
    return '文档站点'
  }

  // DNS预热函数
  const warmupDNS = async (url) => {
    try {
      // 使用link prefetch进行DNS预热
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = new URL(url).origin
      document.head.appendChild(link)
      
      // 等待一小段时间让DNS预热
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 清理
      document.head.removeChild(link)
    } catch (error) {
      console.log('DNS warmup failed for', url)
    }
  }

  // 改进的URL速度测试函数
  const testUrlSpeedAdvanced = async (url, testName = '') => {
    const results = []
    const testRounds = 3 // 进行3轮测试取平均值
    
    // DNS预热
    await warmupDNS(url)
    
    for (let i = 0; i < testRounds; i++) {
      try {
        // 使用Resource Timing API获取更精确的时间
        const startTime = performance.now()
        
        // 创建一个唯一的查询参数避免缓存
        const testUrl = `${url}?_t=${Date.now()}&_r=${i}`
        
        const response = await fetch(testUrl, { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          credentials: 'omit'
        })
        
        const endTime = performance.now()
        const duration = endTime - startTime
        
        results.push(duration)
        
        // 轮次间稍作延迟
        if (i < testRounds - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      } catch (error) {
        const endTime = performance.now()
        results.push(endTime - performance.now() + 1000) // 错误时给一个较大的值
      }
    }
    
    // 去掉最大值和最小值，取中间值的平均
    if (results.length >= 3) {
      results.sort((a, b) => a - b)
      results.pop() // 去掉最大值
      results.shift() // 去掉最小值
    }
    
    const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length
    console.log(`${testName} - 测试结果:`, results, '平均值:', averageTime.toFixed(2) + 'ms')
    
    return averageTime
  }

  // 执行速度测试
  const runSpeedTest = async () => {
    if (docSites.length === 0) {
      console.log('没有可测试的站点')
      return
    }

    setIsTestingSpeed(true)
    setTestProgress(0)
    const results = {}
    
    const totalTests = docSites.length * 2 // 每个站点测试两个URL
    let completedTests = 0

    console.log('开始速度测试...')

    for (const site of docSites) {
      console.log(`测试 ${site.name}...`)
      
      // 测试加速站
      const fastlySpeed = await testUrlSpeedAdvanced(site.fastlyUrl, `${site.name} 加速站`)
      results[site.name] = { ...results[site.name], fastly: fastlySpeed }
      completedTests++
      setTestProgress((completedTests / totalTests) * 100)
      
      // 测试原站（如果有有效URL）
      if (site.originalUrl && site.originalUrl !== '#') {
        const originalSpeed = await testUrlSpeedAdvanced(site.originalUrl, `${site.name} 原站`)
        results[site.name] = { ...results[site.name], original: originalSpeed }
      }
      completedTests++
      setTestProgress((completedTests / totalTests) * 100)
      
      // 站点间稍作延迟
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    console.log('测试完成，结果:', results)
    setSpeedTestResults(results)
    setIsTestingSpeed(false)
  }

  // 自动测试功能
  const toggleAutoTest = () => {
    if (autoTestEnabled) {
      // 停止自动测试
      if (autoTestInterval) {
        clearInterval(autoTestInterval)
        setAutoTestInterval(null)
      }
      setAutoTestEnabled(false)
    } else {
      // 启动自动测试
      setAutoTestEnabled(true)
      
      // 立即执行一次测试
      runSpeedTest()
      
      // 设置定时器，每5分钟自动测试一次
      const interval = setInterval(() => {
        if (!isTestingSpeed) {
          runSpeedTest()
        }
      }, 5 * 60 * 1000) // 5分钟
      
      setAutoTestInterval(interval)
    }
  }

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (autoTestInterval) {
        clearInterval(autoTestInterval)
      }
    }
  }, [autoTestInterval])

  // 获取速度比较结果
  const getSpeedComparison = (siteName) => {
    const result = speedTestResults[siteName]
    if (!result || !result.fastly || !result.original) return null
    
    const improvement = ((result.original - result.fastly) / result.original * 100).toFixed(1)
    return {
      fastlySpeed: result.fastly.toFixed(0),
      originalSpeed: result.original.toFixed(0),
      improvement: improvement > 0 ? improvement : 0
    }
  }

  // 获取总体统计
  const getOverallStats = () => {
    const sites = Object.keys(speedTestResults)
    if (sites.length === 0) return null
    
    let totalImprovement = 0
    let improvedSites = 0
    
    sites.forEach(siteName => {
      const comparison = getSpeedComparison(siteName)
      if (comparison && comparison.improvement > 0) {
        totalImprovement += parseFloat(comparison.improvement)
        improvedSites++
      }
    })
    
    return {
      averageImprovement: improvedSites > 0 ? (totalImprovement / improvedSites).toFixed(1) : 0,
      improvedSites,
      totalSites: sites.length
    }
  }

  const overallStats = getOverallStats()

  // 如果配置正在加载
  if (configLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              加载配置中...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">正在从 fastly.json 加载站点配置...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  文档加速站
                </h1>
                <p className="text-sm text-gray-600">
                  由 8aka-Team 提供 • {docSites.length} 个站点
                  {configError && (
                    <span className="text-yellow-600 ml-2">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      使用默认配置
                    </span>
                  )}
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center space-x-3"
            >
              <Button 
                onClick={toggleAutoTest}
                variant={autoTestEnabled ? "destructive" : "outline"}
                className={autoTestEnabled ? "bg-red-500 hover:bg-red-600" : ""}
                disabled={docSites.length === 0}
              >
                {autoTestEnabled ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    停止自动测试
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    开启自动测试
                  </>
                )}
              </Button>
              
              <Button 
                onClick={runSpeedTest} 
                disabled={isTestingSpeed || docSites.length === 0}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                <Clock className="h-4 w-4 mr-2" />
                {isTestingSpeed ? '测试中...' : '手动测试'}
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Configuration Error Alert */}
        {configError && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-800">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  配置加载警告
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-700">
                  无法加载 fastly.json 配置文件: {configError}
                </p>
                <p className="text-yellow-600 text-sm mt-2">
                  当前使用默认配置，功能可能受限。请检查配置文件是否存在。
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Overall Stats */}
        {overallStats && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  整体加速效果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{overallStats.averageImprovement}%</div>
                    <div className="text-sm text-gray-600">平均提升</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{overallStats.improvedSites}/{overallStats.totalSites}</div>
                    <div className="text-sm text-gray-600">站点受益</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{autoTestEnabled ? '自动' : '手动'}</div>
                    <div className="text-sm text-gray-600">测试模式</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Speed Test Progress */}
        {isTestingSpeed && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 animate-spin" />
                  正在进行高精度测试...
                </CardTitle>
                <CardDescription>
                  使用多轮测试和DNS预热技术，减少网络波动影响
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={testProgress} className="w-full" />
                <p className="text-sm text-gray-600 mt-2">{testProgress.toFixed(0)}% 完成</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Documentation Sites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {docSites.map((site, index) => {
            const speedComparison = getSpeedComparison(site.name)
            
            return (
              <motion.div
                key={site.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-0 bg-white/70 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold text-gray-800">
                        {site.name}
                      </CardTitle>
                      <Globe className="h-5 w-5 text-gray-500" />
                    </div>
                    <CardDescription>
                      {site.description}
                      {speedComparison && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge 
                            variant="secondary" 
                            className={
                              parseFloat(speedComparison.improvement) > 0 
                                ? "bg-green-100 text-green-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {parseFloat(speedComparison.improvement) > 0 ? '提升' : '相当'} {speedComparison.improvement}%
                          </Badge>
                        </div>
                      )}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Speed Test Results */}
                    {speedComparison && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">加速站响应时间:</span>
                          <span className="font-semibold text-green-600">{speedComparison.fastlySpeed}ms</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">原站响应时间:</span>
                          <span className="font-semibold text-gray-600">{speedComparison.originalSpeed}ms</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          * 基于3轮测试平均值，已优化DNS影响
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2">
                      <Button 
                        asChild 
                        className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                      >
                        <a href={site.fastlyUrl} target="_blank" rel="noopener noreferrer">
                          <Zap className="h-4 w-4 mr-2" />
                          访问加速站
                        </a>
                      </Button>
                      
                      {site.originalUrl && site.originalUrl !== '#' && (
                        <Button 
                          asChild 
                          variant="outline" 
                          className="w-full border-gray-300 hover:bg-gray-50"
                        >
                          <a href={site.originalUrl} target="_blank" rel="noopener noreferrer">
                            <Globe className="h-4 w-4 mr-2" />
                            访问原站
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Empty State */}
        {docSites.length === 0 && !configLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-center text-gray-600">
                  <AlertCircle className="h-6 w-6 mr-2" />
                  暂无可用站点
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">
                  请检查 fastly.json 配置文件是否正确配置。
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Footer */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center text-gray-600"
        >
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
            <p className="text-sm">
              通过 CDN 加速技术为您提供更快的文档访问体验
            </p>
            <p className="text-xs mt-2 text-gray-500">
              高精度测试 • DNS优化 • 自动监控 • 动态配置 • 由 8aka-Team 提供技术支持
            </p>
          </div>
        </motion.footer>
      </main>
    </div>
  )
}

export default App

