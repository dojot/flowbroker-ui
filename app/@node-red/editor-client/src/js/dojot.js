const DojotService = {
  async getToken() {
    try {
      const res = await axios.post(`${dojotConfig.host}/auth/`,
        { username: dojotConfig.user, passwd: dojotConfig.password },
        { accept: "application/json" });
      return res.data.jwt;
    } catch (err) {
      console.error(`Call Http.service - Requesting error: ${err.toString()}`);
      return null;
    }
  },
  async getDevices(params = "") {
    try {
      const token = await DojotService.getToken();
      const config = {
        accept: "application/json",
        headers: { Authorization: `Bearer ${token}` },
      };
      return axios.get(
        `${dojotConfig.host}/device${params}`,
        config
      );
    } catch (err) {
      console.error(`Call Http.service - Requesting error: ${err.toString()}`);
      return [];
    }
  },
  async getTemplates(params = "") {
    try {
      const token = await DojotService.getToken();
      const config = {
        accept: "application/json",
        headers: { Authorization: `Bearer ${token}` },
      };
      return axios.get(
        `${dojotConfig.host}/template${params}`,
        config
      );
    } catch (err) {
      console.error(`Call Http.service - Requesting error: ${err.toString()}`);
      return [];
    }
  }
};
