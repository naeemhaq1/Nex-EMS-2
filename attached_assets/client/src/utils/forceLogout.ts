// Force logout utility that clears all browser storage
export const forceLogout = async () => {
  try {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    
    // Call logout API
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    // Force reload to clear any cached data
    window.location.href = '/';
    
  } catch (error) {
    console.error('Force logout error:', error);
    // Force reload anyway
    window.location.href = '/';
  }
};