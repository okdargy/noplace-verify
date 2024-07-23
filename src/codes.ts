export default class codesHelper {
  codes: {
    discordId: string
    profileId: string
    code: string
    expires: number
  }[] = []

  constructor() {
    console.log('[codesHelper] Initializing')

    setInterval(() => {
      this.codes = this.codes.filter((c) => c.expires > Date.now())
    }, 60 * 1000)
  }

  checkActiveCode(discordId: string): boolean {
    return this.codes.some((c) => c.discordId === discordId && c.expires > Date.now())
  }

  generateCode(discordId: string, profileId: string): string {
    this.codes = this.codes.filter((c) => c.discordId !== discordId)

    // 6 character code, all lowercase
    const code = Math.random().toString(36).substring(2, 8)

    this.codes.push({
      discordId,
      profileId,
      code,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    })

    return code
  }

  findCode(discordId: string): { discordId: string; profileId: string; code: string; expires: number } | null {
    console.log(this.codes)
    const code = this.codes.find((c) => c.discordId === discordId && c.expires > Date.now())

    if (!code) {
      return null
    }

    if (code.expires < Date.now()) {
      this.codes = this.codes.filter((c) => c.expires > Date.now())
      return null
    }

    return code
  }

  removeCode(discordId: string): void {
    this.codes = this.codes.filter((c) => c.discordId !== discordId)
  }
}
