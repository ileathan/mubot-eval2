'use strict'

/* global beforeEach, afterEach, describe, it */
/* eslint-disable no-unused-expressions */

const path = require('path')

const chai = require('chai')
const Hubot = require('hubot')

const expect = chai.expect
const Robot = Hubot.Robot
const TextMessage = Hubot.TextMessage

chai.use(require('sinon-chai'))

describe('require("mubot-eval")', () => {
  it('exports a function', () => {
    expect(require('../index')).to.be.a('Function')
  })
})

describe('rules', () => {
  let robot, user

  beforeEach(() => {
    robot = new Robot(null, 'mock-adapter-v3', false, 'hubot')
    robot.loadFile(path.resolve('src/'), 'mubot-eval.js')
    robot.adapter.on('connected', () => robot.brain.userForId('1', {
      name: 'john',
      real_name: 'John Doe',
      room: '#test'
    }))
    robot.run()
    user = robot.brain.userForName('john')
  })

  afterEach(() => {
    robot.shutdown()
  })

  it('responds to test', (done) => {
    robot.adapter.on('send', function (envelope, strings) {
      const lines = strings[0].split('\n')

      expect(lines.length).to.eql(1)
      expect(lines[0]).to.match(/Working./i)

      done()
    })

    return robot.adapter.receive(new TextMessage(user, 'test'))
  })
})
