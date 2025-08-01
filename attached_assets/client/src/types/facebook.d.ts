declare global {
  interface Window {
    FB: {
      init: (options: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse: {
            accessToken: string;
            userID: string;
            expiresIn: number;
            signedRequest: string;
          } | null;
          status: string;
        }) => void,
        options?: { scope: string }
      ) => void;
      logout: (callback?: () => void) => void;
      getLoginStatus: (callback: (response: any) => void) => void;
      api: (path: string, callback: (response: any) => void) => void;
    };
  }
}

export {};