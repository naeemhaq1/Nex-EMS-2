
declare global {
  interface Window {
    __WS_TOKEN__: string;
    BigInt: typeof BigInt;
    bigint: typeof BigInt;
    __vite_plugin_runtime_error_modal_disabled: boolean;
    __vite_plugin_disable_error_overlay: boolean;
    __vite__: any;
    global: typeof globalThis;
  }
  
  var __WS_TOKEN__: string;
  var bigint: typeof BigInt;
  var global: typeof globalThis;
  
  namespace globalThis {
    var __WS_TOKEN__: string;
    var bigint: typeof BigInt;
  }
}

export {};
