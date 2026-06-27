// Next 启动钩子：本地把 server 端 fetch 路由到代理。
// 原因：Node 22 的 fetch 默认不读 HTTP(S)_PROXY；本地 ofox(embedding)/cloudsway 需经代理。
// 生产（Railway）环境无 HTTPS_PROXY，自动跳过、直连外网。
export async function register() {
  const proxy =
    process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY
  if (proxy) {
    const { setGlobalDispatcher, EnvHttpProxyAgent } = await import('undici')
    setGlobalDispatcher(new EnvHttpProxyAgent())
    console.log('[instrumentation] server fetch 走代理:', proxy)
  }
}
