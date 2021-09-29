const StorageService = {

  isAuthenticated() {
    return localStorage.getItem("TOKEN_DOJOT") !== null;
  },
  getToken() {
    return localStorage.getItem("TOKEN_DOJOT");
  },
  doLogin(token) {
    const [generalInfo, userInfo] = token.split(".");
    localStorage.setItem("GENERAL_INFO", generalInfo);
    localStorage.setItem("USER_INFO", userInfo);
    localStorage.setItem("TOKEN_DOJOT", token);
    return true;
  },
  doLogout() {
    localStorage.removeItem("GENERAL_INFO");
    localStorage.removeItem("USER_INFO");
    localStorage.removeItem("TOKEN_DOJOT");
  }
};
