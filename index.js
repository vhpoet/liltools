const koa = require('koa')
const router = require('koa-router')
const serve = require('koa-static')
const mount = require('koa-mount')
const Xray = require('x-ray')
const x = Xray()

const igApp = koa()
const igRouter = router()

const getUser = (username) => {
  return new Promise((resolve, reject) => {
    x('http://instagram.com/' + username, {
      scripts: ['script']
    })((err, content) => {
      try {
        content.scripts.forEach((script) => {
          if (script.indexOf('window._sharedData') > -1) {
            script = script.replace('window._sharedData =', '')
            script = script.slice(0, -1)

            resolve(JSON.parse(script).entry_data.ProfilePage[0].user)
          }
        })
      } catch (e) {
        reject()
      }
    })
  })
}

igRouter.get('/get', function *() {
  const user = yield getUser(this.query.username)

  this.body = '<div>ID: ' + user.id + '</div><br /><div><a href="/instagram/json/' + this.query.username + '" target="_parent">JSON</a></div>'
})

igRouter.get('/json/:username', function *(next) {
  const user = yield getUser(this.params.username)

  this.body = {
    id: user.id,
    username: user.username,
    follows: user.follows.count,
    followed_by: user.followed_by.count,
    profile_pic_url: user.profile_pic_url,
    profile_pic_url_hd: user.profile_pic_url_hd,
    biography: user.biography,
    full_name: user.full_name,
    media_count: user.media.count,
    external_url: user.external_url,
    is_private: user.is_private
  }
})

igApp
  .use(serve('html/instagram'))
  .use(igRouter.routes())
  .use(igRouter.allowedMethods())

const app = koa()
app
  .use(serve('html'))
  .use(mount('/instagram', igApp))

app.listen(3120)