(function () {
  try {
    var t = localStorage.getItem('nx_theme')
    var valid = ['dark', 'light', 'light-sidebar']
    document.documentElement.setAttribute('data-theme', valid.indexOf(t) !== -1 ? t : 'dark')
    if (t === 'dark') document.documentElement.style.background = '#111010'
    else document.documentElement.style.background = '#fcf9f8'
    var l = localStorage.getItem('nx_locale')
    if (l) document.documentElement.setAttribute('lang', l === 'fr' ? 'fr' : 'en')
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark')
    document.documentElement.setAttribute('lang', 'fr')
  }
})()
