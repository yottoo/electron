'use strict'

const assert = require('assert')
const path = require('path')

const { remote } = require('electron')
const { ipcMain, BrowserWindow } = remote
const {closeWindow} = require('./window-helpers')

describe('BrowserWindow with affinity module', () => {
  const fixtures = path.resolve(__dirname, 'fixtures')
  const myAffinityName = 'myAffinity'
  const myAffinityNameUpper = 'MYAFFINITY'
  const anotherAffinityName = 'anotherAffinity'

  function createWindowWithWebPrefs (webPrefs) {
    return new Promise((resolve, reject) => {
      const w = new BrowserWindow({
        show: false,
        width: 400,
        height: 400,
        webPreferences: webPrefs || {}
      })
      w.webContents.on('did-finish-load', () => {
        resolve(w)
      })
      w.loadURL('file://' + path.join(fixtures, 'api', 'blank.html'))
    })
  }

  describe(`BrowserWindow with an affinity '${myAffinityName}'`, () => {
    let mAffinityWindow
    before((done) => {
      createWindowWithWebPrefs({ affinity: myAffinityName })
      .then((w) => {
        mAffinityWindow = w
        done()
      })
    })

    after((done) => {
      closeWindow(mAffinityWindow, {assertSingleWindow: false}).then(() => {
        mAffinityWindow = null
        done()
      })
    })

    it('should have a different process id than a default window', (done) => {
      createWindowWithWebPrefs({})
      .then((w) => {
        assert.notEqual(mAffinityWindow.webContents.getOSProcessId(), w.webContents.getOSProcessId(), 'Should have the different OS process Id/s')
        closeWindow(w, {assertSingleWindow: false}).then(() => {
          done()
        })
      })
    })

    it(`should have a different process id than a window with a different affinity '${anotherAffinityName}'`, (done) => {
      createWindowWithWebPrefs({ affinity: anotherAffinityName })
      .then((w) => {
        assert.notEqual(mAffinityWindow.webContents.getOSProcessId(), w.webContents.getOSProcessId(), 'Should have the different OS process Id/s')
        closeWindow(w, {assertSingleWindow: false}).then(() => {
          done()
        })
      })
    })

    it(`should have the same OS process id than a window with the same affinity '${myAffinityName}'`, (done) => {
      createWindowWithWebPrefs({ affinity: myAffinityName })
      .then((w) => {
        assert.equal(mAffinityWindow.webContents.getOSProcessId(), w.webContents.getOSProcessId(), 'Should have the same OS process Id')
        closeWindow(w, {assertSingleWindow: false}).then(() => {
          done()
        })
      })
    })

    it(`should have the same OS process id than a window with an equivalent affinity '${myAffinityNameUpper}' (case insensitive)`, (done) => {
      createWindowWithWebPrefs({ affinity: myAffinityNameUpper })
      .then((w) => {
        assert.equal(mAffinityWindow.webContents.getOSProcessId(), w.webContents.getOSProcessId(), 'Should have the same OS process Id')
        closeWindow(w, {assertSingleWindow: false}).then(() => {
          done()
        })
      })
    })
  })

  describe(`BrowserWindow with an affinity : nodeIntegration=false`, () => {
    const preload = path.join(fixtures, 'module', 'send-later.js')
    const affinityWithNodeTrue = 'affinityWithNodeTrue'
    const affinityWithNodeFalse = 'affinityWithNodeFalse'

    function testNodeIntegration (present) {
      return new Promise((resolve, reject) => {
        ipcMain.once('answer', (event, typeofProcess, typeofBuffer) => {
          if (present) {
            assert.notEqual(typeofProcess, 'undefined')
            assert.notEqual(typeofBuffer, 'undefined')
          } else {
            assert.equal(typeofProcess, 'undefined')
            assert.equal(typeofBuffer, 'undefined')
          }
          resolve()
        })
      })
    }

    it('disables node integration when specified to false', (done) => {
      Promise.all([testNodeIntegration(false), createWindowWithWebPrefs({ affinity: affinityWithNodeTrue, preload: preload, nodeIntegration: false })])
      .then((args) => {
        closeWindow(args[1], {assertSingleWindow: false}).then(() => {
          done()
        })
      })
    })
    it('disables node integration when first window is false', (done) => {
      Promise.all([testNodeIntegration(false), createWindowWithWebPrefs({ affinity: affinityWithNodeTrue, preload: preload, nodeIntegration: false })])
      .then((args) => {
        let w1 = args[1]
        return Promise.all([testNodeIntegration(false), w1, createWindowWithWebPrefs({ affinity: affinityWithNodeTrue, preload: preload, nodeIntegration: true })])
      })
      .then((ws) => {
        return Promise.all([closeWindow(ws[1], {assertSingleWindow: false}), closeWindow(ws[2], {assertSingleWindow: false})])
      })
      .then(() => {
        done()
      })
    })

    it('enables node integration when specified to true', (done) => {
      Promise.all([testNodeIntegration(true), createWindowWithWebPrefs({ affinity: affinityWithNodeFalse, preload: preload, nodeIntegration: true })])
      .then((args) => {
        closeWindow(args[1], {assertSingleWindow: false}).then(() => {
          done()
        })
      })
    })
    it('enables node integration when first window is true', (done) => {
      Promise.all([testNodeIntegration(true), createWindowWithWebPrefs({ affinity: affinityWithNodeFalse, preload: preload, nodeIntegration: true })])
      .then((args) => {
        let w1 = args[1]
        return Promise.all([testNodeIntegration(true), w1, createWindowWithWebPrefs({ affinity: affinityWithNodeFalse, preload: preload, nodeIntegration: false })])
      })
      .then((ws) => {
        return Promise.all([closeWindow(ws[1], {assertSingleWindow: false}), closeWindow(ws[2], {assertSingleWindow: false})])
      })
      .then(() => {
        done()
      })
    })
  })
})
