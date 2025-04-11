const { createCursor } = require('ghost-cursor')
const { checkTurnstile } = require('./turnstile.js')
const kill = require('tree-kill')

async function pageController ({ browser, page, proxy, turnstile, xvfbsession, pid, plugins, killProcess = false, chrome }) {
  let solveStatus = turnstile

  page.on('close', () => {
    solveStatus = false
  })

  browser.on('disconnected', async () => {
    solveStatus = false
    if (killProcess === true) {
      if (xvfbsession) try { xvfbsession.stopSync() } catch (err) { }
      if (chrome) try { chrome.kill() } catch (err) { console.log(err) }
      if (pid) try { kill(pid, 'SIGKILL', () => { }) } catch (err) { }
    }
  })

  async function turnstileSolver () {
    while (solveStatus) { // eslint-disable-line
      await checkTurnstile({ page }).catch(() => { })
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  turnstileSolver()

  if (proxy.username && proxy.password) await page.authenticate({ username: proxy.username, password: proxy.password })

  if (plugins.length > 0) {
    for (const plugin of plugins) {
      plugin.onPageCreated(page)
    }
  }

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(MouseEvent.prototype, 'screenX', { // eslint-disable-line
      get: function () {
        return this.clientX + window.screenX
      }
    })

    Object.defineProperty(MouseEvent.prototype, 'screenY', { // eslint-disable-line
      get: function () {
        return this.clientY + window.screenY
      }
    })
  })

  const cursor = createCursor(page)
  page.realCursor = cursor
  page.realClick = cursor.click

  return page
}

module.exports = { pageController }
