(function () {
  try {
    var t = localStorage.getItem('nx_theme')
    document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark')
    document.documentElement.style.background = t === 'light' ? '#fcf9f8' : '#111010'
    var l = localStorage.getItem('nx_locale')
    if (l) document.documentElement.setAttribute('lang', l === 'fr' ? 'fr' : 'en')
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
})()
