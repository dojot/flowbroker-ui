const StorageService = {
  isAuthenticated() {
    return localStorage.getItem("TOKEN_KEY") !== null;
  },
  getToken() {
    return localStorage.getItem("TOKEN_KEY");
  },
};
