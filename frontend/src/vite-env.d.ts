/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 API 基址。留空时走同域 /api（Worker ASSETS 一体化托管）；前后端分域部署时填 Worker 公网地址 */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
