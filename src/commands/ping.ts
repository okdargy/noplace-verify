import { Declare, Command, type CommandContext } from 'seyfert';

@Declare({
  name: 'ping',
  description: 'Show the ping with discord'
})
export default class PingCommand extends Command {
  async run(ctx: CommandContext) {
    await ctx.write({
      content: `hi!!`
    });
  }
}