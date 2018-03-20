export default {
  account: {
    http: true,
  },
  theme:{
    update: true,
    backup: true,
    assetsSync: true,
    excludeFiles: [],
    root: '.',
    assetsDomain: 'https://assets.insales.ru'
  },
  util: {
    openBrowser: true
  },
  plugins: {
    exclude: ['*.min.js', '*.min.css', '*.liquid']
  }
}
