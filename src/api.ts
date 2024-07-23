import dotenv from 'dotenv'
dotenv.config()

export default class noplaceApiHelper {
  token: string
  last_refreshed: number

  constructor() {
    console.log('[noplaceApiHelper] Initializing')
    this.token = ''
    this.last_refreshed = 0

    this.refreshToken()

    setInterval(() => {
      this.refreshToken()
    }, 3600000)
  }

  async refreshToken() {
    console.log('[noplaceApiHelper] Refreshing token')
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${process.env.NOPLACE_APP_KEY}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-client-version': 'iOS/FirebaseSDK/10.19.1/FirebaseCore-iOS',
        'x-firebase-appcheck': 'eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==',
        'x-ios-bundle-identifier': 'xyz.islands.nospace.official',
        'x-firebase-gmpid': '1:903472045745:ios:dbd60de322ea1ec389cc90',
        'user-agent': 'FirebaseAuth.iOS/10.19.1 xyz.islands.nospace.official/2.0.0 iPhone/18.0 hw/iPhone13_3'
      },
      body: JSON.stringify({
        grantType: 'refresh_token',
        refreshToken: process.env.NOPLACE_REFRESH_TOKEN
      })
    })

    const data = await res.json()
    //console.log(res.status, data)
    this.token = data.id_token
  }
}
